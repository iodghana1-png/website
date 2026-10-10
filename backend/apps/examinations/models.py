import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Question(models.Model):
    """Each row is an immutable question revision; edits create a new row."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lineage = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    version = models.PositiveIntegerField(default=1)
    text = models.TextField()
    question_type = models.CharField(max_length=20, default="MULTIPLE_CHOICE")
    marks = models.DecimalField(max_digits=7, decimal_places=2, default=1)
    explanation = models.TextField(blank=True)
    category = models.CharField(max_length=150, blank=True)
    difficulty = models.CharField(max_length=20, default="MEDIUM")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["lineage", "version"], name="exam_question_revision"), models.CheckConstraint(condition=Q(marks__gt=0), name="exam_positive_marks")]


class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="options")
    text = models.TextField()
    position = models.PositiveIntegerField()
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["position"]
        constraints = [models.UniqueConstraint(fields=["question", "position"], name="exam_option_position"), models.UniqueConstraint(fields=["question"], condition=Q(is_correct=True), name="exam_single_correct_option")]


class Exam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    current_version = models.ForeignKey("ExamVersion", null=True, blank=True, on_delete=models.PROTECT, related_name="current_for")
    # One code is shared by the eligible students in this examination cohort.
    # Only its HMAC is stored, so a database export cannot be used to enter an exam.
    cohort_code_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    cohort_code_issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ExamVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, related_name="versions")
    number = models.PositiveIntegerField()
    # Immutable configuration and question snapshots; never serialized wholesale
    # to a student. Existing attempts cannot be changed by editing the bank.
    configuration = models.JSONField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["exam", "number"], name="exam_version_number")]


class ExamQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(ExamVersion, on_delete=models.PROTECT, related_name="questions")
    question = models.ForeignKey(Question, on_delete=models.PROTECT)
    position = models.PositiveIntegerField()
    snapshot = models.JSONField()

    class Meta:
        ordering = ["position"]
        constraints = [models.UniqueConstraint(fields=["version", "question"], name="exam_version_question"), models.UniqueConstraint(fields=["version", "position"], name="exam_version_position")]


class ExamEligibility(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, related_name="eligibilities")
    # Legacy account link retained for historical candidate records. New cohort
    # candidates do not need an IoD-Gh website account.
    student = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    candidate_name = models.CharField(max_length=300, blank=True, default="")
    candidate_name_normalized = models.CharField(max_length=300, blank=True, default="", db_index=True)
    candidate_email = models.EmailField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    # The value shared with a candidate is never stored.  A unique HMAC makes
    # a leaked database export insufficient to use a candidate's code.
    candidate_code_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    candidate_code_issued_at = models.DateTimeField(null=True, blank=True)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="exam_assignments")
    assigned_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["exam", "student"], name="exam_student_eligibility"),
            models.UniqueConstraint(fields=["exam", "candidate_name_normalized"], condition=~Q(candidate_name_normalized=""), name="exam_cohort_candidate_name"),
        ]

    @property
    def full_name(self):
        return self.candidate_name or (self.student.full_name if self.student_id else "")

    @property
    def email(self):
        return self.candidate_email or (self.student.email if self.student_id else "")

    @property
    def is_authenticated(self):
        """Lets the scoped candidate session act as the DRF request user."""
        return True


class ExamCandidateSession(models.Model):
    """An exam-only browser session, intentionally separate from member login."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eligibility = models.ForeignKey(ExamEligibility, on_delete=models.PROTECT, related_name="candidate_sessions")
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["token_hash", "expires_at"], name="exam_candidate_token_expiry")]


class ExamAttempt(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS"
        SUBMITTED = "SUBMITTED"
        EXPIRED = "EXPIRED"
        CANCELLED = "CANCELLED"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Historical attempts remain linked to a website account. Cohort attempts
    # use their eligibility record and immutable candidate name/email snapshot.
    student = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    eligibility = models.ForeignKey(ExamEligibility, null=True, blank=True, on_delete=models.PROTECT, related_name="attempts")
    candidate_name = models.CharField(max_length=300, blank=True, default="")
    candidate_email = models.EmailField(blank=True, default="")
    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, related_name="attempts")
    exam_version = models.ForeignKey(ExamVersion, on_delete=models.PROTECT)
    attempt_number = models.PositiveIntegerField()
    started_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS, db_index=True)
    question_order = models.JSONField()
    option_order = models.JSONField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "exam"], condition=Q(status="IN_PROGRESS"), name="exam_one_active_attempt"),
            models.UniqueConstraint(fields=["student", "exam", "attempt_number"], name="exam_attempt_number"),
            models.UniqueConstraint(fields=["eligibility", "exam"], condition=Q(status="IN_PROGRESS") & Q(eligibility__isnull=False), name="exam_cohort_one_active_attempt"),
            models.UniqueConstraint(fields=["eligibility", "exam", "attempt_number"], condition=Q(eligibility__isnull=False), name="exam_cohort_attempt_number"),
            models.CheckConstraint(condition=Q(attempt_number__gte=1), name="exam_attempt_positive"),
            models.CheckConstraint(condition=Q(expires_at__gt=models.F("started_at")), name="exam_attempt_time_window"),
        ]

    @property
    def full_name(self):
        return self.candidate_name or (self.student.full_name if self.student_id else "")

    @property
    def email(self):
        return self.candidate_email or (self.student.email if self.student_id else "")


class ExamAnswer(models.Model):
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.PROTECT, related_name="answers")
    question = models.ForeignKey(ExamQuestion, on_delete=models.PROTECT)
    selected_option = models.UUIDField()
    revision = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["attempt", "question"], name="exam_answer_once")]


class ExamResult(models.Model):
    attempt = models.OneToOneField(ExamAttempt, on_delete=models.PROTECT, related_name="result")
    score = models.DecimalField(max_digits=12, decimal_places=2)
    total_marks = models.DecimalField(max_digits=12, decimal_places=2)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    grade = models.CharField(max_length=20)
    passed = models.BooleanField()
    released_at = models.DateTimeField(null=True, blank=True, db_index=True)
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(score__gte=0) & Q(score__lte=models.F("total_marks")) & Q(total_marks__gt=0), name="exam_valid_score")]


class ExamAuditLog(models.Model):
    exam = models.ForeignKey(Exam, null=True, on_delete=models.PROTECT)
    attempt = models.ForeignKey(ExamAttempt, null=True, on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT)
    event = models.CharField(max_length=60, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict)
    # Intentionally no answer content, raw IP addresses or device fingerprinting.
