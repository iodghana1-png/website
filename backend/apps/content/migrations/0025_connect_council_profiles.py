import json
from copy import deepcopy
from importlib import import_module
from pathlib import Path

from django.db import migrations


def connect_council(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Section = apps.get_model("content", "CMSPageSection")
    page = Page.objects.filter(slug="about-council", is_deleted=False).first()
    if not page:
        return
    defaults = json.loads((Path(__file__).parent / "data" / "council_profiles.json").read_text(encoding="utf-8"))
    copy_key = import_module("apps.content.migrations.0024_connect_event_cards").copy_key
    for revision in page.revisions.filter(pk__in=[page.published_revision_id, page.current_draft_revision_id]):
        copy_section = revision.sections.filter(slot="page_copy").first()
        fields = {field["key"]: field.get("value", "") for field in (copy_section.data.get("fields", []) if copy_section else []) if isinstance(field, dict) and "key" in field}
        galleries = list(revision.sections.filter(section_type="profile_gallery"))
        if not galleries:
            galleries = [Section.objects.create(revision=revision, slot="council_profiles", section_type="profile_gallery", position=0, data={"items": [{"id": str(index), "title": member["name"]} for index, member in enumerate(defaults)]})]
        for gallery in galleries:
            data = deepcopy(gallery.data)
            if data.get("profiles_connected"):
                continue
            for entry in data.get("items", []):
                metadata = entry.setdefault("metadata", {})
                key = entry.get("title", "")
                name = metadata.get("display_name", "")
                member = next((member for member in defaults if key in [member["name"], member["name"] + ", " + member.get("credentials", "")] or name.startswith(member["name"]) or (key == member["role"] and member["role"] != "Council Member")), None)
                if not member:
                    continue
                initial = {
                    "display_name": member["name"],
                    "role": fields.get(copy_key(member["role"]), member["role"]),
                    "summary": fields.get(copy_key(member["summary"]), member["summary"]),
                    "biography": "\n\n".join(fields.get(copy_key(paragraph), paragraph) for paragraph in member["profile"]),
                }
                for field, value in initial.items():
                    if not metadata.get(field):
                        metadata[field] = value
                if member.get("credentials") and not metadata.get("credentials") and member["credentials"] not in metadata["display_name"]:
                    metadata["credentials"] = member.get("credentials", "")
            data["profiles_connected"] = True
            gallery.data = data
            gallery.save(update_fields=["data"])
        snapshot = deepcopy(revision.snapshot)
        snapshot["sections"] = [section for section in snapshot.get("sections", []) if section.get("section_type") != "profile_gallery"] + [{"slot": section.slot, "section_type": section.section_type, "position": section.position, "data": section.data, "is_enabled": section.is_enabled, "primary_media": str(section.primary_media_id) if section.primary_media_id else None} for section in galleries]
        revision.snapshot = snapshot
        revision.save(update_fields=["snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0024_connect_event_cards")]
    operations = [migrations.RunPython(connect_council, migrations.RunPython.noop)]
