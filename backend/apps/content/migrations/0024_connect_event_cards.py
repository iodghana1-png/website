from copy import deepcopy

from django.db import migrations


def copy_key(value):
    result = 2166136261
    for char in value:
        result = ((result ^ ord(char)) * 16777619) & 0xFFFFFFFF
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    encoded = ""
    while result:
        result, remainder = divmod(result, 36)
        encoded = digits[remainder] + encoded
    return encoded or "0"


def connect_events(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Section = apps.get_model("content", "CMSPageSection")
    Item = apps.get_model("content", "ContentItem")
    page = Page.objects.filter(slug="events-page", is_deleted=False).first()
    if not page:
        return
    source = list(Item.objects.filter(section="events", status="published").order_by("sort_order", "created_at"))
    for revision in page.revisions.filter(pk__in=[page.published_revision_id, page.current_draft_revision_id]):
        if revision.sections.filter(slot="event_cards").exists():
            continue
        copy_section = revision.sections.filter(slot="page_copy").first()
        fields = {field["key"]: field.get("value", "") for field in (copy_section.data.get("fields", []) if copy_section else []) if isinstance(field, dict) and "key" in field}
        items = [{
            "id": str(item.id), "title": fields.get(copy_key(item.title), item.title),
            "description": fields.get(copy_key(item.summary), item.summary),
            "href": fields.get(copy_key("link:" + item.href), item.href),
            "image_url": item.image_url, "metadata": item.metadata,
        } for item in source]
        data = {"heading": "Event cards", "items": items}
        Section.objects.create(revision=revision, slot="event_cards", section_type="card_grid", position=0, data=data, is_enabled=True)
        snapshot = deepcopy(revision.snapshot)
        snapshot["sections"] = [*snapshot.get("sections", []), {"slot": "event_cards", "section_type": "card_grid", "position": 0, "data": data, "is_enabled": True, "primary_media": None}]
        revision.snapshot = snapshot
        revision.save(update_fields=["snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0023_merge_history_vision_mission")]
    operations = [migrations.RunPython(connect_events, migrations.RunPython.noop)]
