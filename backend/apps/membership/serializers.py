from __future__ import annotations

import csv
import io
from datetime import date

from rest_framework import serializers
from django.utils.dateparse import parse_date
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


class MemberDirectoryBulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)


class MemberDirectoryImportSerializer(serializers.Serializer):
    csv_file = serializers.FileField(write_only=True)
    default_as_of_date = serializers.DateField()
    default_is_published = serializers.BooleanField(default=False)

    required_columns = {"full_name", "designation"}
    optional_columns = {"as_of_date", "is_published", "sort_order"}
    max_file_size = 2 * 1024 * 1024
    max_rows = 5000

    def validate_csv_file(self, upload):
        if upload.size > self.max_file_size:
            raise serializers.ValidationError("Choose a CSV file smaller than 2 MB.")
        if not upload.size:
            raise serializers.ValidationError("Choose a CSV file with at least one directory entry.")
        if upload.name and not upload.name.lower().endswith(".csv"):
            raise serializers.ValidationError("Choose a CSV file.")
        try:
            upload.seek(0)
            contents = upload.read(self.max_file_size + 1)
            text = contents.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise serializers.ValidationError("The CSV must use UTF-8 text encoding.") from error
        finally:
            upload.seek(0)
        if len(contents) > self.max_file_size:
            raise serializers.ValidationError("Choose a CSV file smaller than 2 MB.")
        try:
            reader = csv.DictReader(io.StringIO(text))
        except csv.Error as error:
            raise serializers.ValidationError("The CSV could not be read.") from error
        columns = {column.strip() for column in reader.fieldnames or [] if column and column.strip()}
        expected = self.required_columns | self.optional_columns
        missing = self.required_columns - columns
        unknown = columns - expected
        if missing:
            raise serializers.ValidationError(f"Missing required CSV column: {', '.join(sorted(missing))}.")
        if unknown:
            raise serializers.ValidationError(f"Unrecognised CSV column: {', '.join(sorted(unknown))}.")
        try:
            rows = list(reader)
        except csv.Error as error:
            raise serializers.ValidationError("The CSV could not be read.") from error
        if not rows:
            raise serializers.ValidationError("The CSV has no directory entries.")
        if len(rows) > self.max_rows:
            raise serializers.ValidationError(f"The CSV can contain up to {self.max_rows} entries.")
        return upload

    def validate(self, attrs):
        upload = attrs["csv_file"]
        upload.seek(0)
        reader = csv.DictReader(io.StringIO(upload.read().decode("utf-8-sig")))
        permitted_designations = {value.casefold(): value for value in MemberDirectoryEntry.Designation.values}
        truth_values = {"true": True, "yes": True, "1": True, "false": False, "no": False, "0": False}
        entries = []
        seen = set()

        for row_number, row in enumerate(reader, start=2):
            if not any((value or "").strip() for value in row.values()):
                continue
            name = (row.get("full_name") or "").strip()
            designation = permitted_designations.get((row.get("designation") or "").strip().casefold())
            if not name:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: full_name is required."})
            if len(name) > 255:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: full_name is longer than 255 characters."})
            if not designation:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: designation must be HFIoD, FIoD, MIoD, or AIoD."})
            date_text = (row.get("as_of_date") or "").strip()
            as_of_date = parse_date(date_text) if date_text else attrs["default_as_of_date"]
            if not isinstance(as_of_date, date):
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: as_of_date must use YYYY-MM-DD."})
            publish_text = (row.get("is_published") or "").strip().casefold()
            if publish_text and publish_text not in truth_values:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: is_published must be true or false."})
            is_published = truth_values[publish_text] if publish_text else attrs["default_is_published"]
            sort_text = (row.get("sort_order") or "").strip()
            try:
                sort_order = int(sort_text) if sort_text else len(entries)
            except ValueError as error:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: sort_order must be a whole number."}) from error
            if sort_order < 0:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: sort_order cannot be negative."})
            key = (name.casefold(), designation, as_of_date)
            if key in seen:
                raise serializers.ValidationError({"csv_file": f"Row {row_number}: this member is duplicated in the CSV."})
            seen.add(key)
            entries.append(MemberDirectoryEntry(full_name=name, designation=designation, as_of_date=as_of_date, is_published=is_published, sort_order=sort_order))
        if not entries:
            raise serializers.ValidationError({"csv_file": "The CSV has no directory entries."})
        attrs["entries"] = entries
        return attrs
