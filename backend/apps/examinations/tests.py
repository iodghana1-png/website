import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from threading import Barrier
from unittest import skipUnless
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import close_old_connections, connection, transaction
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.common.models import RateLimitBucket
from .authentication import CANDIDATE_SESSION_COOKIE
from .models import ExamAttempt, ExamAnswer, ExamEligibility, ExamResult, ExamAuditLog, Question
from .services import issue_candidate_code, open_candidate_session, save_question, save_exam, start_attempt


class ExamFixtures:
    def setUp(self):
        self.student = User.objects.create_user("candidate@example.com", "Secure-test-password-47!", first_name="Test", last_name="Candidate", email_verified_at=timezone.now())
        self.other = User.objects.create_user("other@example.com", "Secure-test-password-47!", first_name="Other", last_name="Candidate", email_verified_at=timezone.now())
        self.staff = User.objects.create_superuser("exam-admin@example.com", "Secure-test-password-47!")
        self.question_data = {"text": "Which body provides governance oversight?", "marks": Decimal("2"), "options": [{"text": "Board", "is_correct": True}, {"text": "Visitors", "is_correct": False}]}
        self.question = save_question({**self.question_data}, self.staff, None)
        self.config = {"title": "Professional Examination", "instructions": "Choose one option.", "duration_minutes": 60, "starts_at": timezone.now() - timedelta(hours=1), "ends_at": timezone.now() + timedelta(hours=4), "pass_mark": Decimal("60"), "maximum_attempts": 1, "question_count": 1, "randomize_questions": True, "randomize_options": True, "select_from_bank": False, "result_release": "IMMEDIATE", "release_at": None, "is_active": True, "question_ids": [self.question.id]}
        self.exam = save_exam(self.config, self.staff, None)
        ExamEligibility.objects.create(exam=self.exam, student=self.student, assigned_by=self.staff)
        self.client = self.client_for(self.student)

    def client_for(self, user):
        client = Client(enforce_csrf_checks=True)
        if user and (user.is_staff or user.is_superuser):
            client.force_login(user)
        elif user:
            # Candidate endpoints intentionally reject member/CMS sessions.
            # This helper installs an exam-only cookie, including an inactive
            # assignment where a test needs an authenticated-but-ineligible
            # candidate.
            eligibility = ExamEligibility.objects.filter(exam=self.exam, student=user).first()
            if not eligibility:
                eligibility = ExamEligibility.objects.create(exam=self.exam, student=user, assigned_by=self.staff, is_active=False)
            token, _ = open_candidate_session(eligibility)
            client.cookies[CANDIDATE_SESSION_COOKIE] = token
        token = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
        client.defaults["HTTP_X_CSRFTOKEN"] = token
        return client

    def post(self, path, data=None, client=None):
        return (client or self.client).post("/api/v1/" + path, json.dumps(data or {}, default=str), content_type="application/json")

    def delete(self, path, client=None):
        return (client or self.client).delete("/api/v1/" + path)

    def start(self):
        response = self.post(f"exams/{self.exam.pk}/start/")
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["id"]

    def questions(self, attempt):
        return self.client.get(f"/api/v1/exam-attempts/{attempt}/questions/")

    def save(self, attempt, correct=True, revision=0):
        item = self.questions(attempt).json()["questions"][0]
        option = self.question.options.get(is_correct=correct)
        return self.post(f"exam-attempts/{attempt}/answers/", {"question_id": item["id"], "option_id": str(option.id), "base_revision": revision})


class ExaminationSecurityTests(ExamFixtures, TestCase):
    def test_authentication_and_csrf_are_required(self):
        self.assertEqual(Client().get("/api/v1/exams/available/").status_code, 403)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.student)
        self.assertEqual(self.post(f"exams/{self.exam.pk}/start/", client=client).status_code, 403)

    def test_existing_account_login_supports_identifier_and_password(self):
        client = self.client_for(None)
        self.assertEqual(self.post("auth/login/", {"identifier": self.student.email, "password": "Secure-test-password-47!"}, client).status_code, 200)
        client = self.client_for(None)
        self.assertEqual(self.post("auth/login/", {"identifier": self.student.email, "password": "wrong"}, client).status_code, 403)

    def test_membership_number_uses_existing_account_identity(self):
        from apps.membership.models import MemberProfile, MembershipType
        membership_type = MembershipType.objects.create(name="Exam test member", slug="exam-test-member")
        MemberProfile.objects.create(user=self.student, membership_type=membership_type, membership_number="IOD-TEST-123", first_name="Test", last_name="Candidate", email=self.student.email, joined_date=timezone.now().date(), membership_start_date=timezone.now().date())
        response = self.post("auth/login/", {"identifier": "IOD-TEST-123", "password": "Secure-test-password-47!"}, self.client_for(None))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], str(self.student.pk))

    def test_account_throttling_blocks_distributed_login_attempts(self):
        for index in range(21):
            client = self.client_for(None)
            client.defaults["REMOTE_ADDR"] = f"192.0.2.{index + 1}"
            response = self.post("auth/login/", {"identifier": self.student.email, "password": "wrong"}, client)
            self.assertEqual(response.status_code, 403 if index < 20 else 429)

    def test_admin_assigned_candidate_does_not_need_a_member_password_or_verified_login(self):
        self.student.email_verified_at = None
        self.student.save()
        self.assertEqual(self.post(f"exams/{self.exam.pk}/start/").status_code, 200)

    def test_candidate_access_requires_matching_name_and_code_then_restores_attempts(self):
        grant = ExamEligibility.objects.get(exam=self.exam, student=self.student)
        code = issue_candidate_code(grant)
        client = Client(enforce_csrf_checks=True)
        csrf = client.get("/api/v1/auth/csrf/").json()["csrfToken"]
        client.defaults["HTTP_X_CSRFTOKEN"] = csrf
        wrong = self.post("exams/candidate/access/", {"full_name": "Test Candidate", "access_code": "WRONG-CODE"}, client)
        self.assertEqual(wrong.status_code, 403)
        response = self.post("exams/candidate/access/", {"full_name": "  test   candidate ", "access_code": code.lower()}, client)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn(CANDIDATE_SESSION_COOKIE, response.cookies)
        attempt = self.post(f"exams/{self.exam.pk}/start/", client=client).json()["id"]
        returning = Client(enforce_csrf_checks=True)
        csrf = returning.get("/api/v1/auth/csrf/").json()["csrfToken"]
        returning.defaults["HTTP_X_CSRFTOKEN"] = csrf
        self.assertEqual(self.post("exams/candidate/access/", {"full_name": "Test Candidate", "access_code": code}, returning).status_code, 200)
        available = returning.get("/api/v1/exams/available/").json()
        self.assertEqual([item["id"] for item in available["attempts"]], [attempt])

    def test_candidate_code_cannot_access_a_different_exam(self):
        second = save_exam({**self.config, "title": "Second examination"}, self.staff, None)
        self.assertEqual(self.post(f"exams/{second.pk}/start/").status_code, 404)

    def test_eligible_student_can_start_and_resume_only_one_attempt(self):
        first = self.start()
        self.assertEqual(self.start(), first)
        self.assertEqual(ExamAttempt.objects.count(), 1)
        self.assertEqual(ExamAuditLog.objects.filter(event="EXAM_STARTED").count(), 1)

    def test_ineligible_student_cannot_see_or_start_exam(self):
        other = self.client_for(self.other)
        self.assertEqual(other.get("/api/v1/exams/available/").json()["exams"], [])
        self.assertEqual(self.post(f"exams/{self.exam.pk}/start/", client=other).status_code, 403)

    def test_inactive_future_and_expired_exams_cannot_start(self):
        self.exam.is_active = False
        self.exam.save()
        self.assertEqual(self.post(f"exams/{self.exam.pk}/start/").status_code, 403)
        for changes in [{"starts_at": timezone.now() + timedelta(hours=1)}, {"ends_at": timezone.now() - timedelta(minutes=1)}]:
            self.exam = save_exam({**self.config, **changes}, self.staff, None, self.exam.pk)
            self.assertEqual(self.post(f"exams/{self.exam.pk}/start/").status_code, 403)

    def test_maximum_attempts_is_server_enforced(self):
        attempt = self.start()
        self.post(f"exam-attempts/{attempt}/submit/")
        self.assertEqual(self.post(f"exams/{self.exam.pk}/start/", {"maximum_attempts": 100}).status_code, 403)

    def test_answer_keys_never_leave_student_endpoints(self):
        attempt = self.start()
        for response in [self.questions(attempt), self.client.get(f"/api/v1/exam-attempts/{attempt}/"), self.client.get("/api/v1/exams/available/")]:
            for key in ["is_correct", "correct_answer", "snapshot", "explanation", "pass_mark"]:
                self.assertNotIn(f'"{key}"', response.content.decode())
            self.assertIn("no-store", response["Cache-Control"])
        self.assertEqual(self.client.get("/api/v1/exams/staff/questions/").status_code, 403)

    def test_question_and_option_order_survive_refresh(self):
        attempt = self.start()
        self.assertEqual(self.questions(attempt).json()["questions"], self.questions(attempt).json()["questions"])

    def test_question_order_is_mandatory_even_when_a_legacy_configuration_says_otherwise(self):
        self.exam.current_version.configuration["randomize_questions"] = False
        self.exam.current_version.save(update_fields=["configuration"])
        with patch("apps.examinations.services.secrets.SystemRandom") as random:
            self.start()
        self.assertTrue(random.return_value.shuffle.called)

    def test_new_exam_versions_record_mandatory_question_randomization(self):
        self.exam = save_exam({**self.config, "randomize_questions": False}, self.staff, None, self.exam.pk)
        self.assertTrue(self.exam.current_version.configuration["randomize_questions"])

    def test_answer_save_update_and_stale_write_protection(self):
        attempt = self.start()
        self.assertEqual(self.save(attempt).status_code, 200)
        self.assertEqual(self.save(attempt).status_code, 200, "Same-answer retries are idempotent")
        self.assertEqual(self.save(attempt, False).status_code, 409)
        self.assertEqual(self.save(attempt, False, 1).status_code, 200)
        self.assertEqual(ExamAnswer.objects.count(), 1)
        self.assertEqual(ExamAnswer.objects.get().revision, 2)

    def test_idor_is_rejected_for_every_attempt_endpoint(self):
        attempt = self.start()
        other = self.client_for(self.other)
        for path in ["", "questions/", "result/"]:
            self.assertEqual(other.get(f"/api/v1/exam-attempts/{attempt}/{path}").status_code, 404)
        for path in ["answers/", "submit/", "viewed/"]:
            self.assertEqual(self.post(f"exam-attempts/{attempt}/{path}", client=other).status_code, 404)

    def test_invalid_question_and_option_are_rejected(self):
        attempt = self.start()
        item = self.questions(attempt).json()["questions"][0]
        for question, option in [(self.question.id, self.question.options.first().id), (item["id"], self.question.id)]:
            self.assertEqual(self.post(f"exam-attempts/{attempt}/answers/", {"question_id": str(question), "option_id": str(option), "base_revision": 0}).status_code, 400)

    def test_expired_attempt_rejects_answer_and_submission_but_grades_saved_work(self):
        attempt = self.start()
        self.save(attempt)
        ExamAttempt.objects.filter(pk=attempt).update(started_at=timezone.now() - timedelta(hours=2), expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.post(f"exam-attempts/{attempt}/answers/", {}).status_code, 409)
        self.assertEqual(self.post(f"exam-attempts/{attempt}/submit/", {"expires_at": "2999-01-01"}).status_code, 409)
        self.assertEqual(ExamResult.objects.get().score, Decimal("2"))
        self.assertEqual(ExamAttempt.objects.get().status, "EXPIRED")

    def test_duplicate_submissions_never_regrade_or_change_answers(self):
        attempt = self.start()
        self.save(attempt)
        for _ in range(2):
            self.assertEqual(self.post(f"exam-attempts/{attempt}/submit/", {"score": 0}).status_code, 200)
        self.assertEqual(ExamResult.objects.count(), 1)
        self.assertEqual(ExamAuditLog.objects.filter(event="EXAM_SUBMITTED").count(), 1)
        self.assertEqual(self.post(f"exam-attempts/{attempt}/answers/", {}).status_code, 409)
        self.assertEqual(self.questions(attempt).status_code, 409)
        result = self.client.get(f"/api/v1/exam-attempts/{attempt}/result/").json()
        self.assertEqual((result["percentage"], result["grade"], result["passed"]), ("100.00", "A", True))

    @override_settings(EXAM_EMAIL_NOTIFICATIONS=True)
    def test_submitted_exam_sends_the_candidate_percentage_by_email(self):
        attempt = self.start()
        self.save(attempt)
        with patch("apps.examinations.services.send_institutional_email") as send, self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.post(f"exam-attempts/{attempt}/submit/").status_code, 200)
        self.assertEqual(send.call_count, 1)
        self.assertEqual(send.call_args.kwargs["details"], [("Percentage", "100.00%")])

    def test_incorrect_answers_fail_and_frontend_scores_are_ignored(self):
        attempt = self.start()
        self.save(attempt, False)
        self.post(f"exam-attempts/{attempt}/submit/", {"score": 100, "passed": True})
        result = ExamResult.objects.get()
        self.assertEqual((result.score, result.grade, result.passed), (0, "F", False))

    def test_question_and_exam_edits_do_not_change_existing_attempt(self):
        attempt = self.start()
        before = self.questions(attempt).json()["questions"]
        new_question = save_question({**self.question_data, "text": "New version", "marks": Decimal("50")}, self.staff, None, self.question)
        save_exam({**self.config, "question_ids": [new_question.pk], "pass_mark": Decimal("100")}, self.staff, None, self.exam.pk)
        self.assertEqual(self.questions(attempt).json()["questions"], before)
        self.save(attempt)
        self.post(f"exam-attempts/{attempt}/submit/")
        self.assertEqual(ExamResult.objects.get().total_marks, Decimal("2"))
        self.assertEqual(Question.objects.count(), 2)

    def test_authorized_question_removal_retires_the_bank_entry_and_preserves_history(self):
        attempt = self.start()
        before = self.questions(attempt).json()["questions"]
        staff = self.client_for(self.staff)
        self.assertEqual(self.client.delete(f"/api/v1/exams/staff/questions/{self.question.pk}/").status_code, 403)
        response = self.delete(f"exams/staff/questions/{self.question.pk}/", staff)
        self.assertEqual(response.status_code, 200)
        retired = Question.objects.get(pk=response.json()["id"])
        self.assertFalse(retired.is_active)
        self.assertEqual(retired.version, 2)
        self.assertEqual(Question.objects.count(), 2)
        self.assertEqual(staff.get("/api/v1/exams/staff/questions/").json()["results"], [])
        self.assertEqual(self.questions(attempt).json()["questions"], before)
        self.assertTrue(ExamAuditLog.objects.filter(event="QUESTION_RETIRED", actor=self.staff).exists())
        self.assertEqual(self.delete(f"exams/staff/questions/{self.question.pk}/", staff).status_code, 200)
        self.assertEqual(Question.objects.count(), 2)

    def test_manual_results_are_private_until_authorized_release(self):
        save_exam({**self.config, "result_release": "MANUAL_REVIEW"}, self.staff, None, self.exam.pk)
        attempt = self.start()
        self.post(f"exam-attempts/{attempt}/submit/")
        result = self.client.get(f"/api/v1/exam-attempts/{attempt}/result/").json()
        self.assertFalse(result["released"])
        self.assertNotIn("score", result)
        self.assertEqual(self.post(f"exams/staff/attempts/{attempt}/release/").status_code, 403)
        staff = self.client_for(self.staff)
        for _ in range(2):
            self.assertEqual(self.post(f"exams/staff/attempts/{attempt}/release/", client=staff).status_code, 200)
        self.assertTrue(self.client.get(f"/api/v1/exam-attempts/{attempt}/result/").json()["released"])
        self.assertEqual(ExamAuditLog.objects.filter(event="RESULT_RELEASED").count(), 1)

    def test_scheduled_results_and_unattended_expiry(self):
        save_exam({**self.config, "result_release": "SCHEDULED", "release_at": timezone.now() + timedelta(days=1)}, self.staff, None, self.exam.pk)
        attempt = self.start()
        ExamAttempt.objects.filter(pk=attempt).update(started_at=timezone.now() - timedelta(hours=2), expires_at=timezone.now() - timedelta(seconds=1))
        call_command("process_examinations", verbosity=0)
        self.assertEqual(ExamAttempt.objects.get().status, "EXPIRED")
        self.assertIsNone(ExamResult.objects.get().released_at)
        with patch("apps.examinations.services.timezone.now", return_value=timezone.now() + timedelta(days=2)):
            call_command("process_examinations", verbosity=0)
            call_command("process_examinations", verbosity=0)
        self.assertIsNotNone(ExamResult.objects.get().released_at)
        self.assertEqual(ExamAuditLog.objects.filter(event="RESULT_RELEASED").count(), 1)

    def test_admin_role_is_not_inferred_from_staff_flag(self):
        self.other.is_staff = True
        self.other.save()
        staff = self.client_for(self.other)
        self.assertEqual(staff.get("/api/v1/exams/staff/questions/").status_code, 403)
        group, _ = Group.objects.get_or_create(name="Training Officer")
        self.other.groups.add(group)
        self.assertEqual(staff.get("/api/v1/exams/staff/questions/").status_code, 200)

    def test_per_user_start_rate_limit(self):
        for _ in range(10):
            self.assertEqual(self.post(f"exams/{self.exam.pk}/start/").status_code, 200)
        self.assertEqual(self.post(f"exams/{self.exam.pk}/start/").status_code, 429)

    def test_exam_bank_validation_and_assignment_api(self):
        staff = self.client_for(self.staff)
        invalid = {**self.question_data, "options": [{"text": "A", "is_correct": True}, {"text": "B", "is_correct": True}]}
        self.assertEqual(self.post("exams/staff/questions/", invalid, staff).status_code, 400)
        response = self.post(f"exams/staff/exams/{self.exam.pk}/eligibility/", {"identifier": self.other.email}, staff)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["candidate_code"])
        self.assertTrue(ExamEligibility.objects.filter(student=self.other, is_active=True).exists())

    def test_answers_can_only_be_reviewed_by_an_authorized_exam_manager(self):
        attempt = self.start()
        self.save(attempt)
        self.post(f"exam-attempts/{attempt}/submit/")
        path = f"/api/v1/exams/staff/attempts/{attempt}/"
        self.assertEqual(self.client.get(path).status_code, 403)
        response = self.client_for(self.staff).get(path)
        self.assertEqual(response.status_code, 200)
        self.assertIn("correct_option", response.json()["questions"][0])
        self.assertTrue(ExamAuditLog.objects.filter(event="ATTEMPT_REVIEWED", actor=self.staff).exists())

    def test_staff_filters_reject_invalid_input_without_server_errors(self):
        staff = self.client_for(self.staff)
        for path in ["attempts/?exam=invalid", "attempts/?status=invalid", "results/export/?exam=invalid", "results/export/"]:
            with self.subTest(path=path):
                self.assertEqual(staff.get("/api/v1/exams/staff/" + path).status_code, 400)
        self.assertEqual(staff.get(f"/api/v1/exams/staff/attempts/?exam={self.exam.pk}&status=IN_PROGRESS").status_code, 200)
        self.assertEqual(staff.get(f"/api/v1/exams/staff/results/export/?exam={self.exam.pk}").status_code, 200)

    def test_cms_public_api_omits_retired_practice_assessment_keys(self):
        from apps.content.cms_serializers import CMSPublicPageSerializer
        from apps.content.models import CMSPage, CMSPageRevision, CMSPageSection
        page = CMSPage.objects.create(slug="retired-practice", label="Old practice", path="/retired-practice")
        revision = CMSPageRevision.objects.create(page=page, number=1, title="Old practice")
        CMSPageSection.objects.create(revision=revision, section_type="exam_assessment", data={"access_code": "old", "questions": [{"correct_option_id": "old-key"}]})
        page.published_revision = revision
        page.save()
        self.assertNotIn("old-key", json.dumps(CMSPublicPageSerializer(page).data, default=str))


@skipUnless(connection.vendor == "postgresql", "Row-lock concurrency tests require PostgreSQL")
class ExaminationConcurrencyTests(ExamFixtures, TransactionTestCase):
    def parallel(self, callback):
        barrier = Barrier(2)
        def run(_):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return callback()
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(run, range(2)))

    def test_simultaneous_starts_create_one_attempt(self):
        ids = self.parallel(lambda: str(start_attempt(self.exam.pk, self.student, None).pk))
        self.assertEqual(ids[0], ids[1])
        self.assertEqual(ExamAttempt.objects.count(), 1)

    def test_simultaneous_submissions_create_one_result(self):
        attempt = self.start()
        self.save(attempt)
        responses = self.parallel(lambda: self.post(f"exam-attempts/{attempt}/submit/", client=self.client_for(self.student)).status_code)
        self.assertEqual(responses, [200, 200])
        self.assertEqual(ExamResult.objects.count(), 1)
        self.assertEqual(ExamAuditLog.objects.filter(event="EXAM_SUBMITTED").count(), 1)
