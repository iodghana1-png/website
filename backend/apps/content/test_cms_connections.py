from importlib import import_module

from django.apps import apps
from django.test import TestCase

from .models import CMSNavigationMenu, CMSNavigationRevision, CMSNavigationItem, CMSPage, CMSPageRevision, CMSPageSection, ContentItem


class CmsEventConnectionTests(TestCase):
    def test_site_assistant_is_seeded_once_with_editable_answers(self):
        migration = import_module("apps.content.migrations.0030_add_site_assistant")
        migration.add_site_assistant(apps, None)
        page = CMSPage.objects.get(slug="site-assistant")
        section = page.published_revision.sections.get(slot="assistant_answers")
        self.assertEqual(section.section_type, "faq")
        self.assertEqual(section.data["items"][0]["title"], "How do I become a member?")
        self.assertEqual(CMSPage.objects.filter(slug="site-assistant").count(), 1)

    def test_secretariat_profiles_are_seeded_once_and_remain_editable(self):
        migration = import_module("apps.content.migrations.0029_connect_secretariat_profiles")
        page = CMSPage.objects.get(path="/about/secretariat")
        section = page.published_revision.sections.get(section_type="profile_gallery")
        profiles = section.data["items"]
        self.assertEqual([profile["metadata"]["display_name"] for profile in profiles], ["Dr. Alfred Braimah", "Mr. Seyram Kodzo Mankra"])
        self.assertTrue(profiles[0]["metadata"]["biography"])
        profiles[0]["metadata"]["biography"] = "Approved biography"
        section.data["items"] = profiles
        section.save(update_fields=["data"])
        migration.connect_secretariat_profiles(apps, None)
        section.refresh_from_db()
        self.assertEqual(section.data["items"][0]["metadata"]["biography"], "Approved biography")

    def test_membership_application_page_is_registered_without_overwriting_edits(self):
        migration = import_module("apps.content.migrations.0028_membership_application_cohort")
        page = CMSPage.objects.get(path="/membership/apply")
        self.assertEqual(page.template_key, "legacy")
        self.assertTrue(page.is_system_page)
        section = page.published_revision.sections.get(section_type="cohort_availability")
        self.assertEqual(section.data, {})
        section.data = {"spaces": "Full", "next_date": "18 January 2027"}
        section.save()
        migration.connect_application_page(apps, None)
        section.refresh_from_db()
        self.assertEqual(section.data["spaces"], "Full")
        self.assertEqual(CMSPage.objects.filter(path="/membership/apply").count(), 1)

    def test_event_migration_preserves_published_and_private_card_edits(self):
        migration = import_module("apps.content.migrations.0024_connect_event_cards")
        item = ContentItem.objects.create(section="events", title="Original event", summary="Original summary", href="/events/original", status="published")
        page = CMSPage.objects.create(path="/events", slug="events-page", label="Events", template_key="legacy")
        live = CMSPageRevision.objects.create(page=page, number=1, state="published", title="Events")
        draft = CMSPageRevision.objects.create(page=page, number=2, state="draft", title="Events")
        page.published_revision = live
        page.current_draft_revision = draft
        page.save()
        for revision, title in [(live, "Published title"), (draft, "Private title")]:
            CMSPageSection.objects.create(revision=revision, slot="page_copy", section_type="rich_text", data={"fields": [{"key": migration.copy_key(item.title), "value": title}]})
        migration.connect_events(apps, None)
        migration.connect_events(apps, None)
        for revision, title in [(live, "Published title"), (draft, "Private title")]:
            section = revision.sections.get(slot="event_cards")
            self.assertEqual(section.data["items"][0]["title"], title)
            revision.refresh_from_db()
            self.assertEqual(revision.snapshot["sections"][-1]["data"], section.data)
        page.refresh_from_db()
        self.assertEqual(page.published_revision_id, live.id)
        self.assertEqual(page.current_draft_revision_id, draft.id)

    def test_council_migration_keeps_photos_and_populates_existing_copy(self):
        migration = import_module("apps.content.migrations.0025_connect_council_profiles")
        page = CMSPage.objects.create(path="/about/council", slug="about-council", label="Council", template_key="legacy")
        live = CMSPageRevision.objects.create(page=page, number=1, state="published", title="Council")
        page.published_revision = live
        page.save()
        gallery = CMSPageSection.objects.create(revision=live, section_type="profile_gallery", data={"items": [{"title": "President, Institute of Directors-Ghana", "image_url": "/saved-photo.png", "metadata": {"summary": "Saved summary"}}]})
        migration.connect_council(apps, None)
        migration.connect_council(apps, None)
        gallery.refresh_from_db()
        entry = gallery.data["items"][0]
        self.assertEqual(entry["image_url"], "/saved-photo.png")
        self.assertEqual(entry["metadata"]["summary"], "Saved summary")
        self.assertEqual(entry["metadata"]["display_name"], "Mrs. Mary Asare-Yeboah")
        self.assertTrue(entry["metadata"]["biography"])

    def test_legal_pages_are_registered_without_overwriting_existing_edits(self):
        migration = import_module("apps.content.migrations.0026_connect_legal_pages")
        for slug in ["privacy-page", "terms-page"]:
            page = CMSPage.objects.get(slug=slug)
            self.assertIsNotNone(page.published_revision_id)
            self.assertGreater(len(page.published_revision.sections.get(slot="page_copy").data["fields"]), 15)
            page.published_revision.title = "Existing edited heading"
            page.published_revision.save(update_fields=["title"])
        migration.connect_legal_pages(apps, None)
        for slug in ["privacy-page", "terms-page"]:
            self.assertEqual(CMSPage.objects.get(slug=slug).published_revision.title, "Existing edited heading")

    def test_navigation_bootstrap_preserves_private_draft_and_existing_public_menu(self):
        migration = import_module("apps.content.migrations.0027_connect_header_navigation")
        menu = CMSNavigationMenu.objects.get(key="header-primary")
        menu.published_revision = None
        draft = CMSNavigationRevision.objects.create(menu=menu, number=2, state="draft")
        CMSNavigationItem.objects.create(revision=draft, label="Private menu label", href="/private")
        menu.current_draft_revision = draft
        menu.save()
        migration.connect_navigation(apps, None)
        menu.refresh_from_db()
        live_id = menu.published_revision_id
        self.assertEqual(menu.current_draft_revision_id, draft.id)
        self.assertEqual(menu.published_revision.number, 3)
        self.assertTrue(menu.published_revision.items.filter(label="Home", href="/").exists())
        self.assertTrue(menu.published_revision.items.filter(label="Examinations", href="/training/exams", parent__label="Training").exists())
        self.assertFalse(menu.published_revision.items.filter(href="/private").exists())
        response = self.client.get("/api/v2/cms/navigation/header-primary/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Private menu label", response.content.decode())
        self.assertNotIn("current_draft_revision", response.json())
        menu.published_revision.items.filter(href="/").update(label="Edited home")
        migration.connect_navigation(apps, None)
        menu.refresh_from_db()
        self.assertEqual(menu.published_revision_id, live_id)
        self.assertTrue(menu.published_revision.items.filter(label="Edited home").exists())
