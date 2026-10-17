from __future__ import annotations

import secrets
from datetime import date

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import MemberProfile, MembershipApplication, MembershipStatusHistory, MembershipType


def application_reference() -> str:
    return f"APP-{secrets.token_hex(6).upper()}"


def membership_number() -> str:
    while True:
        candidate = f"IOD-{date.today().year}-{secrets.token_hex(4).upper()}"
        if not MemberProfile.objects.filter(membership_number=candidate).exists():
            return candidate


@transaction.atomic
def approve_application(*, application: MembershipApplication, reviewer, membership_type: MembershipType, membership_start_date, membership_end_date=None, public_listing=False, reason="") -> MemberProfile:
    application = MembershipApplication.objects.select_for_update(of=("self",)).select_related("assigned_type", "user").get(pk=application.pk)
    if application.status not in {MembershipApplication.Status.SUBMITTED, MembershipApplication.Status.UNDER_REVIEW}:
        raise ValidationError({"status": ["Only submitted or under-review applications can be approved."]})
    if application.application_kind == MembershipApplication.Kind.NEW_MEMBERSHIP and application.user and hasattr(application.user, "member_profile"):
        raise ValidationError({"application": ["This account already has a member profile."]})

    today = date.today()
    if application.application_kind == MembershipApplication.Kind.UPGRADE:
        try:
            member = MemberProfile.objects.select_for_update().get(membership_number__iexact=application.current_membership_number)
        except MemberProfile.DoesNotExist:
            raise ValidationError({"current_membership_number": ["No member was found for this upgrade application."]})
        member.membership_type = membership_type
        member.save(update_fields=["membership_type", "updated_at"])
    else:
        member = MemberProfile.objects.create(
            user=application.user,
            membership_number=membership_number(),
            membership_type=membership_type,
            status=MemberProfile.Status.ACTIVE,
            first_name=application.first_name,
            last_name=application.last_name,
            email=application.email,
            phone_number=application.phone_number,
            secondary_phone_number=application.secondary_phone_number,
            organisation=application.organisation,
            current_role=application.current_role,
            joined_date=today,
            membership_start_date=membership_start_date,
            membership_end_date=membership_end_date,
            is_publicly_listed=public_listing,
        )
        MembershipStatusHistory.objects.create(member=member, previous_status="", new_status=MemberProfile.Status.ACTIVE, changed_by=reviewer, reason=reason)
    application.status = MembershipApplication.Status.APPROVED
    application.reviewed_by = reviewer
    from django.utils import timezone

    application.reviewed_at = timezone.now()
    application.assigned_type = membership_type
    application.decision_reason = reason
    application.save(update_fields=["status", "reviewed_by", "reviewed_at", "assigned_type", "decision_reason", "updated_at"])
    return member


@transaction.atomic
def reject_application(*, application: MembershipApplication, reviewer, reason: str) -> MembershipApplication:
    application = MembershipApplication.objects.select_for_update().get(pk=application.pk)
    if application.status not in {MembershipApplication.Status.SUBMITTED, MembershipApplication.Status.UNDER_REVIEW}:
        raise ValidationError({"status": ["Only submitted or under-review applications can be rejected."]})
    from django.utils import timezone

    application.status = MembershipApplication.Status.REJECTED
    application.reviewed_by = reviewer
    application.reviewed_at = timezone.now()
    application.decision_reason = reason
    application.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_reason", "updated_at"])
    return application
