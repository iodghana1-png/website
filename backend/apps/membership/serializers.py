from __future__ import annotations

from rest_framework import serializers
from apps.common.uploads import validate_upload

from .models import MemberDirectoryEntry, MemberProfile, MembershipApplication, MembershipRenewal, MembershipStatusHistory, MembershipType
from .services import application_reference


class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ("id", "name", "slug", "description", "eligibility", "fee", "currency", "renewal_period_months", "is_active")


class MembershipApplicationSubmitSerializer(serializers.ModelSerializer):
    cv = serializers.FileField(write_only=True)

    class Meta:
        model = MembershipApplication
        fields = ("application_kind", "current_membership_number", "first_name", "last_name", "email", "phone_number", "organisation", "current_role", "recommending_agent", "cv")

    def validate_cv(self, value):
        # CVs are delivered directly to the membership team's inbox and never
        # saved in website storage. Keep the structural safety checks, while
        # avoiding a dependency on the unavailable ClamAV service.
        return validate_upload(value, cv=True, scan_for_malware=False)

    def validate(self, attrs):
        if attrs["application_kind"] == MembershipApplication.Kind.UPGRADE and not attrs.get("current_membership_number", "").strip():
            raise serializers.ValidationError({"current_membership_number": "Enter your existing membership number for an upgrade application."})
        if attrs["application_kind"] == MembershipApplication.Kind.NEW_MEMBERSHIP:
            attrs["current_membership_number"] = ""
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        cv_upload = validated_data.pop("cv")
        application = MembershipApplication(reference=application_reference(), user=request.user if request.user.is_authenticated else None, **validated_data)
        tracking_token = application.issue_tracking_token()
        application.save()
        application._tracking_token = tracking_token
        application._cv_upload = cv_upload
        return application


class MembershipApplicationTrackingSerializer(serializers.ModelSerializer):
    assigned_membership_type = serializers.CharField(source="assigned_type.name", read_only=True)

    class Meta:
        model = MembershipApplication
        fields = ("reference", "application_kind", "assigned_membership_type", "status", "submitted_at", "updated_at", "decision_reason")
        read_only_fields = fields


class MembershipApplicationStaffSerializer(serializers.ModelSerializer):
    assigned_membership_type = MembershipTypeSerializer(source="assigned_type", read_only=True)
    applicant_name = serializers.CharField(read_only=True)
    reviewer_email = serializers.EmailField(source="reviewed_by.email", read_only=True)
    class Meta:
        model = MembershipApplication
        fields = (
            "reference", "application_kind", "current_membership_number", "assigned_membership_type", "applicant_name", "first_name", "last_name", "email", "phone_number",
            "organisation", "current_role", "recommending_agent", "status", "internal_notes", "decision_reason", "reviewer_email",
            "reviewed_at", "submitted_at", "updated_at",
        )
        read_only_fields = fields


class ApplicationReviewSerializer(serializers.Serializer):
    internal_notes = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class ApplicationApprovalSerializer(serializers.Serializer):
    membership_type = serializers.PrimaryKeyRelatedField(queryset=MembershipType.objects.filter(is_active=True))
    membership_start_date = serializers.DateField()
    membership_end_date = serializers.DateField(required=False, allow_null=True)
    public_listing = serializers.BooleanField(required=False, default=False)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=5000)

    def validate(self, attrs):
        end_date = attrs.get("membership_end_date")
        if end_date and end_date < attrs["membership_start_date"]:
            raise serializers.ValidationError({"membership_end_date": "Must be on or after membership_start_date."})
        return attrs


class ApplicationRejectionSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=5000)


class MemberProfileSerializer(serializers.ModelSerializer):
    membership_type = MembershipTypeSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = MemberProfile
        fields = (
            "id", "membership_number", "membership_type", "status", "full_name", "first_name", "last_name", "email",
            "phone_number", "organisation", "current_role", "joined_date", "membership_start_date", "membership_end_date",
            "is_publicly_listed", "created_at", "updated_at",
        )
        read_only_fields = ("id", "membership_number", "membership_type", "status", "full_name", "first_name", "last_name", "email", "joined_date", "membership_start_date", "membership_end_date", "created_at", "updated_at")


class MemberProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = ("phone_number", "organisation", "current_role")


class MemberStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MemberProfile.Status.choices)
    is_publicly_listed = serializers.BooleanField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class MembershipStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(source="changed_by.email", read_only=True)

    class Meta:
        model = MembershipStatusHistory
        fields = ("previous_status", "new_status", "reason", "changed_by_email", "created_at")
        read_only_fields = fields


class MembershipRenewalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipRenewal
        fields = ("id", "period_start", "period_end", "amount", "currency", "status", "due_date", "paid_date", "created_at", "updated_at")
        read_only_fields = fields


class MembershipRenewalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipRenewal
        fields = ("period_start", "period_end", "amount", "currency", "due_date")

    def validate(self, attrs):
        if attrs["period_end"] < attrs["period_start"]:
            raise serializers.ValidationError({"period_end": "Must be on or after period_start."})
        if attrs["due_date"] > attrs["period_end"]:
            raise serializers.ValidationError({"due_date": "Cannot be after period_end."})
        return attrs


class PublicMemberVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberDirectoryEntry
        fields = ("full_name", "designation", "as_of_date")
        read_only_fields = fields


class MemberDirectoryEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberDirectoryEntry
        fields = ("id", "full_name", "designation", "as_of_date", "is_published", "sort_order", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class MemberDirectoryBulkPublishSerializer(serializers.Serializer):
    is_published = serializers.BooleanField()
    designation = serializers.ChoiceField(choices=MemberDirectoryEntry.Designation.choices, required=False)
    current_state = serializers.BooleanField(required=False)
