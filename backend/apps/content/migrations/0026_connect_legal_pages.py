import json
from pathlib import Path

from django.db import migrations
from django.utils import timezone


def connect_legal_pages(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    defaults = json.loads((Path(__file__).parent / "data" / "legal_pages.json").read_text(encoding="utf-8"))
    for source in defaults:
        if Page.objects.filter(path=source["path"]).exists() or Page.objects.filter(slug=source["slug"]).exists():
            continue
        page = Page.objects.create(path=source["path"], slug=source["slug"], label=source["label"], template_key="legacy", is_system_page=True)
        section = {"slot": "page_copy", "section_type": "rich_text", "position": 0, "is_enabled": True, "data": {"fields": source["fields"]}}
        values = {"eyebrow": source["eyebrow"], "title": source["title"], "summary": source["summary"], "body": "", "seo_title": source["label"] + " | Institute of Directors-Ghana", "seo_description": source["summary"], "canonical_path": source["path"], "robots": "index,follow"}
        revision = Revision.objects.create(page=page, number=1, state="published", published_at=timezone.now(), change_summary="Connect existing published legal text to the CMS", snapshot={**values, "sections": [section]}, **values)
        Section.objects.create(revision=revision, **section)
        page.published_revision = revision
        page.save(update_fields=["published_revision"])


class Migration(migrations.Migration):
    dependencies = [("content", "0025_connect_council_profiles")]
    operations = [migrations.RunPython(connect_legal_pages, migrations.RunPython.noop)]
