from django.utils import timezone
from django.db.models import Q
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication, CSRFCheck

from .models import ExamCandidateSession
from .services import candidate_token_hash


CANDIDATE_SESSION_COOKIE = "iod_exam_candidate"


class CandidateExamAuthentication(BaseAuthentication):
    """Authenticate only the opaque, exam-scoped candidate cookie.

    This deliberately does not accept Django's member/CMS session. A candidate
    code can therefore never become a general IoD-Gh account login.
    """

    def enforce_csrf(self, request):
        check = CSRFCheck(lambda request: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")

    def authenticate(self, request):
        token = request.COOKIES.get(CANDIDATE_SESSION_COOKIE)
        if not token:
            return None
        session = ExamCandidateSession.objects.select_related("eligibility__student", "eligibility__exam", "eligibility__exam__current_version").filter(
            token_hash=candidate_token_hash(token),
            expires_at__gt=timezone.now(),
        ).filter(Q(eligibility__student__isnull=True) | Q(eligibility__student__is_active=True)).first()
        if not session:
            return None
        if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            self.enforce_csrf(request)
        # Cohort candidates have no website account. The eligibility record is
        # the scoped principal, while legacy records retain their account user.
        return session.eligibility, session

