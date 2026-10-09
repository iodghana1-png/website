"""Copy the local CMS dataset and its media into an empty deployment database.

This is intentionally a narrowly-scoped operational command, not a general
database synchronisation tool.  It preserves CMS UUIDs and relationships,
omits local staff-account references, and refuses to replace a target that
contains anything beyond the initial homepage seed.
"""

from __future__ import annotations

import os
from pathlib import Path

import dj_database_url
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction
from storages.backends.s3 import S3Storage

from apps.content.models import (
    CMSArticle,
    CMSArticleRevision,
    CMSCategory,
    CMSMediaAsset,
    CMSNavigationItem,
    CMSNavigationMenu,
    CMSNavigationRevision,
    CMSPage,
    CMSPageRevision,
    CMSPageSection,
    CMSSiteSettings,
    CMSSiteSettingsRevision,
    ContentItem,
    ContentPage,
)


TARGET = "cms_migration_target"
USER_FIELDS = {"uploaded_by", "created_by", "updated_by"}
CONTENT_MODELS = (
    CMSMediaAsset,
    CMSPage,
    CMSPageRevision,
    CMSPageSection,
    CMSCategory,
    CMSArticle,
    CMSArticleRevision,
    CMSNavigationMenu,
    CMSNavigationRevision,
    CMSNavigationItem,
    CMSSiteSettings,
    CMSSiteSettingsRevision,
    ContentPage,
    ContentItem,
)


class Command(BaseCommand):
    help = "Migrate a local CMS dataset and files into an empty Railway CMS deployment."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace-starter",
            action="store_true",
            help="Replace only the untouched one-page starter CMS dataset in the target.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate the source and target without copying records or files.",
        )

    def handle(self, *args, **options):
        self._configure_target_database()
        source_assets = list(CMSMediaAsset.objects.order_by("id"))
        self._validate_source_media(source_assets)
        target_counts = self._target_counts()
        target_has_starter = target_counts["CMSPage"] > 0
        target_has_content = any(target_counts.values())

        if target_has_content and not self._is_initial_starter(target_counts):
            raise CommandError(
                "Target CMS is not empty or an untouched starter dataset; refusing to overwrite it."
            )
        if target_has_starter and not options["replace_starter"]:
            raise CommandError(
                "Target has the initial starter page. Re-run with --replace-starter after reviewing it."
            )

        source_counts = {model.__name__: model.objects.count() for model in CONTENT_MODELS}
        self.stdout.write(f"Source CMS records: {source_counts}")
        self.stdout.write(f"Target CMS records before migration: {target_counts}")
        self.stdout.write(f"Validated {len(source_assets)} local CMS file(s).")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("Dry run passed; no target records or files were changed."))
            return

        storage = self._target_storage()
        copied_files, existing_files = self._copy_media_files(storage, source_assets)
        self.stdout.write(f"Media copied: {copied_files}; already present: {existing_files}.")

        with transaction.atomic(using=TARGET):
            if target_has_starter:
                self._clear_starter()
            self._copy_records()

        self._verify_target(storage, source_assets, source_counts)
        self.stdout.write(self.style.SUCCESS("CMS migration completed and verified."))

    def _configure_target_database(self):
        database_url = os.getenv("CMS_MIGRATION_TARGET_DATABASE_URL")
        if not database_url:
            raise CommandError("CMS_MIGRATION_TARGET_DATABASE_URL is required.")
        target_database = dj_database_url.parse(
            database_url,
            conn_max_age=0,
            conn_health_checks=True,
        )
        # ``dj_database_url.parse`` returns only connection-specific values.
        # Let Django populate the standard connection defaults (OPTIONS,
        # TIME_ZONE, TEST, etc.) before registering the extra alias.
        configured = connections.configure_settings({**connections.databases, TARGET: target_database})
        connections.databases[TARGET] = configured[TARGET]

    @staticmethod
    def _target_counts():
        return {model.__name__: model.objects.using(TARGET).count() for model in CONTENT_MODELS}

    @staticmethod
    def _is_initial_starter(counts: dict[str, int]) -> bool:
        return counts == {
            "CMSMediaAsset": 0,
            "CMSPage": 1,
            "CMSPageRevision": 1,
            "CMSPageSection": 7,
            "CMSCategory": 0,
            "CMSArticle": 0,
            "CMSArticleRevision": 0,
            "CMSNavigationMenu": 0,
            "CMSNavigationRevision": 0,
            "CMSNavigationItem": 0,
            "CMSSiteSettings": 0,
            "CMSSiteSettingsRevision": 0,
            "ContentPage": 0,
            "ContentItem": 0,
        }

    def _validate_source_media(self, assets: list[CMSMediaAsset]):
        media_root = Path(settings.MEDIA_ROOT).resolve()
        for asset in assets:
            if not asset.file.name:
                raise CommandError(f"CMS media asset {asset.pk} has no file path.")
            source_path = (media_root / asset.file.name).resolve()
            if not source_path.is_relative_to(media_root) or not source_path.is_file():
                raise CommandError(f"CMS media file is missing: {asset.file.name}")

    @staticmethod
    def _target_storage() -> S3Storage:
        required = {
            "endpoint_url": os.getenv("CMS_MIGRATION_TARGET_S3_ENDPOINT"),
            "access_key": os.getenv("CMS_MIGRATION_TARGET_S3_ACCESS_KEY_ID"),
            "secret_key": os.getenv("CMS_MIGRATION_TARGET_S3_SECRET_ACCESS_KEY"),
            "bucket_name": os.getenv("CMS_MIGRATION_TARGET_S3_BUCKET_NAME"),
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise CommandError(f"Missing target object-storage settings: {', '.join(missing)}")
        return S3Storage(
            **required,
            region_name=os.getenv("CMS_MIGRATION_TARGET_S3_REGION", "auto"),
            addressing_style="virtual",
            file_overwrite=True,
            querystring_auth=True,
        )

    def _copy_media_files(self, storage: S3Storage, assets: list[CMSMediaAsset]) -> tuple[int, int]:
        copied = 0
        existing = 0
        media_root = Path(settings.MEDIA_ROOT).resolve()
        for asset in assets:
            name = asset.file.name
            if storage.exists(name):
                existing += 1
                continue
            with (media_root / name).open("rb") as source_file:
                saved_name = storage.save(name, File(source_file, name=name))
            if saved_name != name or not storage.exists(name):
                raise CommandError(f"Could not verify uploaded media file: {name}")
            copied += 1
        return copied, existing

    def _clear_starter(self):
        # Deleting the parent models lets Django remove their related revisions,
        # sections and many-to-many rows in the correct order.
        CMSNavigationMenu.objects.using(TARGET).all().delete()
        CMSArticle.objects.using(TARGET).all().delete()
        CMSPage.objects.using(TARGET).all().delete()
        CMSSiteSettings.objects.using(TARGET).all().delete()
        ContentPage.objects.using(TARGET).all().delete()
        ContentItem.objects.using(TARGET).all().delete()
        CMSMediaAsset.objects.using(TARGET).all().delete()
        CMSCategory.objects.using(TARGET).all().delete()

    @staticmethod
    def _copy_model(model, *, excluded: set[str] | None = None):
        excluded = excluded or set()
        copies = []
        for source in model.objects.order_by("pk"):
            values = {}
            for field in model._meta.concrete_fields:
                if field.name in USER_FIELDS or field.name in excluded:
                    values[field.attname] = None
                    continue
                value = getattr(source, field.attname)
                if field.name == "file" and value:
                    value = value.name
                values[field.attname] = value
            copies.append(model(**values))
        model.objects.using(TARGET).bulk_create(copies, batch_size=200)

    def _copy_records(self):
        self._copy_model(CMSMediaAsset)
        self._copy_model(CMSCategory)
        self._copy_model(CMSPage, excluded={"published_revision", "current_draft_revision"})
        self._copy_model(CMSPageRevision)
        self._restore_revision_pointers(CMSPage, CMSPageRevision)
        self._copy_model(CMSPageSection)

        self._copy_model(CMSArticle, excluded={"published_revision", "current_draft_revision"})
        self._copy_model(CMSArticleRevision)
        self._restore_revision_pointers(CMSArticle, CMSArticleRevision)
        self._copy_article_galleries()

        self._copy_model(CMSNavigationMenu, excluded={"published_revision", "current_draft_revision"})
        self._copy_model(CMSNavigationRevision)
        self._restore_revision_pointers(CMSNavigationMenu, CMSNavigationRevision)
        self._copy_navigation_items()

        self._copy_model(CMSSiteSettings, excluded={"published_revision", "current_draft_revision"})
        self._copy_model(CMSSiteSettingsRevision)
        self._restore_revision_pointers(CMSSiteSettings, CMSSiteSettingsRevision)
        self._copy_model(ContentPage)
        self._copy_model(ContentItem)

    @staticmethod
    def _restore_revision_pointers(parent_model, revision_model):
        for source in parent_model.objects.order_by("pk"):
            parent_model.objects.using(TARGET).filter(pk=source.pk).update(
                published_revision_id=source.published_revision_id,
                current_draft_revision_id=source.current_draft_revision_id,
            )

    @staticmethod
    def _copy_article_galleries():
        for source in CMSArticleRevision.objects.prefetch_related("gallery_media").order_by("pk"):
            target = CMSArticleRevision.objects.using(TARGET).get(pk=source.pk)
            target.gallery_media.set([asset.pk for asset in source.gallery_media.all()])

    @staticmethod
    def _copy_navigation_items():
        Command._copy_model(CMSNavigationItem, excluded={"parent"})
        for source in CMSNavigationItem.objects.order_by("pk"):
            if source.parent_id:
                CMSNavigationItem.objects.using(TARGET).filter(pk=source.pk).update(parent_id=source.parent_id)

    def _verify_target(self, storage: S3Storage, assets: list[CMSMediaAsset], source_counts: dict[str, int]):
        target_counts = self._target_counts()
        if target_counts != source_counts:
            raise CommandError(f"Target record counts do not match the source: {target_counts}")
        missing = [asset.file.name for asset in assets if not storage.exists(asset.file.name)]
        if missing:
            raise CommandError(f"Target bucket is missing {len(missing)} CMS file(s).")
