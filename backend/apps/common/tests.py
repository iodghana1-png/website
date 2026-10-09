import base64
import json
from unittest.mock import MagicMock, patch

from django.core import mail
from django.db import DatabaseError
from django.test import Client, TestCase, override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient, APIRequestFactory

from .api import exception_handler
from .email import send_institutional_email
from .models import AnalyticsDailyVisitor, AnalyticsPageView, ContactEnquiry


class HealthEndpointTests(TestCase):
    def test_health_endpoint_returns_minimal_service_status(self):
        response = APIClient().get("/api/v1/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "iod-gh-api", "version": "v1"})
        self.assertIn("X-Request-ID", response)

    @patch("apps.common.views.connection.ensure_connection", side_effect=DatabaseError)
    def test_health_endpoint_reports_database_unavailability(self, _ensure_connection):
        response = APIClient().get("/api/v1/health/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable", "service": "iod-gh-api", "version": "v1"})

    def test_openapi_schema_is_available(self):
        response = APIClient().get("/api/schema/")

        self.assertEqual(response.status_code, 200)


class ApiErrorFormatTests(TestCase):
    def test_validation_errors_use_the_standard_envelope(self):
        request = APIRequestFactory().post("/api/v1/example/")
        response = exception_handler(ValidationError({"email": ["Enter a valid email address."]}), {"request": request, "view": None})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "invalid")
        self.assertIn("email", response.data["error"]["details"])


class ContactEnquiryTests(TestCase):
    def test_contact_enquiry_is_stored_and_sends_staff_and_sender_emails(self):
        client = Client(enforce_csrf_checks=True)
        client.get("/api/v1/auth/csrf/")
        response = client.post(
            "/api/v1/contact/enquiries/",
            data={
                "first_name": "Ama",
                "last_name": "Boateng",
                "email": "ama@example.com",
                "phone_number": "+233 20 123 4567",
                "enquiry_type": "Training",
                "message": "Please share the next director training dates.",
            },
            content_type="application/json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactEnquiry.objects.count(), 1)
        self.assertEqual(ContactEnquiry.objects.get().status, ContactEnquiry.Status.NEW)
        self.assertEqual(ContactEnquiry.objects.get().phone_number, "+233 20 123 4567")
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].subject, "New IoD-Gh website enquiry — Training")
        self.assertEqual(mail.outbox[0].reply_to, ["ama@example.com"])
        self.assertEqual(mail.outbox[1].subject, "We received your IoD-Gh enquiry")


class ResendEmailTests(TestCase):
    @patch("apps.common.email.urlopen")
    @override_settings(RESEND_API_KEY="re_test-key", DEFAULT_FROM_EMAIL="membership@example.com")
    def test_resend_https_delivery_contains_the_cv_attachment_and_idempotency_key(self, urlopen):
        response = MagicMock()
        urlopen.return_value.__enter__.return_value = response

        send_institutional_email(
            subject="New application",
            recipient=["committee@example.com"],
            recipient_name="Membership Team",
            heading="New application",
            introduction="A CV is attached.",
            closing="Review it securely.",
            attachments=[("applicant-cv.pdf", b"%PDF-test")],
            idempotency_key="membership-staff/APP-TEST",
        )

        request = urlopen.call_args.args[0]
        payload = json.loads(request.data)
        cv_attachment = next(attachment for attachment in payload["attachments"] if attachment["filename"] == "applicant-cv.pdf")
        self.assertEqual(payload["to"], ["committee@example.com"])
        self.assertEqual(cv_attachment["content"], base64.b64encode(b"%PDF-test").decode("ascii"))
        headers = {name.lower(): value for name, value in request.header_items()}
        self.assertEqual(headers["authorization"], "Bearer re_test-key")
        self.assertEqual(headers["idempotency-key"], "membership-staff/APP-TEST")


class AnalyticsTests(TestCase):
    def test_public_page_view_is_aggregated_without_storing_source_identifiers(self):
        response = APIClient().post(
            "/api/v1/analytics/visits/",
            {"path": "/membership", "referrer": "https://www.google.com/search?q=iod"},
            format="json",
            REMOTE_ADDR="203.0.113.5",
            HTTP_USER_AGENT="Test Mobile Browser",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(AnalyticsPageView.objects.count(), 1)
        self.assertEqual(AnalyticsPageView.objects.get().referrer_host, "www.google.com")
        self.assertEqual(AnalyticsPageView.objects.get().device_type, "mobile")
        self.assertEqual(AnalyticsDailyVisitor.objects.count(), 1)
        self.assertFalse(hasattr(AnalyticsPageView.objects.get(), "ip_address"))

    def test_staff_report_returns_aggregate_counts(self):
        client = APIClient()
        client.post("/api/v1/analytics/visits/", {"path": "/"}, format="json", REMOTE_ADDR="203.0.113.5")
        from apps.accounts.models import User
        client.force_authenticate(User.objects.create_user(email="admin@example.com", password="pass", is_staff=True))

        response = client.get("/api/v1/analytics/report/?days=7")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["page_views"], 1)
        self.assertEqual(response.data["today"]["unique_visitors"], 1)
