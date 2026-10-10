import logging
import secrets
from hashlib import sha256
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services import record_event
from apps.common.email import send_institutional_email
from .models import Exam, ExamVersion, Question, QuestionOption, ExamQuestion, ExamAttempt, ExamAnswer, ExamEligibility, ExamCandidateSession, ExamResult, ExamAuditLog


def audit(event, *, user=None, exam=None, attempt=None, request=None, metadata=None):
    entry = ExamAuditLog.objects.create(event=event, actor=user, exam=exam or (attempt.exam if attempt else None), attempt=attempt, metadata=metadata or {})
    record_event(action=f"examination.{event.lower()}", target_type="exam_attempt" if attempt else "exam", target_id=attempt.pk if attempt else exam.pk if exam else None, actor=user, request=request, metadata=metadata)
    return entry


def notify(user, event, title):
    """Reuse the platform's institutional delivery, never put scores in email."""
    if not settings.EXAM_EMAIL_NOTIFICATIONS:
        return
    def deliver():
        send_institutional_email(subject="IoD-Gh examination update", recipient=user.email, recipient_name=user.full_name or "Candidate", heading="Examination update", introduction=f"{title}: {event.replace('_', ' ').lower()}.", closing="Sign in securely to the Examination Portal for details.", action_label="Open Examination Portal", action_url=settings.EXAM_PORTAL_URL)
    transaction.on_commit(deliver, robust=True)


def notify_submission_result(user, result):
    """Deliver the percentage after submission without relying on browser state."""
    if not settings.EXAM_EMAIL_NOTIFICATIONS or not user.email:
        return

    title = result.attempt.exam_version.configuration["title"]

    def deliver():
        send_institutional_email(
            subject="IoD-Gh examination submitted",
            recipient=user.email,
            recipient_name=user.full_name or "Candidate",
            heading="Examination submitted successfully",
            introduction=f"Your submission for {title} has been recorded.",
            details=[("Percentage", f"{result.percentage}%")],
            closing="Your percentage was calculated from the answers submitted before the examination closed.",
            action_label="Open Examination Portal",
            action_url=settings.EXAM_PORTAL_URL,
            idempotency_key=f"exam-submission-result-{result.pk}",
        )

    transaction.on_commit(deliver, robust=True)


def normalize_candidate_name(value):
    return " ".join(value.split()).casefold()


def normalize_candidate_code(value):
    return "".join(character for character in value.upper() if character.isalnum())


def candidate_code_hash(value):
    return salted_hmac("exam-candidate-code", normalize_candidate_code(value), algorithm="sha256").hexdigest()


def candidate_token_hash(value):
    return sha256(value.encode("utf-8")).hexdigest()


def generate_candidate_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "IOD-" + "-".join("".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3))


def issue_candidate_code(eligibility):
    """Return a new shareable code once; only its HMAC is persisted."""
    for _ in range(20):
        code = generate_candidate_code()
        digest = candidate_code_hash(code)
        if not ExamEligibility.objects.filter(candidate_code_hash=digest).exclude(pk=eligibility.pk).exists():
            eligibility.candidate_code_hash = digest
            eligibility.candidate_code_issued_at = timezone.now()
            eligibility.save(update_fields=["candidate_code_hash", "candidate_code_issued_at"])
            return code
    raise RuntimeError("Could not issue a unique examination access code.")


def candidate_access(full_name, access_code):
    """Resolve a candidate code without revealing whether a name or code failed."""
    normalized_name = normalize_candidate_name(full_name)
    normalized_code = normalize_candidate_code(access_code)
    if not normalized_name or not normalized_code:
        return None
    eligibility = ExamEligibility.objects.select_related("student", "exam", "exam__current_version").filter(
        candidate_code_hash=candidate_code_hash(normalized_code),
        is_active=True,
        student__is_active=True,
    ).first()
    if not eligibility or not eligibility.exam.current_version_id or not constant_time_compare(normalize_candidate_name(eligibility.student.full_name), normalized_name):
        return None
    return eligibility


def candidate_session_expiry(eligibility):
    end = parse_datetime(eligibility.exam.current_version.configuration["ends_at"])
    return end + timedelta(days=settings.EXAM_CANDIDATE_SESSION_GRACE_DAYS)


def open_candidate_session(eligibility):
    """Create a persistent, exam-scoped session and return its raw browser token."""
    expires_at = candidate_session_expiry(eligibility)
    if expires_at <= timezone.now():
        return None, None
    token = secrets.token_urlsafe(32)
    session = ExamCandidateSession.objects.create(
        eligibility=eligibility,
        token_hash=candidate_token_hash(token),
        expires_at=expires_at,
    )
    return token, session


@transaction.atomic
def save_question(data, user, request, previous=None, audit_event="QUESTION_VERSION_CREATED"):
    options = data.pop("options")
    if previous:
        # Lock the first revision of the lineage, so editing different revisions
        # concurrently cannot allocate the same next version number.
        Question.objects.select_for_update().get(lineage=previous.lineage, version=1)
        version = Question.objects.filter(lineage=previous.lineage).order_by("-version").first().version + 1
        data.update(lineage=previous.lineage, version=version)
    question = Question.objects.create(**data, created_by=user)
    QuestionOption.objects.bulk_create([QuestionOption(question=question, position=i, **option) for i, option in enumerate(options)])
    audit(audit_event, user=user, request=request, metadata={"question": str(question.id), "version": question.version})
    return question


@transaction.atomic
def retire_question(previous, user, request):
    """Hide a question from future exam versions without breaking history."""
    Question.objects.select_for_update().get(lineage=previous.lineage, version=1)
    current = Question.objects.filter(lineage=previous.lineage).order_by("-version").prefetch_related("options").first()
    if not current.is_active:
        return current
    data = {
        "text": current.text,
        "question_type": current.question_type,
        "marks": current.marks,
        "explanation": current.explanation,
        "category": current.category,
        "difficulty": current.difficulty,
        "is_active": False,
        "options": [{"text": option.text, "is_correct": option.is_correct} for option in current.options.all()],
    }
    return save_question(data, user, request, previous=current, audit_event="QUESTION_RETIRED")


def question_snapshot(question):
    return {"text": question.text, "question_type": question.question_type, "marks": str(question.marks), "options": [{"id": str(option.id), "text": option.text, "is_correct": option.is_correct} for option in question.options.all()]}


@transaction.atomic
def save_exam(data, user, request, exam_id=None):
    # Question order is always randomized server-side for every candidate.
    # Keep the field in version metadata so the policy is visible in audits.
    data["randomize_questions"] = True
    questions = {q.id: q for q in Question.objects.filter(id__in=data["question_ids"], is_active=True).prefetch_related("options")}
    if len(questions) != len(data["question_ids"]):
        raise ValidationError("All selected questions must exist and be active.")
    snapshots = [question_snapshot(questions[pk]) for pk in data["question_ids"]]
    if any(len(s["options"]) < 2 or sum(o["is_correct"] for o in s["options"]) != 1 for s in snapshots):
        raise ValidationError("Every selected question needs valid options and one correct answer.")
    exam = Exam.objects.select_for_update().get(pk=exam_id) if exam_id else Exam.objects.create(title=data["title"])
    configuration = {key: (value.isoformat() if hasattr(value, "isoformat") else str(value) if isinstance(value, Decimal) else value) for key, value in data.items() if key not in ["is_active", "question_ids"]}
    version = ExamVersion.objects.create(exam=exam, number=(exam.current_version.number + 1 if exam.current_version_id else 1), configuration=configuration, created_by=user)
    ExamQuestion.objects.bulk_create([ExamQuestion(version=version, question=questions[pk], position=i, snapshot=snapshots[i]) for i, pk in enumerate(data["question_ids"])])
    exam.title, exam.is_active, exam.current_version = data["title"], data["is_active"], version
    exam.save(update_fields=["title", "is_active", "current_version"])
    audit("EXAM_VERSION_CREATED", user=user, exam=exam, request=request, metadata={"version": version.number})
    return exam


def available(exam, user, now=None):
    now = now or timezone.now()
    if not exam.is_active or not exam.current_version_id:
        return False
    config = exam.current_version.configuration
    return (parse_datetime(config["starts_at"]) <= now < parse_datetime(config["ends_at"])
            and ExamEligibility.objects.filter(exam=exam, student=user, is_active=True).exists()
            and ExamAttempt.objects.filter(exam=exam, student=user).count() < config["maximum_attempts"])


@transaction.atomic
def start_attempt(exam_id, user, request):
    User.objects.select_for_update().get(pk=user.pk)
    exam = Exam.objects.select_for_update(of=("self",)).select_related("current_version").filter(pk=exam_id).first()
    if not exam:
        return None
    active = ExamAttempt.objects.select_for_update().filter(exam=exam, student=user, status="IN_PROGRESS").first()
    now = timezone.now()
    if active:
        if active.expires_at > now:
            return active
        finalize(active, "EXPIRED", request=request)
    if not available(exam, user, now):
        return None
    config = exam.current_version.configuration
    questions = list(exam.current_version.questions.all())
    rng = secrets.SystemRandom()
    if config["select_from_bank"]:
        questions = rng.sample(questions, config["question_count"])
    rng.shuffle(questions)
    option_order = {}
    for question in questions:
        options = [option["id"] for option in question.snapshot["options"]]
        if config["randomize_options"]:
            rng.shuffle(options)
        option_order[str(question.id)] = options
    attempt = ExamAttempt.objects.create(student=user, exam=exam, exam_version=exam.current_version, attempt_number=ExamAttempt.objects.filter(exam=exam, student=user).count() + 1, started_at=now, expires_at=min(now + timedelta(minutes=config["duration_minutes"]), parse_datetime(config["ends_at"])), question_order=[str(q.id) for q in questions], option_order=option_order)
    audit("EXAM_STARTED", user=user, attempt=attempt, request=request)
    notify(user, "EXAM_STARTED", config["title"])
    return attempt


def release_result(result, *, user=None, request=None, notify_candidate=True):
    if result.released_at:
        return
    result.released_at, result.released_by = timezone.now(), user
    result.save(update_fields=["released_at", "released_by"])
    audit("RESULT_RELEASED", user=user, attempt=result.attempt, request=request)
    audit("EXAM_PASSED" if result.passed else "EXAM_FAILED", attempt=result.attempt)
    if notify_candidate:
        notify(result.attempt.student, "EXAM_RESULT_RELEASED", result.attempt.exam_version.configuration["title"])


def finalize(attempt, status, *, request=None):
    """Caller must hold the attempt row lock in a transaction."""
    if attempt.status != "IN_PROGRESS":
        return
    questions = list(attempt.exam_version.questions.filter(id__in=attempt.question_order))
    answers = {str(answer.question_id): str(answer.selected_option) for answer in attempt.answers.all()}
    total, score = Decimal(0), Decimal(0)
    for question in questions:
        marks = Decimal(question.snapshot["marks"])
        total += marks
        if any(option["is_correct"] and option["id"] == answers.get(str(question.id)) for option in question.snapshot["options"]):
            score += marks
    percentage = (score / total * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    config = attempt.exam_version.configuration
    result = ExamResult.objects.create(attempt=attempt, score=score, total_marks=total, percentage=percentage, grade=next((grade for minimum, grade in [(80, "A"), (70, "B"), (60, "C"), (50, "D")] if percentage >= minimum), "F"), passed=percentage >= Decimal(config["pass_mark"]))
    attempt.status, attempt.submitted_at = status, timezone.now()
    attempt.save(update_fields=["status", "submitted_at"])
    audit("EXAM_AUTO_EXPIRED" if status == "EXPIRED" else "EXAM_SUBMITTED", user=attempt.student, attempt=attempt, request=request)
    if status == "SUBMITTED":
        notify_submission_result(attempt.student, result)
    if config["result_release"] == "IMMEDIATE" or (config["result_release"] == "SCHEDULED" and parse_datetime(config["release_at"]) <= timezone.now()):
        release_result(result, request=request, notify_candidate=status != "SUBMITTED")


def synchronize(attempt, request=None):
    if attempt.status == "IN_PROGRESS" and timezone.now() >= attempt.expires_at:
        finalize(attempt, "EXPIRED", request=request)
    if attempt.status in ["SUBMITTED", "EXPIRED"]:
        result = attempt.result
        config = attempt.exam_version.configuration
        if not result.released_at and config["result_release"] == "SCHEDULED" and parse_datetime(config["release_at"]) <= timezone.now():
            release_result(result, request=request)


def public_attempt(attempt):
    config = attempt.exam_version.configuration
    return {"id": str(attempt.id), "exam_id": str(attempt.exam_id), "title": config["title"], "instructions": config["instructions"], "status": attempt.status, "started_at": attempt.started_at, "expires_at": attempt.expires_at, "server_time": timezone.now(), "question_count": len(attempt.question_order)}


def public_questions(attempt):
    # Explicit allowlist. Neither snapshots nor model serializers leave this layer.
    questions = {str(q.id): q for q in attempt.exam_version.questions.filter(id__in=attempt.question_order)}
    answers = {str(a.question_id): a for a in attempt.answers.all()}
    result = []
    for pk in attempt.question_order:
        question = questions[pk]
        options = {option["id"]: option for option in question.snapshot["options"]}
        answer = answers.get(pk)
        result.append({"id": pk, "text": question.snapshot["text"], "marks": question.snapshot["marks"], "options": [{"id": key, "text": options[key]["text"]} for key in attempt.option_order[pk]], "selected_option": str(answer.selected_option) if answer else None, "answer_revision": answer.revision if answer else 0})
    return result
