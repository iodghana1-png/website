from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf, name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("email-verification/confirm/", views.EmailVerificationConfirmView.as_view(), name="email-verification-confirm"),
    path("email-verification/resend/", views.EmailVerificationResendView.as_view(), name="email-verification-resend"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("password-change/", views.PasswordChangeView.as_view(), name="password-change"),
    path("email-change/", views.EmailChangeRequestView.as_view(), name="email-change"),
    path("email-change/confirm/", views.EmailChangeConfirmView.as_view(), name="email-change-confirm"),
]
