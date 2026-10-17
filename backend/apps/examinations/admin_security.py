from datetime import timedelta
import secrets

from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.common.email import send_institutional_email
from .models import ExamAdminVerification
from .services import audit


def session_hash(request):
    return salted_hmac("exam-admin-session", request.session.session_key or "", algorithm="sha256").hexdigest()


def code_hash(request, code):
    return salted_hmac("exam-admin-code", f"{session_hash(request)}:{code}", algorithm="sha256").hexdigest()


def verification(request):
    return ExamAdminVerification.objects.filter(
        user=request.user, session_hash=session_hash(request), email=request.user.email,
        verified_until__gt=timezone.now(),
    ).first()


class VerifiedExamAdmin(BasePermission):
    message = "Verify your email to open examination management."

    def has_permission(self, request, view):
        return bool(verification(request))


def access_status(request):
    record = verification(request)
    local, _, domain = request.user.email.partition("@")
    return Response({
        "verified": bool(record),
        "verified_until": record.verified_until if record else None,
        "email_hint": f"{local[:1]}***@{domain}",
    })


def failure(message, status):
    return Response({"error": {"message": message}}, status=status)


def send_code(request):
    try:
        with transaction.atomic():
            record, _ = ExamAdminVerification.objects.select_for_update().get_or_create(
                session_hash=session_hash(request), defaults={"user": request.user, "email": request.user.email},
            )
            now = timezone.now()
            if record.sent_at and (now - record.sent_at).total_seconds() < 60:
                return failure("Please wait one minute before requesting another code.", 429)
            code = f"{secrets.randbelow(1000000):06d}"
            record.email = request.user.email
            record.code_hash = code_hash(request, code)
            record.expires_at = now + timedelta(minutes=10)
            record.sent_at = now
            record.failed_attempts = 0
            record.verified_until = None
            record.save()
            send_institutional_email(
                subject="Your IoD-Gh examination administration code",
                recipient=request.user.email,
                recipient_name=request.user.full_name or "Administrator",
                heading="Verify examination access",
                introduction="Enter this code in the CMS to open examination management.",
                details=[("Verification code", code)],
                closing="This code expires in 10 minutes. Do not share it. If you did not request it, secure your administrator account.",
            )
            audit("ADMIN_VERIFICATION_SENT", user=request.user, request=request)
    except Exception:
        # Roll back the challenge when delivery fails; never log its contents.
        return failure("We could not send the verification code. Please try again.", 503)
    return Response({"sent": True})


@transaction.atomic
def verify_code(request):
    record = ExamAdminVerification.objects.select_for_update().filter(
        user=request.user, session_hash=session_hash(request), email=request.user.email,
    ).first()
    now = timezone.now()
    if not record or not record.code_hash or not record.expires_at or record.expires_at <= now or record.failed_attempts >= 5:
        return failure("Request a new code and try again.", 400)
    submitted = request.data.get("code", "") if isinstance(request.data, dict) else ""
    if not isinstance(submitted, str) or not constant_time_compare(record.code_hash, code_hash(request, submitted.strip())):
        record.failed_attempts += 1
        record.save(update_fields=["failed_attempts"])
        audit("ADMIN_VERIFICATION_FAILED", user=request.user, request=request)
        return failure("That code is incorrect. After five unsuccessful tries, request a new code.", 400)
    record.code_hash = ""
    record.verified_until = now + timedelta(hours=8)
    record.save(update_fields=["code_hash", "verified_until"])
    audit("ADMIN_VERIFIED", user=request.user, request=request)
    return access_status(request)
