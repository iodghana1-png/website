from __future__ import annotations

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
# In local development, the reloader inherits its parent environment. Let the
# project's .env file refresh those values after a settings change; production
# environment variables retain their normal precedence.
load_dotenv(BASE_DIR / ".env", override=os.getenv("DJANGO_SETTINGS_MODULE", "").endswith(".development"))


def env_list(name: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
DEBUG = False
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
CSRF_FAILURE_VIEW = "apps.common.security.csrf_failure"
CMS_PUBLIC_API_BASE_URL = os.getenv("CMS_PUBLIC_API_BASE_URL", "").rstrip("/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.common",
    "apps.accounts",
    "apps.audit",
    "apps.content",
    "apps.membership",
    "apps.examinations",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL", "postgresql://iod_gh@127.0.0.1:55432/iod_gh"),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

CMS_MEDIA_STORAGE = os.getenv("CMS_MEDIA_STORAGE", "filesystem").lower()
if CMS_MEDIA_STORAGE not in {"filesystem", "s3"}:
    raise ImproperlyConfigured("CMS_MEDIA_STORAGE must be either 'filesystem' or 's3'.")

if CMS_MEDIA_STORAGE == "s3":
    CMS_MEDIA_S3_ENDPOINT = os.getenv("CMS_MEDIA_S3_ENDPOINT", "")
    CMS_MEDIA_S3_ACCESS_KEY_ID = os.getenv("CMS_MEDIA_S3_ACCESS_KEY_ID", "")
    CMS_MEDIA_S3_SECRET_ACCESS_KEY = os.getenv("CMS_MEDIA_S3_SECRET_ACCESS_KEY", "")
    CMS_MEDIA_S3_BUCKET_NAME = os.getenv("CMS_MEDIA_S3_BUCKET_NAME", "")
    CMS_MEDIA_S3_REGION = os.getenv("CMS_MEDIA_S3_REGION", "auto")
    if not all((CMS_MEDIA_S3_ENDPOINT, CMS_MEDIA_S3_ACCESS_KEY_ID, CMS_MEDIA_S3_SECRET_ACCESS_KEY, CMS_MEDIA_S3_BUCKET_NAME)):
        raise ImproperlyConfigured("CMS S3 storage requires its endpoint, credentials, and bucket name.")
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": CMS_MEDIA_S3_ACCESS_KEY_ID,
                "secret_key": CMS_MEDIA_S3_SECRET_ACCESS_KEY,
                "bucket_name": CMS_MEDIA_S3_BUCKET_NAME,
                "endpoint_url": CMS_MEDIA_S3_ENDPOINT,
                "region_name": CMS_MEDIA_S3_REGION,
                "addressing_style": "virtual",
                "file_overwrite": False,
                "querystring_auth": True,
            },
        },
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.common.api.exception_handler",
    "DEFAULT_THROTTLE_CLASSES": ["apps.common.throttling.ScopedRateThrottle"],
    "NUM_PROXIES": 0,
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",
        "login_account": "20/hour",
        "registration": "3/hour",
        "password_reset": "5/hour",
        "email_verification": "5/hour",
        "membership_application": "5/hour",
        "membership_application_email_resend": "10/hour",
        "contact_enquiry": "5/hour",
        "analytics_visit": "120/min",
        "exam_read": "180/min",
        "exam_write": "120/min",
        "exam_start": "10/min",
        "exam_admin": "120/min",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "IoD-Gh API",
    "DESCRIPTION": "Versioned API for the Institute of Directors-Ghana platform.",
    "VERSION": "v1",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {
        "MembershipApplicationStatus": "apps.membership.models.MembershipApplication.Status",
        "MemberProfileStatus": "apps.membership.models.MemberProfile.Status",
        "MembershipRenewalStatus": "apps.membership.models.MembershipRenewal.Status",
    },
}

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
# Empty by default: never trust forwarding headers from arbitrary clients.
TRUSTED_PROXY_CIDRS = env_list("TRUSTED_PROXY_CIDRS")
PASSWORD_RESET_TIMEOUT = 3600
CLAMAV_HOST = os.getenv("CLAMAV_HOST", "")
CLAMAV_PORT = int(os.getenv("CLAMAV_PORT", "3310"))
UPLOAD_SCAN_REQUIRED = False  # Production overrides this unconditionally.
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
EXAM_PORTAL_URL = os.getenv("EXAM_PORTAL_URL", "https://exam.iodghana.org")
EXAM_EMAIL_NOTIFICATIONS = os.getenv("EXAM_EMAIL_NOTIFICATIONS", "false").lower() == "true"
ADMIN_ENABLED = os.getenv("DJANGO_ENABLE_ADMIN", "false").lower() == "true"

DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@example.invalid")
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() == "true"
# Railway Trial, Free and Hobby plans block outbound SMTP. When configured,
# this key makes institutional email use Resend's HTTPS API instead.
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
MEMBERSHIP_APPLICATION_RECIPIENTS = env_list("MEMBERSHIP_APPLICATION_RECIPIENTS") or [DEFAULT_FROM_EMAIL]
CONTACT_ENQUIRY_RECIPIENTS = env_list("CONTACT_ENQUIRY_RECIPIENTS") or [DEFAULT_FROM_EMAIL]
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "false").lower() == "true"
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_AGE = 28_800

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "apps.common.logging.JsonFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": os.getenv("LOG_LEVEL", "INFO")},
}
