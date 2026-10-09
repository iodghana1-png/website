"""Create or recover the administrator named by one-time deployment variables."""

from __future__ import annotations

import os

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Create or update one superuser when BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are set."

    def handle(self, *args, **options):
        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")

        if not email and not password:
            self.stdout.write("No bootstrap administrator variables are set; skipping.")
            return
        if not email or not password:
            raise CommandError("Both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be set together.")

        user = User.objects.filter(email__iexact=email).first() or User(email=email)
        try:
            validate_password(password, user=user)
        except ValidationError as error:
            raise CommandError("The bootstrap administrator password does not meet the configured password policy.") from error

        with transaction.atomic():
            existing = User.objects.select_for_update().filter(email__iexact=email).first()
            if existing:
                existing.set_password(password)
                existing.is_staff = True
                existing.is_superuser = True
                existing.is_active = True
                existing.email_verified_at = existing.email_verified_at or timezone.now()
                existing.save(update_fields=["password", "is_staff", "is_superuser", "is_active", "email_verified_at", "updated_at"])
                action = "updated"
            else:
                User.objects.create_superuser(email=email, password=password)
                action = "created"

        self.stdout.write(self.style.SUCCESS(f"Bootstrap administrator {action} for {email}."))
