"""Safely import a public Members in Good Standing register from JSON stdin."""

from __future__ import annotations

import json
import sys
from datetime import date
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date

from apps.membership.models import MemberDirectoryEntry


REQUIRED_FIELDS = {"id", "full_name", "designation", "as_of_date", "is_published", "sort_order"}


class Command(BaseCommand):
    help = "Import public member-directory entries only when the target register is empty."

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Confirm that the validated input should be imported.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate JSON input and the empty target register without writing records.",
        )

    def handle(self, *args, **options):
        entries = self._read_entries()
        self._ensure_empty_target()
        self.stdout.write(f"Validated {len(entries)} directory entries; target register is empty.")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("Dry run passed; no directory entries were created."))
            return
        if not options["confirm"]:
            raise CommandError("Pass --confirm to create the validated directory entries.")

        with transaction.atomic():
            self._ensure_empty_target()
            MemberDirectoryEntry.objects.bulk_create(entries, batch_size=200)
            copied = MemberDirectoryEntry.objects.count()
            if copied != len(entries):
                raise CommandError(f"Directory import verification failed: expected {len(entries)}, found {copied}.")

        self.stdout.write(self.style.SUCCESS(f"Imported and verified {len(entries)} directory entries."))

    @staticmethod
    def _ensure_empty_target():
        if MemberDirectoryEntry.objects.exists():
            raise CommandError("The target member directory is not empty; refusing to overwrite it.")

    @staticmethod
    def _read_entries() -> list[MemberDirectoryEntry]:
        try:
            payload = json.load(sys.stdin)
        except json.JSONDecodeError as error:
            raise CommandError(f"Input must be valid JSON: {error.msg}.") from error

        records = payload.get("entries") if isinstance(payload, dict) else None
        if not isinstance(records, list) or not records:
            raise CommandError('Input must be an object with a non-empty "entries" list.')

        permitted_designations = set(MemberDirectoryEntry.Designation.values)
        identifiers: set[UUID] = set()
        entries = []
        for index, record in enumerate(records, start=1):
            if not isinstance(record, dict) or set(record) != REQUIRED_FIELDS:
                raise CommandError(f"Entry {index} must contain exactly: {', '.join(sorted(REQUIRED_FIELDS))}.")
            try:
                identifier = UUID(str(record["id"]))
            except (TypeError, ValueError, AttributeError) as error:
                raise CommandError(f"Entry {index} has an invalid id.") from error
            if identifier in identifiers:
                raise CommandError(f"Entry {index} repeats an earlier id.")
            identifiers.add(identifier)

            full_name = record["full_name"].strip() if isinstance(record["full_name"], str) else ""
            if not full_name:
                raise CommandError(f"Entry {index} must have a member name.")
            if len(full_name) > 255:
                raise CommandError(f"Entry {index} has a member name longer than 255 characters.")
            if record["designation"] not in permitted_designations:
                raise CommandError(f"Entry {index} has an invalid designation.")
            as_of_date = parse_date(str(record["as_of_date"]))
            if not isinstance(as_of_date, date):
                raise CommandError(f"Entry {index} has an invalid as_of_date.")
            if not isinstance(record["is_published"], bool):
                raise CommandError(f"Entry {index} must provide a boolean is_published value.")
            if not isinstance(record["sort_order"], int) or isinstance(record["sort_order"], bool) or record["sort_order"] < 0:
                raise CommandError(f"Entry {index} must provide a non-negative integer sort_order.")

            entries.append(
                MemberDirectoryEntry(
                    id=identifier,
                    full_name=full_name,
                    designation=record["designation"],
                    as_of_date=as_of_date,
                    is_published=record["is_published"],
                    sort_order=record["sort_order"],
                )
            )
        return entries
