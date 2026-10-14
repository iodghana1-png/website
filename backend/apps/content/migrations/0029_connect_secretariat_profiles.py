import json
from copy import deepcopy
from pathlib import Path

from django.db import migrations
from django.utils import timezone


def section_snapshot(section):
    return {
        "slot": section.slot,
        "section_type": section.section_type,
        "position": section.position,
        "data": section.data,
        "is_enabled": section.is_enabled,
        "primary_media": str(section.primary_media_id) if section.primary_media_id else None,
    }


def is_placeholder(item):
    if not isinstance(item, dict):
        return True
    metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
    name = str(metadata.get("display_name") or item.get("title") or "").strip().lower()
    return not name or name == "team profile"


def connect_secretariat_profiles(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    profiles = json.loads((Path(__file__).parent / "data" / "secretariat_profiles.json").read_text(encoding="utf-8"))
    page = Page.objects.filter(path="/about/secretariat", is_deleted=False).first()
    if not page:
        page = Page.objects.create(
            path="/about/secretariat",
            slug="about-secretariat",
            label="Secretariat",
            template_key="legacy",
            is_system_page=True,
        )
        values = {
            "eyebrow": "Secretariat",
            "title": "The team behind the Institute.",
            "summary": "Our Secretariat translates purpose into practical programmes, member experience and national influence.",
            "body": "",
            "canonical_path": "/about/secretariat",
            "seo_title": "Secretariat | Institute of Directors-Ghana",
            "seo_description": "Meet the Secretariat of the Institute of Directors-Ghana.",
            "robots": "index,follow",
        }
        section = {
            "slot": "secretariat_profiles",
            "section_type": "profile_gallery",
            "position": 0,
            "is_enabled": True,
            "data": {"items": deepcopy(profiles), "secretariat_profiles_connected": True},
        }
        revision = Revision.objects.create(
            page=page,
            number=1,
            state="published",
            published_at=timezone.now(),
            change_summary="Connect Secretariat profiles to the CMS",
            snapshot={**values, "sections": [section]},
            **values,
        )
        Section.objects.create(revision=revision, **section)
        page.published_revision = revision
        page.save(update_fields=["published_revision"])
        return
    revision_ids = [page.published_revision_id, page.current_draft_revision_id]
    for revision in page.revisions.filter(pk__in=[revision_id for revision_id in revision_ids if revision_id]):
        gallery = revision.sections.filter(section_type="profile_gallery").first()
        if not gallery:
            gallery = Section.objects.create(
                revision=revision,
                slot="secretariat_profiles",
                section_type="profile_gallery",
                position=0,
                is_enabled=True,
                data={},
            )
        data = deepcopy(gallery.data)
        items = data.get("items", [])
        if data.get("secretariat_profiles_connected") or (items and not all(is_placeholder(item) for item in items)):
            continue
        data["items"] = deepcopy(profiles)
        data["secretariat_profiles_connected"] = True
        gallery.data = data
        gallery.save(update_fields=["data"])
        snapshot = deepcopy(revision.snapshot)
        snapshot["sections"] = [
            entry for entry in snapshot.get("sections", [])
            if not (entry.get("slot") == gallery.slot and entry.get("section_type") == "profile_gallery")
        ] + [section_snapshot(gallery)]
        revision.snapshot = snapshot
        revision.save(update_fields=["snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0028_membership_application_cohort")]
    operations = [migrations.RunPython(connect_secretariat_profiles, migrations.RunPython.noop)]
