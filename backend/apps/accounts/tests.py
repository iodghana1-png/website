from django.contrib.auth.models import Group
from django.core import mail
from django.test import Client, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.audit.models import AuditLog

from .models import User
from .services import user_token_data


class UserModelTests(TestCase):
    def test_email_is_normalized_for_the_custom_user_model(self):
        user = User.objects.create_user("DIRECTOR@EXAMPLE.COM", "safe-test-password")

        self.assertEqual(user.email, "director@example.com")
        self.assertIsNotNone(user.id)

    def test_superuser_requires_staff_and_superuser_flags(self):
        user = User.objects.create_superuser("admin@example.com", "safe-test-password")

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertIsNotNone(user.email_verified_at)


class AuthenticationApiTests(TestCase):
    def csrf_client(self):
        client = Client(enforce_csrf_checks=True)
        client.get("/api/v1/auth/csrf/")
        client.defaults["HTTP_X_CSRFTOKEN"] = client.cookies["csrftoken"].value
        return client

    def test_public_registration_is_closed_even_with_valid_csrf(self):
        blocked = Client(enforce_csrf_checks=True).post("/api/v1/auth/register/", data={"email": "member@example.com", "password": "Secure-pass-123!"}, content_type="application/json")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.json()["error"]["code"], "csrf_failed")

        response = self.csrf_client().post("/api/v1/auth/register/", data={"email": "member@example.com", "first_name": "Ama", "last_name": "Mensah", "phone_number": "+233201234567", "password": "Secure-pass-123!"}, content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(email="member@example.com").exists())
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(AuditLog.objects.filter(action="account.registered").count(), 0)

    def test_verified_admin_can_login_and_access_identity(self):
        user = User.objects.create_user("admin@example.com", "Secure-pass-123!", is_staff=True, email_verified_at=timezone.now())
        client = self.csrf_client()

        login_response = client.post("/api/v1/auth/login/", data={"email": user.email, "password": "Secure-pass-123!"}, content_type="application/json")
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.json()["email"], user.email)

        me_response = client.get("/api/v1/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["id"], str(user.id))
        self.assertTrue(AuditLog.objects.filter(action="account.logged_in", target_id=user.id).exists())

    def test_verified_non_admin_cannot_login_even_with_a_named_role(self):
        user = User.objects.create_user("member@example.com", "Secure-pass-123!", email_verified_at=timezone.now())
        user.groups.add(Group.objects.get(name="Membership Officer"))
        client = self.csrf_client()
        response = client.post("/api/v1/auth/login/", data={"email": user.email, "password": "Secure-pass-123!"}, content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(client.get("/api/v1/auth/me/").status_code, 403)
        self.assertFalse(AuditLog.objects.filter(action="account.logged_in", target_id=user.id).exists())

    def test_deleted_member_session_cannot_access_identity(self):
        user = User.objects.create_user("former@example.com", "Secure-pass-123!", email_verified_at=timezone.now())
        client = self.csrf_client()
        client.force_login(user)
        user.delete()
        self.assertEqual(client.get("/api/v1/auth/me/").status_code, 403)

    def test_unverified_user_cannot_login(self):
        User.objects.create_user("member@example.com", "Secure-pass-123!")
        response = self.csrf_client().post("/api/v1/auth/login/", data={"email": "member@example.com", "password": "Secure-pass-123!"}, content_type="application/json")
        self.assertEqual(response.status_code, 403)

    def test_superuser_can_login_without_public_email_verification(self):
        user = User.objects.create_superuser("admin@example.com", "Secure-pass-123!")

        response = self.csrf_client().post("/api/v1/auth/login/", data={"email": user.email, "password": "Secure-pass-123!"}, content_type="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_staff"])
        self.assertTrue(response.json()["is_superuser"])

    def test_staff_user_identity_includes_staff_access(self):
        user = User.objects.create_user("staff@example.com", "Secure-pass-123!", is_staff=True, email_verified_at=timezone.now())
        client = self.csrf_client()

        login_response = client.post("/api/v1/auth/login/", data={"email": user.email, "password": "Secure-pass-123!"}, content_type="application/json")
        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.json()["is_staff"])

        me_response = client.get("/api/v1/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertTrue(me_response.json()["is_staff"])

    def test_verification_and_password_reset_tokens_are_server_validated(self):
        user = User.objects.create_user("admin@example.com", "Secure-pass-123!", is_staff=True)
        client = self.csrf_client()
        verification = user_token_data(user, purpose="verification")

        verified = client.post("/api/v1/auth/email-verification/confirm/", data=verification, content_type="application/json")
        self.assertEqual(verified.status_code, 200)
        user.refresh_from_db()
        self.assertIsNotNone(user.email_verified_at)

        reset = user_token_data(user, purpose="password_reset")
        completed = client.post("/api/v1/auth/password-reset/confirm/", data={**reset, "password": "New-secure-pass-123!"}, content_type="application/json")
        self.assertEqual(completed.status_code, 204)

        login_response = client.post("/api/v1/auth/login/", data={"email": user.email, "password": "New-secure-pass-123!"}, content_type="application/json")
        self.assertEqual(login_response.status_code, 200)

    def test_verified_user_can_change_password(self):
        user = User.objects.create_user("member@example.com", "Secure-pass-123!", email_verified_at=timezone.now())
        client = self.csrf_client()
        client.force_login(user)

        response = client.post("/api/v1/auth/password-change/", data={"current_password": "Secure-pass-123!", "new_password": "New-secure-pass-123!"}, content_type="application/json")

        self.assertEqual(response.status_code, 204)
        user.refresh_from_db()
        self.assertTrue(user.check_password("New-secure-pass-123!"))

    def test_role_groups_are_available_after_migration(self):
        expected = {"Super Admin", "Membership Officer", "Training Officer", "Finance", "Content Manager", "Read Only"}
        self.assertTrue(expected.issubset(set(Group.objects.values_list("name", flat=True))))

# Create your tests here.
