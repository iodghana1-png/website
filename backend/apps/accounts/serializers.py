from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "phone_number", "is_active", "is_staff", "is_superuser", "email_verified_at", "roles")
        read_only_fields = fields

    def get_roles(self, user) -> list[str]:
        return list(user.groups.values_list("name", flat=True))


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "phone_number", "password")

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    identifier = serializers.CharField(max_length=255, required=False)
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, data):
        identifier = data.get("identifier") or data.get("email")
        if not identifier:
            raise serializers.ValidationError("Email or membership number is required.")
        if "@" not in identifier:
            from apps.membership.models import MemberProfile
            member = MemberProfile.objects.filter(membership_number__iexact=identifier).select_related("user").first()
            identifier = member.user.email if member and member.user else ""
        data["email"] = identifier.strip().lower()
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class EmailChangeRequestSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False, write_only=True)
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        value = value.strip().lower()
        user = self.context["request"].user
        if value == user.email.lower():
            raise serializers.ValidationError("This is already your account email address.")
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email address is already in use.")
        return value


class EmailChangeConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=False, max_length=200)


class EmailTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
