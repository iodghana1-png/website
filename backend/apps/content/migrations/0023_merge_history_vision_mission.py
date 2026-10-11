from django.db import migrations


COMBINED_EYEBROW = "Our story, vision & mission"
COMBINED_SUMMARY = "The history, direction and purpose that continue to guide IoD-Gh and the practice of corporate governance in Ghana."
VISION_FIELD_KEYS = {
    "1faozpw", "zx0ssx", "u5rghr", "dut6s2", "1wwt70r", "15i07cq",
    "9ns3o6", "w9zk6j", "1cpxn54", "1fhofi", "ossdbl", "x8irf7",
    "t3xhzw", "sr1nna",
}


def merge_history_vision_and_mission(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Section = apps.get_model("content", "CMSPageSection")

    history = Page.objects.filter(slug="about-history", is_deleted=False).first()
    vision = Page.objects.filter(slug="about-vision-mission", is_deleted=False).first()
    if not history:
        return

    source_revision = vision.published_revision if vision else None
    source_section = Section.objects.filter(revision=source_revision, slot="page_copy").first() if source_revision else None
    source_fields = []
    if source_section:
        source_data = source_section.data.get("fields", [])
        if isinstance(source_data, list):
            source_fields = [
                dict(field)
                for field in source_data
                if isinstance(field, dict) and field.get("key") in VISION_FIELD_KEYS
            ]

    for revision in history.revisions.all():
        revision.eyebrow = COMBINED_EYEBROW
        revision.summary = COMBINED_SUMMARY
        revision.seo_description = COMBINED_SUMMARY

        target_section = Section.objects.filter(revision=revision, slot="page_copy").first()
        if target_section and source_fields:
            data = dict(target_section.data)
            target_data = data.get("fields", [])
            fields = [dict(field) for field in target_data if isinstance(field, dict)] if isinstance(target_data, list) else []
            known_keys = {field.get("key") for field in fields}
            added_fields = [field for field in source_fields if field.get("key") not in known_keys]
            if added_fields:
                data["fields"] = [*fields, *added_fields]
                target_section.data = data
                target_section.save(update_fields=["data"])

        snapshot = dict(revision.snapshot)
        snapshot["eyebrow"] = revision.eyebrow
        snapshot["summary"] = revision.summary
        snapshot["seo_description"] = revision.seo_description
        if target_section:
            snapshot["sections"] = [
                section for section in snapshot.get("sections", [])
                if section.get("slot") != "page_copy"
            ] + [{
                "slot": "page_copy",
                "section_type": target_section.section_type,
                "position": target_section.position,
                "data": target_section.data,
                "is_enabled": target_section.is_enabled,
            }]
        revision.snapshot = snapshot
        revision.save(update_fields=["eyebrow", "summary", "seo_description", "snapshot"])

    history.label = "Our history, vision & mission"
    history.save(update_fields=["label"])

    # Retain the previous page and its revision history in the database, but
    # remove the duplicate standalone page from public and CMS listings.
    if vision:
        vision.is_deleted = True
        vision.save(update_fields=["is_deleted"])


class Migration(migrations.Migration):
    dependencies = [("content", "0022_add_footer_utility_links")]

    operations = [migrations.RunPython(merge_history_vision_and_mission, migrations.RunPython.noop)]
