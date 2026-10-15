from django.db import migrations
from django.utils import timezone


def add_site_assistant(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    if Page.objects.filter(slug="site-assistant", is_deleted=False).exists():
        return

    page = Page.objects.create(
        path="/assistant",
        slug="site-assistant",
        label="IoD Assist",
        template_key="standard",
        is_system_page=True,
    )
    values = {
        "eyebrow": "IoD Assist",
        "title": "IoD-Gh digital assistant",
        "summary": "Approved answers for common questions from visitors and members.",
        "body": "",
        "canonical_path": "/assistant",
        "seo_title": "IoD Assist | Institute of Directors-Ghana",
        "seo_description": "Approved answers used by the IoD-Gh digital assistant.",
        "robots": "noindex,nofollow",
    }
    section = {
        "slot": "assistant_answers",
        "section_type": "faq",
        "position": 0,
        "is_enabled": True,
        "data": {
            "items": [
                {"id": "membership", "title": "How do I become a member?", "description": "You can review membership categories and submit an application online. The team will guide you through the next steps after your application is received.", "href": "/membership/apply", "metadata": {"link_label": "Apply for membership"}},
                {"id": "training", "title": "Which professional development programmes are available?", "description": "IoD-Gh offers professional development programmes and continuing professional development opportunities for directors and leaders.", "href": "/training", "metadata": {"link_label": "Explore professional development"}},
                {"id": "events", "title": "What events are coming up?", "description": "Our Events page lists current governance conversations, forums and networking opportunities.", "href": "/events", "metadata": {"link_label": "View upcoming events"}},
                {"id": "fees", "title": "Where can I find membership fees?", "description": "Membership categories and the current fee information are available on the Membership pages.", "href": "/membership", "metadata": {"link_label": "Explore membership"}},
                {"id": "resources", "title": "Where can I find governance resources?", "description": "The Knowledge Centre contains IoD-Gh reports, research and practical resources for directors.", "href": "/knowledge", "metadata": {"link_label": "Visit the Knowledge Centre"}},
                {"id": "contact", "title": "How can I contact IoD-Gh?", "description": "You can send an enquiry through our contact page and the team will connect you with the right person.", "href": "/contact", "metadata": {"link_label": "Contact IoD-Gh"}},
            ]
        },
    }
    revision = Revision.objects.create(
        page=page,
        number=1,
        state="published",
        published_at=timezone.now(),
        change_summary="Add IoD Assist knowledge base",
        snapshot={**values, "sections": [section]},
        **values,
    )
    Section.objects.create(revision=revision, **section)
    page.published_revision = revision
    page.save(update_fields=["published_revision"])


class Migration(migrations.Migration):
    dependencies = [("content", "0029_connect_secretariat_profiles")]
    operations = [migrations.RunPython(add_site_assistant, migrations.RunPython.noop)]
