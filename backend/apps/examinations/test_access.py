from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.utils import timezone

from .authentication import CANDIDATE_SESSION_COOKIE
from .models import ExamAdminVerification, ExamAttempt, ExamEligibility, ExamResult
from .serializers import ExamInput
from .services import issue_candidate_code, save_exam
from .tests import ExamFixtures


@override_settings(EXAM_EMAIL_NOTIFICATIONS=False)
class CandidateResumeTests(ExamFixtures, TestCase):
    def test_week_long_attempt_restores_saved_answers_next_day_after_logout(self):
        self.exam = save_exam({
            **self.config, "duration_minutes": 10080,
            "ends_at": timezone.now() + timedelta(days=7),
        }, self.staff, None, self.exam.pk)
        grant = ExamEligibility.objects.get(exam=self.exam, student=self.student)
        code = issue_candidate_code(grant)
        # Signing in after configuring the window gives a cookie covering it.
        client = self.client_for(None)
        payload = {"full_name": self.student.full_name, "email": self.student.email, "access_code": code}
        self.assertEqual(self.post("exams/candidate/access/", payload, client).status_code, 200)
        self.client = client
        attempt = self.start()
        self.assertEqual(self.save(attempt).status_code, 200)
        before = self.questions(attempt).json()
        stolen_cookie = client.cookies[CANDIDATE_SESSION_COOKIE].value
        self.assertEqual(self.post("exams/candidate/sign-out/").status_code, 204)
        client.cookies[CANDIDATE_SESSION_COOKIE] = stolen_cookie
        self.assertEqual(client.get("/api/v1/exams/available/").status_code, 403)
        tomorrow = timezone.now() + timedelta(days=1)
        with patch("django.utils.timezone.now", return_value=tomorrow):
            returning = self.client_for(None)
            self.assertEqual(self.post("exams/candidate/access/", payload, returning).status_code, 200)
            self.client = returning
            self.assertEqual(self.start(), attempt)
            after = self.questions(attempt).json()
        self.assertEqual(after["questions"], before["questions"])
        self.assertEqual(after["attempt"]["status"], "IN_PROGRESS")
        self.assertEqual(after["attempt"]["expires_at"], before["attempt"]["expires_at"])
        self.assertEqual(ExamAttempt.objects.count(), 1)
        self.assertFalse(ExamResult.objects.exists())

    def test_week_duration_has_a_server_side_limit(self):
        serializer = ExamInput(data={**self.config, "duration_minutes": 10080})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        for duration in [0, 10081]:
            serializer = ExamInput(data={**self.config, "duration_minutes": duration})
            self.assertFalse(serializer.is_valid())
            self.assertIn("duration_minutes", serializer.errors)

    def test_week_duration_never_overrides_scheduled_closing_time(self):
        self.exam = save_exam({**self.config, "duration_minutes": 10080}, self.staff, None, self.exam.pk)
        attempt = ExamAttempt.objects.get(pk=self.start())
        self.assertEqual(attempt.expires_at, self.config["ends_at"])
        with patch("django.utils.timezone.now", return_value=attempt.expires_at + timedelta(seconds=1)):
            self.assertEqual(self.questions(attempt.pk).status_code, 409)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, "EXPIRED")

    def test_returning_without_logout_still_has_access_next_day(self):
        self.exam = save_exam({
            **self.config, "duration_minutes": 10080,
            "ends_at": timezone.now() + timedelta(days=7),
        }, self.staff, None, self.exam.pk)
        self.client = self.client_for(self.student)
        attempt = self.start()
        self.save(attempt)
        with patch("django.utils.timezone.now", return_value=timezone.now() + timedelta(days=6)):
            response = self.questions(attempt)
            self.assertEqual(response.status_code, 200)
            self.assertIsNotNone(response.json()["questions"][0]["selected_option"])


class ExamAdminAccessTests(ExamFixtures, TestCase):
    def setUp(self):
        super().setUp()
        self.admin = self.client_for(self.staff, verified=False)
        self.mailer = patch("apps.examinations.admin_security.send_institutional_email").start()
        self.addCleanup(patch.stopall)

    def send_code(self, client=None):
        response = self.post("exams/staff/access/send/", client=client or self.admin)
        self.assertEqual(response.status_code, 200, response.content)
        return dict(self.mailer.call_args.kwargs["details"])["Verification code"]

    def verify(self, code, client=None):
        return self.post("exams/staff/access/verify/", {"code": code}, client or self.admin)

    def test_all_management_endpoints_require_verification_not_just_the_ui(self):
        attempt = self.start()
        grant = self.exam.attempts.get(pk=attempt).eligibility_id
        paths = [
            "questions/", f"questions/{self.question.pk}/", "exams/",
            f"exams/{self.exam.pk}/", f"exams/{self.exam.pk}/eligibility/",
            f"exams/{self.exam.pk}/eligibility/{grant}/",
            "attempts/", f"attempts/{attempt}/", f"attempts/{attempt}/release/",
            f"results/export/?exam={self.exam.pk}",
        ]
        for path in paths:
            with self.subTest(path=path):
                self.assertEqual(self.admin.get("/api/v1/exams/staff/" + path).status_code, 403)
                self.assertEqual(self.post("exams/staff/" + path, client=self.admin).status_code, 403)
        self.assertFalse(self.admin.get("/api/v1/exams/staff/access/").json()["verified"])

    def test_valid_code_unlocks_only_this_session_and_cannot_be_replayed(self):
        code = self.send_code()
        self.assertEqual(len(code), 6)
        self.assertEqual(self.mailer.call_args.kwargs["recipient"], self.staff.email)
        record = ExamAdminVerification.objects.get()
        self.assertNotEqual(record.code_hash, code)
        other_session = self.client_for(self.staff, verified=False)
        self.assertEqual(self.verify(code, other_session).status_code, 400)
        self.assertEqual(self.verify(code).status_code, 200)
        self.assertTrue(self.admin.get("/api/v1/exams/staff/access/").json()["verified"])
        self.assertEqual(self.admin.get("/api/v1/exams/staff/questions/").status_code, 200)
        self.assertEqual(other_session.get("/api/v1/exams/staff/questions/").status_code, 403)
        self.assertEqual(self.verify(code).status_code, 400)
        self.assertIn("no-store", self.admin.get("/api/v1/exams/staff/access/")["Cache-Control"])

    def test_wrong_code_is_limited_to_five_tries(self):
        code = self.send_code()
        wrong = "000000" if code != "000000" else "000001"
        for _ in range(5):
            response = self.verify(wrong)
            self.assertEqual(response.status_code, 400)
            self.assertIn("incorrect", response.json()["error"]["message"])
        self.assertEqual(self.verify(code).status_code, 400)
        self.assertEqual(self.admin.get("/api/v1/exams/staff/questions/").status_code, 403)

    def test_malformed_code_payload_is_rejected_without_a_server_error(self):
        self.send_code()
        for payload in ['["123456"]', '{"code": ["123456"]}']:
            response = self.admin.post("/api/v1/exams/staff/access/verify/", payload, content_type="application/json")
            self.assertEqual(response.status_code, 400)

    def test_expired_code_and_expired_verification_are_rejected(self):
        code = self.send_code()
        with patch("django.utils.timezone.now", return_value=timezone.now() + timedelta(minutes=11)):
            self.assertEqual(self.verify(code).status_code, 400)
        self.assertEqual(self.verify(code).status_code, 200)
        ExamAdminVerification.objects.update(verified_until=timezone.now() - timedelta(seconds=1))
        self.assertFalse(self.admin.get("/api/v1/exams/staff/access/").json()["verified"])
        self.assertEqual(self.admin.get("/api/v1/exams/staff/questions/").status_code, 403)

    def test_resend_cooldown_and_previous_code_invalidation(self):
        with patch("apps.examinations.admin_security.secrets.randbelow", return_value=123456):
            code = self.send_code()
        self.assertEqual(self.post("exams/staff/access/send/", client=self.admin).status_code, 429)
        with patch("django.utils.timezone.now", return_value=timezone.now() + timedelta(seconds=61)):
            with patch("apps.examinations.admin_security.secrets.randbelow", return_value=654321):
                replacement = self.send_code()
            self.assertEqual(self.verify(code).status_code, 400)
            self.assertEqual(self.verify(replacement).status_code, 200)

    def test_mail_failure_does_not_leave_usable_challenge(self):
        self.mailer.side_effect = RuntimeError("Delivery unavailable")
        response = self.post("exams/staff/access/send/", client=self.admin)
        self.assertEqual(response.status_code, 503)
        self.assertFalse(ExamAdminVerification.objects.exists())
        self.assertEqual(self.admin.get("/api/v1/exams/staff/questions/").status_code, 403)

    def test_csrf_and_authorized_role_are_required(self):
        code = self.send_code()
        self.admin.defaults.pop("HTTP_X_CSRFTOKEN")
        self.assertEqual(self.verify(code).status_code, 403)
        self.assertEqual(self.post("exams/staff/access/send/", client=self.admin).status_code, 403)
        self.assertEqual(self.post("exams/staff/access/send/").status_code, 403)
        self.student.is_staff = True
        self.student.save()
        ordinary_staff = self.client_for(self.student, verified=False)
        self.assertEqual(self.post("exams/staff/access/send/", client=ordinary_staff).status_code, 403)
        group, _ = Group.objects.get_or_create(name="Training Officer")
        self.student.groups.add(group)
        officer_code = self.send_code(ordinary_staff)
        self.assertEqual(self.verify(officer_code, ordinary_staff).status_code, 200)
        self.assertEqual(ordinary_staff.get("/api/v1/exams/staff/questions/").status_code, 200)
        self.student.groups.clear()
        self.assertEqual(ordinary_staff.get("/api/v1/exams/staff/questions/").status_code, 403)

    def test_changed_email_invalidates_verified_access(self):
        self.assertEqual(self.verify(self.send_code()).status_code, 200)
        self.staff.email = "changed@example.com"
        self.staff.save()
        self.assertEqual(self.admin.get("/api/v1/exams/staff/questions/").status_code, 403)

    def test_send_rate_limit_is_shared_across_administrator_sessions(self):
        for _ in range(10):
            self.send_code(self.client_for(self.staff, verified=False))
        another_session = self.client_for(self.staff, verified=False)
        response = self.post("exams/staff/access/send/", client=another_session)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(self.mailer.call_count, 10)

    def test_verification_rate_limit_is_shared_across_sessions(self):
        for _ in range(30):
            self.assertEqual(self.verify("000000").status_code, 400)
        another_session = self.client_for(self.staff, verified=False)
        self.assertEqual(self.verify("000000", another_session).status_code, 429)

    def test_admin_logout_invalidates_previous_session_access(self):
        from django.conf import settings
        self.assertEqual(self.verify(self.send_code()).status_code, 200)
        cookie = self.admin.cookies[settings.SESSION_COOKIE_NAME].value
        self.assertEqual(self.post("auth/logout/", client=self.admin).status_code, 204)
        self.admin.cookies[settings.SESSION_COOKIE_NAME] = cookie
        self.assertEqual(self.admin.get("/api/v1/exams/staff/questions/").status_code, 403)
