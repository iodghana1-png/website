from django.db import migrations
from django.utils import timezone


def add_events_calendar_page(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    Item = apps.get_model("content", "ContentItem")
    # Never replace an existing page, including a draft or a deleted record.
    if Page.objects.filter(path="/events").exists() or Page.objects.filter(slug="events-page").exists():
        return

    page = Page.objects.create(path="/events", slug="events-page", label="Events calendar", template_key="legacy", is_system_page=True)
    items = [{"id": str(item.id), "title": item.title, "description": item.summary, "href": item.href, "image_url": item.image_url, "metadata": item.metadata} for item in Item.objects.filter(section="events", status="published").order_by("sort_order", "created_at")]
    section = {"slot": "event_cards", "section_type": "card_grid", "position": 0, "is_enabled": True, "data": {"heading": "Event cards", "items": items}}
    values = {"eyebrow": "IoD-Gh events", "title": "Where Ghana's director community meets.", "summary": "Events that bring directors together for practical learning, considered debate and meaningful connection.", "body": "", "canonical_path": "/events", "seo_title": "Events | Institute of Directors-Ghana", "seo_description": "Explore events from the Institute of Directors-Ghana.", "robots": "index,follow"}
    revision = Revision.objects.create(page=page, number=1, state="published", published_at=timezone.now(), change_summary="Add the events calendar to the CMS", snapshot={**values, "sections": [section]}, **values)
    Section.objects.create(revision=revision, **section)
    page.published_revision = revision
    page.save(update_fields=["published_revision"])


class Migration(migrations.Migration):
    dependencies = [("content", "0031_add_member_spotlight_page")]
    operations = [migrations.RunPython(add_events_calendar_page, migrations.RunPython.noop)]
