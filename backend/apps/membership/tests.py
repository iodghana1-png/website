import io
import json
from datetime import date
from io import BytesIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from pypdf import PdfWriter

from django.contrib.auth.models import Group
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog

from .models import MemberDirectoryEntry, MemberProfile, MembershipApplication, MembershipRenewal, MembershipType


class MembershipApiTests(TestCase):
    def setUp(self):
        self.membership_type = MembershipType.objects.create(
            name="Test Associate",
            slug="test-associate",
            description="For aspiring directors.",
            renewal_period_months=12,
        )
        self.officer = User.objects.create_user("officer@example.com", "Secure-pass-123!", email_verified_at=timezone.now())
        self.officer.groups.add(Group.objects.get(name="Membership Officer"))
        self.fellow_type = MembershipType.objects.create(name="Test Fellow", slug="test-fellow")

    def csrf_client(self, user=None):
        client = Client(enforce_csrf_checks=True)
        client.get("/api/v1/auth/csrf/")
        client.defaults["HTTP_X_CSRFTOKEN"] = client.cookies["csrftoken"].value
        if user:
            client.force_login(user)
        return client

    def submit_application(self, **overrides):
        pdf = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=595, height=842)
        writer.write(pdf)
        payload = {
            "application_kind": MembershipApplication.Kind.NEW_MEMBERSHIP,
            "first_name": "Akosua",
            "last_name": "Owusu",
            "email": "akosua@example.com",
            "phone_number": "+233201234567",
            "organisation": "Example Ghana Ltd",
            "current_role": "Director",
            "cv": SimpleUploadedFile("akosua-owusu-cv.pdf", pdf.getvalue(), content_type="application/pdf"),
        }
        payload.update(overrides)
        response = self.csrf_client().post(
            "/api/v1/membership/applications/",
            data=payload,
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    def test_directory_entries_are_private_until_an_officer_publishes_them(self):
        entry = MemberDirectoryEntry.objects.create(full_name="Example, Member", designation="MIoD", as_of_date=date(2026, 9, 30))
        self.assertEqual(self.client.get("/api/v1/membership/directory/").json(), [])

        updated = self.csrf_client(self.officer).patch(f"/api/v1/membership/staff/directory/{entry.id}/", data={"is_published": True}, content_type="application/json")
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(updated.json()["is_published"])
        public_entries = self.client.get("/api/v1/membership/directory/").json()
        self.assertEqual(len(public_entries), 1)
        self.assertEqual(public_entries[0]["full_name"], entry.full_name)

    def test_django_staff_can_manage_directory_entries(self):
        staff = User.objects.create_user("directory-admin@example.com", "Secure-pass-123!", is_staff=True, email_verified_at=timezone.now())
        response = self.csrf_client(staff).post("/api/v1/membership/staff/directory/", data={"full_name": "Example, Staff", "designation": "AIoD", "as_of_date": "2026-09-30"}, content_type="application/json")
        self.assertEqual(response.status_code, 201)

    def test_directory_bulk_publication_respects_the_category_filter(self):
        MemberDirectoryEntry.objects.create(full_name="Example, Member", designation="MIoD", as_of_date=date(2026, 9, 30))
        fellow = MemberDirectoryEntry.objects.create(full_name="Example, Fellow", designation="FIoD", as_of_date=date(2026, 9, 30))
        response = self.csrf_client(self.officer).patch("/api/v1/membership/staff/directory/bulk-publication/", data={"is_published": True, "designation": "FIoD", "current_state": False}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["updated"], 1)
        fellow.refresh_from_db()
        self.assertTrue(fellow.is_published)

    def test_public_directory_is_alphabetical_within_a_category(self):
        MemberDirectoryEntry.objects.create(full_name="Zulu, Example", designation="MIoD", as_of_date=date(2026, 9, 30), is_published=True)
        MemberDirectoryEntry.objects.create(full_name="Abena, Example", designation="MIoD", as_of_date=date(2026, 9, 30), is_published=True)
        names = [entry["full_name"] for entry in self.client.get("/api/v1/membership/directory/").json()]
        self.assertEqual(names, ["Abena, Example", "Zulu, Example"])

    @override_settings(UPLOAD_SCAN_REQUIRED=True, CLAMAV_HOST="")
    def test_application_returns_one_time_tracking_token_and_requires_it_for_guest_tracking(self):
        payload = self.submit_application()
        self.assertTrue(payload["reference"].startswith("APP-"))
        self.assertTrue(payload["tracking_token"])
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].subject, "We received your IoD-Gh membership application")
        self.assertIn(payload["reference"], mail.outbox[0].body)
        self.assertEqual(mail.outbox[1].subject, f"New IoD-Gh membership application — {payload['reference']}")
        self.assertIn("Membership Team", mail.outbox[1].body)
        self.assertTrue(mail.outbox[1].attachments[1].filename.startswith("akosua-owusu-cv"))
        self.assertTrue(mail.outbox[1].attachments[1].filename.endswith(".pdf"))
        application = MembershipApplication.objects.get(reference=payload["reference"])
        self.assertFalse(hasattr(application, "cv"))

        blocked = self.client.get(f"/api/v1/membership/applications/{payload['reference']}/")
        self.assertEqual(blocked.status_code, 404)

        tracked = self.client.get(
            f"/api/v1/membership/applications/{payload['reference']}/",
            HTTP_X_APPLICATION_ACCESS_TOKEN=payload["tracking_token"],
        )
        self.assertEqual(tracked.status_code, 200)
        self.assertEqual(tracked.json()["status"], MembershipApplication.Status.SUBMITTED)
        self.assertEqual(tracked.json()["application_kind"], MembershipApplication.Kind.NEW_MEMBERSHIP)
        self.assertNotIn("tracking_token", tracked.json())
        self.assertTrue(AuditLog.objects.filter(action="membership.application_submitted").exists())

    def test_membership_officer_can_approve_and_manage_a_member_renewal(self):
        application = self.submit_application()
        client = self.csrf_client(self.officer)

        reviewed = client.post(
            f"/api/v1/membership/staff/applications/{application['reference']}/review/",
            data=json.dumps({"internal_notes": "Identity documents checked."}),
            content_type="application/json",
        )
        self.assertEqual(reviewed.status_code, 200)

        approved = client.post(
            f"/api/v1/membership/staff/applications/{application['reference']}/approve/",
            data=json.dumps({"membership_type": str(self.membership_type.id), "membership_start_date": "2026-10-02", "membership_end_date": "2027-10-01", "public_listing": True, "reason": "Approved by council."}),
            content_type="application/json",
        )
        self.assertEqual(approved.status_code, 201)
        member_number = approved.json()["membership_number"]
        member = MemberProfile.objects.get(membership_number=member_number)
        self.assertEqual(member.status, MemberProfile.Status.ACTIVE)
        self.assertTrue(member.is_publicly_listed)
        self.assertEqual(mail.outbox[-1].subject, "Your IoD-Gh membership application has been approved")
        self.assertIn(member_number, mail.outbox[-1].body)

        renewal = client.post(
            f"/api/v1/membership/staff/members/{member_number}/renewals/",
            data=json.dumps({"period_start": "2027-10-02", "period_end": "2028-10-01", "due_date": "2027-10-01", "amount": "1200.00", "currency": "GHS"}),
            content_type="application/json",
        )
        self.assertEqual(renewal.status_code, 201)
        self.assertEqual(MembershipRenewal.objects.get(member=member).status, MembershipRenewal.Status.PENDING)
        self.assertEqual(mail.outbox[-1].subject, "Your IoD-Gh membership renewal is due")

        history = client.get(f"/api/v1/membership/staff/members/{member_number}/status-history/")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()[0]["new_status"], MemberProfile.Status.ACTIVE)
        self.assertTrue(AuditLog.objects.filter(action="membership.application_approved").exists())
        self.assertTrue(AuditLog.objects.filter(action="membership.renewal_created").exists())

    def test_membership_officer_can_resend_an_application_receipt(self):
        application = self.submit_application()
        response = self.csrf_client(self.officer).post(
            f"/api/v1/membership/staff/applications/{application['reference']}/receipt-email/",
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(mail.outbox[-1].subject, "We received your IoD-Gh membership application")
        self.assertIn(application["reference"], mail.outbox[-1].body)
        self.assertTrue(AuditLog.objects.filter(action="membership.application_receipt_resent").exists())

    def test_public_verification_only_exposes_members_in_good_standing(self):
        entry = MemberDirectoryEntry.objects.create(
            full_name="Ama Mensah",
            designation=MemberDirectoryEntry.Designation.MEMBER,
            as_of_date=date(2026, 9, 30),
            is_published=True,
        )
        MemberDirectoryEntry.objects.create(
            full_name="Akua Mensah",
            designation=MemberDirectoryEntry.Designation.ASSOCIATE,
            as_of_date=date(2026, 9, 30),
            is_published=True,
        )

        verified = self.client.get("/api/v1/membership/members/verify/", {"member_name": "Mensah Ama"})
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(verified.json()[0]["full_name"], entry.full_name)
        self.assertEqual(verified.json()[0]["designation"], entry.designation)

        partial = self.client.get("/api/v1/membership/members/verify/", {"member_name": "Mensah"})
        self.assertEqual(partial.status_code, 200)
        self.assertEqual(len(partial.json()), 2)

        entry.is_published = False
        entry.save(update_fields=["is_published", "updated_at"])
        hidden = self.client.get("/api/v1/membership/members/verify/", {"member_name": entry.full_name})
        self.assertEqual(hidden.status_code, 404)

    def test_non_officer_cannot_access_staff_membership_records(self):
        regular_user = User.objects.create_user("regular@example.com", "Secure-pass-123!", email_verified_at=timezone.now())
        response = self.csrf_client(regular_user).get("/api/v1/membership/staff/applications/")
        self.assertEqual(response.status_code, 403)

    def test_rejected_application_sends_an_update_email(self):
        application = self.submit_application()
        response = self.csrf_client(self.officer).post(
            f"/api/v1/membership/staff/applications/{application['reference']}/reject/",
            data=json.dumps({"reason": "Please provide the requested supporting documents."}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mail.outbox[-1].subject, "Update on your IoD-Gh membership application")
        self.assertIn("supporting documents", mail.outbox[-1].body)

    def test_existing_member_can_apply_for_an_upgrade_and_committee_assigns_the_new_type(self):
        existing_member = MemberProfile.objects.create(
            membership_number="IOD-2025-UPGRADE",
            membership_type=self.membership_type,
            status=MemberProfile.Status.ACTIVE,
            first_name="Kofi",
            last_name="Mensah",
            email="kofi@example.com",
            joined_date=date(2025, 1, 1),
            membership_start_date=date(2025, 1, 1),
        )
        application = self.submit_application(
            application_kind=MembershipApplication.Kind.UPGRADE,
            current_membership_number=existing_member.membership_number,
            first_name="Kofi",
            last_name="Mensah",
            email="kofi@example.com",
        )
        response = self.csrf_client(self.officer).post(
            f"/api/v1/membership/staff/applications/{application['reference']}/approve/",
            data=json.dumps({"membership_type": str(self.fellow_type.id), "membership_start_date": date.today().isoformat()}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(MemberProfile.objects.count(), 1)
        existing_member.refresh_from_db()
        self.assertEqual(existing_member.membership_type, self.fellow_type)

        cv = self.csrf_client(self.officer).get(f"/api/v1/membership/staff/applications/{application['reference']}/cv/")
        self.assertEqual(cv.status_code, 404)


class DirectoryImportCommandTests(TestCase):
    def payload(self):
        return {
            "entries": [
                {
                    "id": "9d8aa9cf-1fd3-4dbd-a92a-0979a90ab2f0",
                    "full_name": "Ama Mensah",
                    "designation": "MIoD",
                    "as_of_date": "2026-09-30",
                    "is_published": True,
                    "sort_order": 2,
                },
                {
                    "id": "b3b0eac8-02ae-4fc5-952d-11659695997b",
                    "full_name": "Kojo Owusu",
                    "designation": "FIoD",
                    "as_of_date": "2026-09-30",
                    "is_published": True,
                    "sort_order": 1,
                },
            ]
        }

    def run_command(self, *arguments):
        with patch("sys.stdin", io.StringIO(json.dumps(self.payload()))):
            call_command("import_member_directory", *arguments)

    def test_directory_import_validates_then_creates_entries_in_an_empty_register(self):
        self.run_command("--dry-run")
        self.assertEqual(MemberDirectoryEntry.objects.count(), 0)

        self.run_command("--confirm")

        self.assertEqual(MemberDirectoryEntry.objects.count(), 2)
        self.assertTrue(MemberDirectoryEntry.objects.get(full_name="Ama Mensah").is_published)

    def test_directory_import_refuses_to_overwrite_existing_entries(self):
        MemberDirectoryEntry.objects.create(full_name="Existing member", designation="MIoD", as_of_date=date(2026, 9, 30))

        with self.assertRaisesMessage(CommandError, "target member directory is not empty"):
            self.run_command("--dry-run")
