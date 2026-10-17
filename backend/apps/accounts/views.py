from __future__ import annotations

from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.cache import never_cache
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.common.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.audit.services import record_event

from .models import EmailChangeRequest, User
from .serializers import EmailChangeConfirmSerializer, EmailChangeRequestSerializer, EmailTokenSerializer, LoginSerializer, PasswordChangeSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer, UserSerializer
from .services import email_change_request_data, email_change_token_hash, send_email_change_confirmation, send_password_reset_email, send_verification_email
from .tokens import password_reset_token_generator, verification_token_generator
from .throttling import LoginAccountThrottle


def token_user(uid: str, token: str, *, generator) -> User:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.select_for_update().get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, DjangoValidationError, User.DoesNotExist):
        raise ValidationError({"token": ["The link is invalid or has expired."]})
    if not generator.check_token(user, token):
        raise ValidationError({"token": ["The link is invalid or has expired."]})
    return user


@extend_schema(responses={200: dict})
@never_cache
@ensure_csrf_cookie
@api_view(["GET"])
def csrf(request):
    return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "registration"

    @extend_schema(request=None, responses={403: dict})
    def post(self, request):
        raise PermissionDenied("Public account registration is closed. Membership applications remain available.")


@method_decorator(csrf_protect, name="dispatch")
@method_decorator(never_cache, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle, LoginAccountThrottle]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, email=serializer.validated_data["email"], password=serializer.validated_data["password"])
        if not user or not user.email_verified_at or not (user.is_staff or user.is_superuser):
            record_event(action="account.login_failed", target_type="authentication", request=request)
            raise AuthenticationFailed("Invalid credentials or unverified account.")
        login(request, user)
        request.session.cycle_key()
        record_event(action="account.logged_in", target_type="user", target_id=user.id, actor=user, request=request)
        return Response(UserSerializer(user).data)


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: OpenApiTypes.NONE})
    def post(self, request):
        record_event(action="account.logged_out", target_type="user", target_id=request.user.id, actor=request.user, request=request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(never_cache, name="dispatch")
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        return Response(UserSerializer(request.user).data)


@method_decorator(csrf_protect, name="dispatch")
class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_verification"

    @extend_schema(request=EmailTokenSerializer, responses={200: UserSerializer})
    @transaction.atomic
    def post(self, request):
        serializer = EmailTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = token_user(**serializer.validated_data, generator=verification_token_generator)
        if user.email_verified_at:
            raise ValidationError({"email": ["This email address has already been verified."]})
        from django.utils import timezone

        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at", "updated_at"])
        record_event(action="account.email_verified", target_type="user", target_id=user.id, actor=user, request=request)
        return Response(UserSerializer(user).data)


@method_decorator(csrf_protect, name="dispatch")
class EmailVerificationResendView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_verification"

    @extend_schema(request=PasswordResetRequestSerializer, responses={202: None})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], email_verified_at__isnull=True, is_active=True).first()
        if user:
            send_verification_email(user)
            record_event(action="account.verification_resent", target_type="user", target_id=user.id, actor=user, request=request)
        return Response(status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    @extend_schema(request=PasswordResetRequestSerializer, responses={202: None})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            send_password_reset_email(user)
            record_event(action="account.password_reset_requested", target_type="user", target_id=user.id, actor=user, request=request)
        return Response(status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    @extend_schema(request=PasswordResetConfirmSerializer, responses={204: None})
    @transaction.atomic
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = token_user(serializer.validated_data["uid"], serializer.validated_data["token"], generator=password_reset_token_generator)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password", "updated_at"])
        record_event(action="account.password_reset_completed", target_type="user", target_id=user.id, actor=user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["current_password"]):
            raise ValidationError({"current_password": ["Your current password is incorrect."]})
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password", "updated_at"])
        request.session.cycle_key()
        record_event(action="account.password_changed", target_type="user", target_id=request.user.id, actor=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class EmailChangeRequestView(APIView):
    """Start a two-step email change without ever accepting a new address silently."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_change"

    @extend_schema(request=EmailChangeRequestSerializer, responses={202: dict})
    @transaction.atomic
    def post(self, request):
        serializer = EmailChangeRequestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["current_password"]):
            raise ValidationError({"current_password": ["Your current password is incorrect."]})

        token, token_hash, expires_at = email_change_request_data()
        EmailChangeRequest.objects.update_or_create(
            user=request.user,
            defaults={
                "pending_email": serializer.validated_data["new_email"],
                "token_hash": token_hash,
                "expires_at": expires_at,
            },
        )
        try:
            send_email_change_confirmation(user=request.user, new_email=serializer.validated_data["new_email"], token=token)
        except Exception:
            # Do not leave a usable confirmation link behind if it could not be delivered.
            EmailChangeRequest.objects.filter(user=request.user, token_hash=token_hash).delete()
            return Response({"error": {"message": "We could not send the confirmation email. Please try again."}}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        record_event(
            action="account.email_change_requested",
            target_type="user",
            target_id=request.user.id,
            actor=request.user,
            request=request,
            metadata={"pending_email": serializer.validated_data["new_email"]},
        )
        return Response({"detail": "A confirmation link has been sent to your new email address."}, status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_protect, name="dispatch")
class EmailChangeConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_change_confirm"

    @extend_schema(request=EmailChangeConfirmSerializer, responses={200: UserSerializer})
    @transaction.atomic
    def post(self, request):
        serializer = EmailChangeConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_hash = email_change_token_hash(serializer.validated_data["token"])
        change = EmailChangeRequest.objects.select_for_update().select_related("user").filter(token_hash=token_hash).first()
        if not change or change.expires_at <= timezone.now() or not change.user.is_active:
            raise ValidationError({"token": ["The link is invalid or has expired."]})

        user = User.objects.select_for_update().get(pk=change.user_id)
        if User.objects.filter(email__iexact=change.pending_email).exclude(pk=user.pk).exists():
            raise ValidationError({"token": ["This email address is already in use. Request another email change."]})
        user.email = change.pending_email
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email", "email_verified_at", "updated_at"])
        # An examination-management verification is bound to the old address.
        from apps.examinations.models import ExamAdminVerification

        ExamAdminVerification.objects.filter(user=user).delete()
        change.delete()
        record_event(action="account.email_changed", target_type="user", target_id=user.id, actor=user, request=request)
        return Response(UserSerializer(user).data)

# Create your views here.
