import uuid

from django.db import models
from django.utils import timezone


class RateLimitBucket(models.Model):
    """Shared, lockable rolling-window counters; never store raw IP addresses."""

    key = models.CharField(max_length=64, primary_key=True)
    history = models.JSONField(default=list)
    expires_at = models.DateTimeField(db_index=True)


class ContactEnquiry(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In progress"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=50, blank=True)
    enquiry_type = models.CharField(max_length=100)
    message = models.TextField(max_length=5000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class DocumentRequest(models.Model):
    """A public request for a letter or an attestation, fulfilled by IoD-Gh staff."""

    class RequestType(models.TextChoices):
        ADMISSION_LETTER = "admission_letter", "Admission letter"
        ATTESTATION = "attestation", "Attestation"

    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        DECLINED = "declined", "Declined"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_type = models.CharField(max_length=30, choices=RequestType.choices)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=50)
    membership_number = models.CharField(max_length=100, blank=True)
    programme = models.CharField(max_length=250)
    addressee = models.CharField(max_length=250, blank=True)
    purpose = models.TextField(max_length=2000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class AnalyticsDailyVisitor(models.Model):
    """A non-reversible, daily-rotated visitor marker for aggregate counts."""

    date = models.DateField(default=timezone.localdate)
    visitor_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["date", "visitor_hash"], name="unique_analytics_daily_visitor")]
        indexes = [models.Index(fields=["date"])]


class AnalyticsPageView(models.Model):
    date = models.DateField(default=timezone.localdate)
    path = models.CharField(max_length=255)
    referrer_host = models.CharField(max_length=255, blank=True)
    device_type = models.CharField(max_length=16, default="other")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["date", "path"]),
            models.Index(fields=["date", "referrer_host"]),
        ]
