from importlib import import_module

from django.apps import apps
from django.test import TestCase

from .models import CMSPage, CMSPageRevision, CMSPageSection, ContentItem


class CmsEventConnectionTests(TestCase):
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
