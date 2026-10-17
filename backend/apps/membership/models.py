from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import date

from django.conf import settings
from django.db import models
from django.db.models import F, Q


class MembershipType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    eligibility = models.TextField(blank=True)
    fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="GHS")
    renewal_period_months = models.PositiveSmallIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class MembershipApplication(models.Model):
    class Kind(models.TextChoices):
        NEW_MEMBERSHIP = "new_membership", "New membership"
        UPGRADE = "upgrade", "Membership upgrade"

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=32, unique=True, editable=False)
    tracking_token_hash = models.CharField(max_length=64, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="membership_applications")
    application_kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.NEW_MEMBERSHIP)
    current_membership_number = models.CharField(max_length=32, blank=True)
    assigned_type = models.ForeignKey(MembershipType, null=True, blank=True, on_delete=models.PROTECT, related_name="applications")
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=50, blank=True)
    secondary_phone_number = models.CharField(max_length=50, blank=True)
    organisation = models.CharField(max_length=255, blank=True)
    current_role = models.CharField(max_length=255, blank=True)
    recommending_agent = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_membership_applications")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    internal_notes = models.TextField(blank=True)
    decision_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [models.Index(fields=["status", "submitted_at"]), models.Index(fields=["email", "submitted_at"])]

    def clean(self):
        if self.application_kind == self.Kind.UPGRADE and not self.current_membership_number:
            from django.core.exceptions import ValidationError

            raise ValidationError({"current_membership_number": "A membership number is required for an upgrade application."})

    @property
    def applicant_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def issue_tracking_token(self) -> str:
        token = secrets.token_urlsafe(32)
        self.tracking_token_hash = hashlib.sha256(token.encode()).hexdigest()
        return token

    def tracking_token_is_valid(self, token: str) -> bool:
        return secrets.compare_digest(self.tracking_token_hash, hashlib.sha256(token.encode()).hexdigest())


class MemberProfile(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        EXPIRED = "expired", "Expired"
        RESIGNED = "resigned", "Resigned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="member_profile")
    membership_number = models.CharField(max_length=32, unique=True, editable=False)
    membership_type = models.ForeignKey(MembershipType, on_delete=models.PROTECT, related_name="members")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=50, blank=True)
    secondary_phone_number = models.CharField(max_length=50, blank=True)
    organisation = models.CharField(max_length=255, blank=True)
    current_role = models.CharField(max_length=255, blank=True)
    joined_date = models.DateField()
    membership_start_date = models.DateField()
    membership_end_date = models.DateField(null=True, blank=True)
    is_publicly_listed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        constraints = [models.CheckConstraint(condition=Q(membership_end_date__isnull=True) | Q(membership_end_date__gte=F("membership_start_date")), name="membership_end_after_start")]
        indexes = [models.Index(fields=["membership_number"]), models.Index(fields=["status", "is_publicly_listed"])]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_in_good_standing(self) -> bool:
        return self.status == self.Status.ACTIVE and self.is_publicly_listed and (self.membership_end_date is None or self.membership_end_date >= date.today())


class MembershipStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(MemberProfile, on_delete=models.PROTECT, related_name="status_history")
    previous_status = models.CharField(max_length=20, choices=MemberProfile.Status.choices, blank=True)
    new_status = models.CharField(max_length=20, choices=MemberProfile.Status.choices)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="membership_status_changes")
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class MembershipRenewal(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        OVERDUE = "overdue", "Overdue"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(MemberProfile, on_delete=models.PROTECT, related_name="renewals")
    period_start = models.DateField()
    period_end = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="GHS")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_start"]
        constraints = [models.CheckConstraint(condition=Q(period_end__gte=F("period_start")), name="renewal_end_after_start")]


class MemberDirectoryEntry(models.Model):
    class Designation(models.TextChoices):
        HONORARY_FELLOW = "HFIoD", "Honorary Fellow"
        FELLOW = "FIoD", "Fellow"
        MEMBER = "MIoD", "Member"
        ASSOCIATE = "AIoD", "Associate"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    designation = models.CharField(max_length=10, choices=Designation.choices)
    as_of_date = models.DateField()
    is_published = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["designation", "sort_order", "full_name"]
        indexes = [models.Index(fields=["is_published", "designation", "full_name"])]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.designation})"

# Create your models here.
