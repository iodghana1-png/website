from django.db import migrations
from django.utils import timezone


def add_member_spotlight_page(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    if Page.objects.filter(path="/member-spotlight", is_deleted=False).exists():
        return

    page = Page.objects.create(
        path="/member-spotlight",
        slug="member-spotlight",
        label="Member spotlight",
        template_key="legacy",
        is_system_page=True,
    )
    values = {
        "eyebrow": "Member spotlight",
        "title": "Celebrating the people who lead.",
        "summary": "Each month, we recognise a member whose leadership, service and commitment strengthen the IoD-Gh community.",
        "body": "",
        "canonical_path": "/member-spotlight",
        "seo_title": "Member Spotlight | Institute of Directors-Ghana",
        "seo_description": "Meet the IoD-Gh members whose leadership, service and contribution inspire our community.",
        "robots": "index,follow",
    }
    spotlight_section = {
        "slot": "member_spotlights",
        "section_type": "profile_gallery",
        "position": 0,
        "is_enabled": True,
        "data": {"heading": "Member spotlight profiles", "items": []},
    }
    revision = Revision.objects.create(
        page=page,
        number=1,
        state="published",
        published_at=timezone.now(),
        change_summary="Add CMS-managed member spotlight page",
        snapshot={**values, "sections": [spotlight_section]},
        **values,
    )
    Section.objects.create(revision=revision, **spotlight_section)
    page.published_revision = revision
    page.save(update_fields=["published_revision"])


class Migration(migrations.Migration):
    dependencies = [("content", "0030_add_site_assistant")]
    operations = [migrations.RunPython(add_member_spotlight_page, migrations.RunPython.noop)]
