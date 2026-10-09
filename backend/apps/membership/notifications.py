from __future__ import annotations

from django.conf import settings

from apps.common.email import send_institutional_email

from .models import MemberProfile, MembershipApplication, MembershipRenewal


def send_application_received_email(application: MembershipApplication, *, idempotency_key: str | None = None) -> None:
    send_institutional_email(
        subject="We received your IoD-Gh membership application",
        recipient=application.email,
        recipient_name=application.applicant_name,
        heading="Your application is with us.",
        introduction=(
            "Thank you for applying for IoD-Gh membership. We have received your application and CV. "
            "The membership committee will assess your application and assign the appropriate category."
        ),
        details=(("Application reference", application.reference),),
        closing="Please retain this reference while your application is under review. We will contact you when there is an update.",
        idempotency_key=idempotency_key or f"membership-received/{application.reference}",
    )


def send_application_submitted_to_staff_email(application: MembershipApplication, cv_upload) -> None:
    """Email the CV to staff without retaining it in website storage."""
    cv_filename = cv_upload.name.rsplit("/", 1)[-1]
    attachments = [(cv_filename, cv_upload.read())]

    send_institutional_email(
        subject=f"New IoD-Gh membership application — {application.reference}",
        recipient=settings.MEMBERSHIP_APPLICATION_RECIPIENTS,
        recipient_name="Membership Team",
        heading="A new application has been submitted.",
        introduction="A membership application is ready for the committee's review.",
        details=(
            ("Application reference", application.reference),
            ("Application type", application.get_application_kind_display()),
            ("Applicant", application.applicant_name),
            ("Email address", application.email),
            ("Phone number", application.phone_number or "Not provided"),
            ("Organisation", application.organisation or "Not provided"),
            ("Current role", application.current_role or "Not provided"),
            ("Recommending agent", application.recommending_agent or "Not provided"),
            ("CV attachment", cv_filename),
        ),
        closing="The CV is attached for authorised IoD-Gh membership staff. It is not retained on the website.",
        attachments=attachments,
        idempotency_key=f"membership-staff/{application.reference}",
    )


def send_application_decision_email(application: MembershipApplication, member: MemberProfile | None = None) -> None:
    if application.status == MembershipApplication.Status.APPROVED and member:
        send_institutional_email(
            subject="Your IoD-Gh membership application has been approved",
            recipient=application.email,
            recipient_name=application.applicant_name,
            heading="Your membership has been approved.",
            introduction="We are pleased to confirm that your IoD-Gh membership application has been approved.",
            details=(
                ("Membership number", member.membership_number),
                ("Membership category", member.membership_type.name),
            ),
            closing="We will share the next steps separately. Welcome to IoD-Gh.",
        )
    else:
        send_institutional_email(
            subject="Update on your IoD-Gh membership application",
            recipient=application.email,
            recipient_name=application.applicant_name,
            heading="An update on your application.",
            introduction="Your IoD-Gh membership application was not approved at this time.",
            details=(
                ("Application reference", application.reference),
                ("Message", application.decision_reason or "Please contact IoD-Gh for further information."),
            ),
            closing="Please contact IoD-Gh if you require further information.",
            action_label="Contact IoD-Gh",
            action_url=f"{settings.FRONTEND_BASE_URL.rstrip('/')}/contact",
        )


def send_renewal_created_email(member: MemberProfile, renewal: MembershipRenewal) -> None:
    send_institutional_email(
        subject="Your IoD-Gh membership renewal is due",
        recipient=member.email,
        recipient_name=member.full_name,
        heading="Your membership renewal is due.",
        introduction="A membership renewal record has been created for you.",
        details=(
            ("Membership number", member.membership_number),
            ("Renewal period", f"{renewal.period_start:%d %B %Y} to {renewal.period_end:%d %B %Y}"),
            ("Amount due", f"{renewal.currency} {renewal.amount}"),
            ("Due date", f"{renewal.due_date:%d %B %Y}"),
        ),
        closing="Payment instructions will be provided by IoD-Gh.",
    )
