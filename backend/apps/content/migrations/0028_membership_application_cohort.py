from django.db import migrations, models
from django.utils import timezone


def connect_application_page(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Revision = apps.get_model("content", "CMSPageRevision")
    Section = apps.get_model("content", "CMSPageSection")
    if Page.objects.filter(path="/membership/apply").exists() or Page.objects.filter(slug="membership-apply").exists():
        return
    page = Page.objects.create(
        path="/membership/apply", slug="membership-apply",
        label="Membership application", template_key="legacy", is_system_page=True,
    )
    # Do not seed unverified dates, availability or payment instructions.
    section = {
        "slot": "application_cohort", "section_type": "cohort_availability",
        "position": 0, "is_enabled": True, "data": {},
    }
    values = {
        "eyebrow": "Membership application", "title": "Begin your IoD-Gh journey.",
        "summary": "", "body": "", "canonical_path": "/membership/apply",
        "seo_title": "Membership application | Institute of Directors-Ghana",
        "seo_description": "Apply for IoD-Gh membership.",
        "robots": "index,follow",
    }
    revision = Revision.objects.create(
        page=page, number=1, state="published", published_at=timezone.now(),
        change_summary="Connect post-application cohort availability to the CMS",
        snapshot={**values, "sections": [section]}, **values,
    )
    Section.objects.create(revision=revision, **section)
    page.published_revision = revision
    page.save(update_fields=["published_revision"])


class Migration(migrations.Migration):
    dependencies = [("content", "0027_connect_header_navigation")]
    operations = [
        migrations.AlterField(
            model_name="cmspagesection", name="section_type",
            field=models.CharField(max_length=40, choices=[
                ("gallery", "Gallery"), ("faq", "FAQ"), ("hero", "Hero"),
                ("rich_text", "Rich text"), ("callout", "Callout"),
                ("stat_grid", "Statistics"), ("card_grid", "Card grid"),
                ("feature_list", "Feature list"), ("quote", "Quote"),
                ("image", "Image"), ("image_with_copy", "Image with copy"),
                ("document_list", "Document list"), ("seminar_list", "Seminar list"),
                ("video_list", "Video list"), ("training_countdown", "Next training countdown"),
                ("cohort_availability", "Application cohort availability"),
                ("article_feed", "Article feed"), ("event_feed", "Event feed"),
                ("cta_banner", "CTA banner"), ("member_directory", "Member directory"),
                ("contact_details", "Contact details"), ("partner_logos", "Partner logos"),
                ("profile_gallery", "Profile photos"), ("exam_assessment", "Assessment questions"),
            ]),
        ),
        migrations.RunPython(connect_application_page, migrations.RunPython.noop),
    ]
