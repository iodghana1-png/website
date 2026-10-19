from rest_framework import serializers
from urllib.parse import urlparse

from .models import ContactEnquiry, DocumentRequest


class ContactEnquiryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEnquiry
        fields = ("first_name", "last_name", "email", "phone_number", "enquiry_type", "message")

    def validate_enquiry_type(self, value: str) -> str:
        permitted = {"Membership", "Training", "Governance services", "General enquiry", "Other"}
        if value not in permitted:
            raise serializers.ValidationError("Choose a valid enquiry type.")
        return value


class ContactEnquiryResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEnquiry
        fields = ("id", "status", "created_at")
        read_only_fields = fields


class DocumentRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRequest
        fields = (
            "request_type",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "membership_number",
            "programme",
            "addressee",
            "purpose",
        )


class DocumentRequestResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentRequest
        fields = ("id", "request_type", "status", "created_at")
        read_only_fields = fields


class AnalyticsVisitSerializer(serializers.Serializer):
    path = serializers.CharField(max_length=255)
    referrer = serializers.CharField(max_length=2048, required=False, allow_blank=True)

    def validate_path(self, value: str) -> str:
        if not value.startswith("/") or value.startswith("//") or "?" in value or "#" in value:
            raise serializers.ValidationError("Enter an internal path without a query string or fragment.")
        return value

    def validate_referrer(self, value: str) -> str:
        if not value:
            return ""
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return ""
        return parsed.netloc.lower()
