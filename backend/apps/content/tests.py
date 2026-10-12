import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.contrib.auth.models import Group
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog

from .models import CMSPage, ContentItem


class ContentItemApiTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            "content-staff@example.com",
            "Secure-pass-123!",
            is_staff=True,
            email_verified_at=timezone.now(),
        )
        self.additional_staff = User.objects.create_user(
            "additional-staff@example.com",
            "Secure-pass-123!",
            is_staff=True,
            email_verified_at=timezone.now(),
        )
        self.regular_user = User.objects.create_user(
            "member@example.com",
            "Secure-pass-123!",
            email_verified_at=timezone.now(),
        )
        self.staff.groups.add(Group.objects.get(name="Content Manager"))
        self.additional_staff.groups.add(Group.objects.get(name="Content Manager"))

    def csrf_client(self, user):
        client = Client(enforce_csrf_checks=True)
        client.get("/api/v1/auth/csrf/")
        client.defaults["HTTP_X_CSRFTOKEN"] = client.cookies["csrftoken"].value
        client.force_login(user)
        return client

    def test_public_items_are_published_only_and_ordered_within_a_section(self):
        ContentItem.objects.create(
            section=ContentItem.Section.HERO,
            title="Second slide",
            sort_order=20,
            status=ContentItem.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        ContentItem.objects.create(
            section=ContentItem.Section.HERO,
            title="First slide",
            sort_order=10,
            status=ContentItem.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        ContentItem.objects.create(
            section=ContentItem.Section.HERO,
            title="Hidden draft",
            sort_order=0,
        )
        ContentItem.objects.create(
            section=ContentItem.Section.NEWS,
            title="News item",
            status=ContentItem.Status.PUBLISHED,
            published_at=timezone.now(),
        )

        response = self.client.get("/api/v1/content/items/", {"section": "hero"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["title"] for item in response.json()], ["First slide", "Second slide"])
        self.assertEqual({item["section"] for item in response.json()}, {ContentItem.Section.HERO})
        self.assertEqual(self.client.get("/api/v1/content/items/").status_code, 400)
        self.assertEqual(self.client.get("/api/v1/content/items/", {"section": "not-a-section"}).status_code, 400)

    def test_staff_can_create_publish_and_delete_a_content_item(self):
        client = self.csrf_client(self.staff)
        payload = {
            "section": ContentItem.Section.MEMBERSHIP,
            "title": "Become a member",
            "summary": "Join Ghana's leading directors' community.",
            "href": "/membership/apply",
            "metadata": {"cta_label": "Apply now", "eyebrow": "Membership"},
            "image_url": "/images/membership-card.jpg",
            "sort_order": 3,
            "status": ContentItem.Status.DRAFT,
        }

        created = client.post("/api/v1/content/staff/items/", data=json.dumps(payload), content_type="application/json")

        self.assertEqual(created.status_code, 201)
        created_payload = created.json()
        self.assertEqual(created_payload["status"], ContentItem.Status.DRAFT)
        self.assertIsNone(created_payload["published_at"])
        self.assertEqual(created_payload["updated_by_email"], self.staff.email)
        item_id = created_payload["id"]

        published = client.patch(
            f"/api/v1/content/staff/items/{item_id}/",
            data=json.dumps({"status": ContentItem.Status.PUBLISHED, "sort_order": 1}),
            content_type="application/json",
        )

        self.assertEqual(published.status_code, 200)
        self.assertEqual(published.json()["status"], ContentItem.Status.PUBLISHED)
        self.assertIsNotNone(published.json()["published_at"])
        self.assertEqual(
            self.client.get("/api/v1/content/items/", {"section": "membership"}).json()[0]["id"],
            item_id,
        )
        self.assertEqual(client.get("/api/v1/content/staff/items/", {"section": "membership"}).status_code, 200)

        deleted = client.delete(f"/api/v1/content/staff/items/{item_id}/")

        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(ContentItem.objects.filter(pk=item_id).exists())
        self.assertTrue(AuditLog.objects.filter(action="content.item_created").exists())
        self.assertTrue(AuditLog.objects.filter(action="content.item_updated").exists())
        self.assertTrue(AuditLog.objects.filter(action="content.item_deleted").exists())

    def test_content_managers_can_manage_items_but_regular_users_cannot(self):
        manager_client = self.csrf_client(self.additional_staff)
        item = ContentItem.objects.create(section=ContentItem.Section.TRAINING, title="Board training")

        manager_response = manager_client.patch(
            f"/api/v1/content/staff/items/{item.id}/",
            data=json.dumps({"summary": "Practical director development."}),
            content_type="application/json",
        )
        regular_response = self.csrf_client(self.regular_user).get("/api/v1/content/staff/items/")

        self.assertEqual(manager_response.status_code, 200)
        self.assertEqual(manager_response.json()["summary"], "Practical director development.")
        self.assertEqual(regular_response.status_code, 403)

    def test_metadata_must_be_a_json_object(self):
        response = self.csrf_client(self.staff).post(
            "/api/v1/content/staff/items/",
            data=json.dumps({"section": ContentItem.Section.PARTNERS, "title": "Partner", "metadata": ["not", "an", "object"]}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)


class RevisionedCMSApiTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            "cms-admin@example.com",
            "Secure-pass-123!",
            is_staff=True,
            email_verified_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            "cms-member@example.com",
            "Secure-pass-123!",
            email_verified_at=timezone.now(),
        )
        self.staff.groups.add(Group.objects.get(name="Content Manager"))

    def csrf_client(self, user):
        client = Client(enforce_csrf_checks=True)
        client.get("/api/v1/auth/csrf/")
        client.defaults["HTTP_X_CSRFTOKEN"] = client.cookies["csrftoken"].value
        client.force_login(user)
        return client

    def page_payload(self, **overrides):
        payload = {
            "label": "About IoD-Gh",
            "path": "/about-us",
            "slug": "about-us",
            "template_key": "standard",
            "eyebrow": "The Institute",
            "title": "About the Institute",
            "summary": "Better directors, better organisations.",
            "body": "IoD-Gh promotes good governance.",
            "seo_title": "About IoD-Gh",
            "seo_description": "Learn about the Institute of Directors-Ghana.",
            "sections": [{"slot": "main", "section_type": "rich_text", "position": 0, "data": {"heading": "Our purpose"}}],
            "change_summary": "Initial draft",
        }
        payload.update(overrides)
        return payload

    def test_drafts_are_private_until_staff_publishes_them_and_old_live_revision_stays_live(self):
        client = self.csrf_client(self.staff)
        created = client.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload()), content_type="application/json")

        self.assertEqual(created.status_code, 201)
        page_id = created.json()["id"]
        self.assertEqual(created.json()["current_draft_revision"]["number"], 1)
        self.assertEqual(self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).status_code, 404)

        published = client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/1/publish/")
        self.assertEqual(published.status_code, 200)
        public_before = self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"})
        self.assertEqual(public_before.status_code, 200)
        self.assertEqual(public_before.json()["revision"]["title"], "About the Institute")

        revised_payload = self.page_payload(title="About IoD-Gh today", change_summary="Refresh page copy")
        saved_draft = client.post(f"/api/v2/cms/staff/pages/{page_id}/drafts/", data=json.dumps(revised_payload), content_type="application/json")
        self.assertEqual(saved_draft.status_code, 201)
        self.assertEqual(saved_draft.json()["number"], 2)
        self.assertEqual(self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).json()["revision"]["title"], "About the Institute")

        self.assertEqual(client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/2/publish/").status_code, 200)
        self.assertEqual(self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).json()["revision"]["title"], "About IoD-Gh today")
        self.assertEqual(CMSPage.objects.get(pk=page_id).revisions.count(), 2)

    def test_section_visibility_survives_draft_preview_publish_and_restore(self):
        client = self.csrf_client(self.staff)
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload()), content_type="application/json").json()
        page_id = page["id"]
        self.assertEqual(client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/1/publish/").status_code, 200)
        layout = {
            "slot": "page_layout", "section_type": "rich_text", "position": 1,
            "data": {"visibility": {"hero": "hidden", "body": "removed"}}, "is_enabled": True,
        }
        payload = self.page_payload(sections=[self.page_payload()["sections"][0], layout], base_revision_number=1)
        saved = client.post(f"/api/v2/cms/staff/pages/{page_id}/drafts/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(saved.status_code, 201)
        self.assertEqual(saved.json()["sections"][1]["data"], layout["data"])
        live = self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).json()["revision"]
        self.assertEqual(len(live["sections"]), 1, "Saving visibility must not publish it")
        preview = client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/2/preview/").json()
        private = client.get(f'/api/v2/cms/pages/preview/{preview["revision"]["id"]}/', {"token": preview["token"]})
        self.assertEqual(private.status_code, 200)
        self.assertEqual(private.json()["revision"]["sections"][1]["data"], layout["data"])
        self.assertEqual(client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/2/publish/").status_code, 200)
        live = self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).json()["revision"]
        self.assertEqual(live["sections"][1]["data"], layout["data"])
        self.assertEqual(live["body"], payload["body"], "Removing built-in sections must preserve their saved content")
        layout["data"]["visibility"] = {"hero": "visible", "body": "visible"}
        payload["base_revision_number"] = 2
        restored = client.post(f"/api/v2/cms/staff/pages/{page_id}/drafts/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(restored.status_code, 201)
        self.assertEqual(client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/3/publish/").status_code, 200)
        live = self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).json()["revision"]
        self.assertEqual(live["sections"][1]["data"], layout["data"])

    def test_staff_can_remove_a_page_but_not_a_protected_system_page(self):
        client = self.csrf_client(self.staff)
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload()), content_type="application/json").json()
        page_id = page["id"]
        self.assertEqual(client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/1/publish/").status_code, 200)

        self.assertEqual(client.delete(f"/api/v2/cms/staff/pages/{page_id}/").status_code, 204)
        self.assertTrue(CMSPage.objects.get(pk=page_id).is_deleted)
        self.assertEqual(self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).status_code, 404)
        self.assertNotIn(page_id, [page["id"] for page in client.get("/api/v2/cms/staff/pages/").json()])
        self.assertTrue(AuditLog.objects.filter(action="cms.page_deleted").exists())

        protected = CMSPage.objects.create(path="/protected", slug="protected", label="Protected", is_system_page=True)
        self.assertEqual(client.delete(f"/api/v2/cms/staff/pages/{protected.id}/").status_code, 400)
        protected.refresh_from_db()
        self.assertFalse(protected.is_deleted)

    def test_content_manager_has_access_but_member_does_not(self):
        member_response = self.csrf_client(self.member).get("/api/v2/cms/staff/pages/")
        staff_response = self.csrf_client(self.staff).get("/api/v2/cms/staff/pages/")

        self.assertEqual(member_response.status_code, 403)
        self.assertEqual(staff_response.status_code, 200)

    def test_every_admin_can_edit_and_publish_regardless_of_role(self):
        manager = self.csrf_client(self.staff)
        created = manager.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload(path="/training/example", slug="training-example")), content_type="application/json").json()
        page_id = created["id"]
        for role in ["Super Admin", "Content Manager", "Training Officer", "Membership Officer", "Finance", "Read Only", None]:
            user = User.objects.create_user(str(role).replace(" ", "") + "@example.com", "Test-pass-123!", is_staff=True)
            if role:
                user.groups.add(Group.objects.get(name=role))
            client = self.csrf_client(user)
            access = client.get("/api/v2/cms/staff/access/")
            self.assertEqual(access.status_code, 200, role)
            self.assertTrue(access.json()["manage"], role)
            self.assertEqual(client.post(f"/api/v2/cms/staff/pages/{page_id}/revisions/1/publish/").status_code, 200, role)
            response = client.post("/api/v2/cms/staff/settings/drafts/", data=json.dumps({"data": {"website_name": "Example"}}), content_type="application/json")
            self.assertEqual(response.status_code, 201, role)

    def test_named_roles_do_not_grant_cms_access_to_non_admin_accounts(self):
        self.member.groups.add(Group.objects.get(name="Content Manager"))
        client = self.csrf_client(self.member)
        self.assertEqual(client.get("/api/v2/cms/staff/pages/").status_code, 403)
        self.assertEqual(client.post("/api/v1/content/staff/items/", data=json.dumps({"section": "membership", "title": "Not allowed"}), content_type="application/json").status_code, 403)

    def test_preview_does_not_publish_and_tokens_are_required(self):
        client = self.csrf_client(self.staff)
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload()), content_type="application/json").json()
        preview = client.post(f'/api/v2/cms/staff/pages/{page["id"]}/revisions/1/preview/').json()
        url = f'/api/v2/cms/pages/preview/{preview["revision"]["id"]}/'
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get(url, {"token": preview["token"]}).status_code, 200)
        self.assertEqual(self.client.get("/api/v2/cms/pages/resolve/", {"path": "/about-us"}).status_code, 404)

    def test_rich_text_and_links_are_safe(self):
        client = self.csrf_client(self.staff)
        payload = self.page_payload(body='<p><strong>Safe</strong><img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a></p>')
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(payload), content_type="application/json").json()
        body = page["current_draft_revision"]["body"]
        self.assertIn("<strong>Safe</strong>", body)
        self.assertNotIn("onerror", body)
        self.assertNotIn("javascript:", body)
        from .cms_serializers import CMSNavigationDraftSerializer
        serializer = CMSNavigationDraftSerializer(data={"items": [{"label": "Unsafe", "link_type": "external", "href": "javascript:alert(1)"}]})
        self.assertFalse(serializer.is_valid())

    def test_page_links_normalize_a_bare_domain(self):
        client = self.csrf_client(self.staff)
        payload = self.page_payload(sections=[{"slot": "main", "section_type": "partner_logos", "position": 0, "data": {"items": [{"title": "Example partner", "href": "partner.example", "image_url": "/images/partner.png"}]}}])
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(payload), content_type="application/json").json()
        link = page["current_draft_revision"]["sections"][0]["data"]["items"][0]["href"]
        self.assertEqual(link, "https://partner.example")

    def test_staff_without_a_content_role_can_edit(self):
        self.member.is_staff = True
        self.member.save()
        response = self.csrf_client(self.member).post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload()), content_type="application/json")
        self.assertEqual(response.status_code, 201)

    def test_navigation_preserves_nesting_and_never_exposes_drafts(self):
        client = self.csrf_client(self.staff)
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload()), content_type="application/json").json()
        created = client.post("/api/v2/cms/staff/navigation/menus/", data=json.dumps({"key": "test-header", "label": "Header"}), content_type="application/json")
        self.assertEqual(created.status_code, 201)
        menu_id = created.json()["id"]
        url = f"/api/v2/cms/staff/navigation/menus/{menu_id}"
        data = {"items": [
            {"label": "About", "href": "/about", "link_type": "internal"},
            {"label": "Institute", "page": page["id"], "link_type": "page", "parent_index": 0, "open_in_new_tab": True},
        ]}
        draft = client.post(url + "/drafts/", data=json.dumps(data), content_type="application/json")
        self.assertEqual(draft.status_code, 201)
        number = draft.json()["current_draft_revision"]["number"]
        self.assertEqual(client.post(url + f"/revisions/{number}/publish/").status_code, 200)
        public_url = "/api/v2/cms/navigation/test-header/"
        public = self.client.get(public_url).json()
        parent, child = public["published_revision"]["items"]
        self.assertEqual(child["parent_id"], parent["id"])
        self.assertEqual(child["href"], "/about-us")
        self.assertTrue(child["open_in_new_tab"])
        data["items"][0]["label"] = "Private navigation draft"
        self.assertEqual(client.post(url + "/drafts/", data=json.dumps(data), content_type="application/json").status_code, 201)
        response = self.client.get(public_url)
        self.assertNotIn("current_draft_revision", response.json())
        self.assertNotContains(response, "Private navigation draft")

    def test_archiving_media_preserves_existing_page_references(self):
        from .models import CMSMediaAsset
        asset = CMSMediaAsset.objects.create(file="cms/existing-photo.png", original_filename="Existing photo", kind="image", mime_type="image/png")
        client = self.csrf_client(self.staff)
        response = client.patch(f"/api/v2/cms/staff/media/{asset.id}/", data=json.dumps({"status": "archived"}), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        asset.refresh_from_db()
        self.assertEqual(asset.file.name, "cms/existing-photo.png")
        payload = self.page_payload(social_image=str(asset.id), sections=[{"slot": "hero_image", "section_type": "image", "position": 0, "primary_media": str(asset.id)}])
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(page.status_code, 201)
        self.assertEqual(page.json()["current_draft_revision"]["sections"][0]["primary_media"]["id"], str(asset.id))

    def test_staff_can_permanently_delete_unused_media_and_its_file(self):
        from .models import CMSMediaAsset

        client = self.csrf_client(self.staff)
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            asset = CMSMediaAsset.objects.create(
                file=SimpleUploadedFile("unused.png", b"unused image", content_type="image/png"),
                original_filename="unused.png",
                mime_type="image/png",
                kind="image",
            )
            file_path = Path(asset.file.path)
            self.assertTrue(file_path.exists())

            response = client.delete(f"/api/v2/cms/staff/media/{asset.id}/")

            self.assertEqual(response.status_code, 204)
            self.assertFalse(CMSMediaAsset.objects.filter(pk=asset.id).exists())
            self.assertFalse(file_path.exists())
        self.assertTrue(AuditLog.objects.filter(action="cms.media_permanently_deleted").exists())

    def test_permanent_media_delete_refuses_any_cms_reference(self):
        from .models import CMSMediaAsset, CMSSiteSettings, CMSSiteSettingsRevision

        client = self.csrf_client(self.staff)
        asset = CMSMediaAsset.objects.create(file="cms/site-logo.png", original_filename="Site logo", mime_type="image/png", kind="image")
        page = client.post("/api/v2/cms/staff/pages/", data=json.dumps(self.page_payload(sections=[{"slot": "hero_image", "section_type": "image", "position": 0, "primary_media": str(asset.id)}])), content_type="application/json").json()
        direct_reference = client.delete(f"/api/v2/cms/staff/media/{asset.id}/")
        self.assertEqual(direct_reference.status_code, 400)
        self.assertIn("page section", str(direct_reference.json()))
        self.assertTrue(CMSMediaAsset.objects.filter(pk=asset.id).exists())

        # Remove the direct revision so the test also covers CMS settings JSON,
        # where footer and header logos are stored.
        CMSPage.objects.get(pk=page["id"]).delete()
        settings = CMSSiteSettings.objects.create(key="media-delete-test")
        CMSSiteSettingsRevision.objects.create(settings=settings, number=1, data={"footer": {"logo_id": str(asset.id)}})
        settings_reference = client.delete(f"/api/v2/cms/staff/media/{asset.id}/")
        self.assertEqual(settings_reference.status_code, 400)
        self.assertIn("site settings", str(settings_reference.json()))
        self.assertTrue(CMSMediaAsset.objects.filter(pk=asset.id).exists())

    def test_news_is_private_until_published(self):
        client = self.csrf_client(self.staff)
        payload = {"slug": "new-governance-news", "content_type": "news", "title": "Governance news", "body": "<p>Article content</p>"}
        response = client.post("/api/v2/cms/staff/articles/", data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        article = response.json()
        public_url = "/api/v2/cms/articles/new-governance-news/"
        self.assertEqual(self.client.get(public_url).status_code, 404)
        self.assertEqual(client.post(f'/api/v2/cms/staff/articles/{article["id"]}/revisions/1/publish/').status_code, 200)
        self.assertEqual(self.client.get(public_url).json()["revision"]["title"], "Governance news")
        payload["title"] = "Private news draft"
        self.assertEqual(client.post(f'/api/v2/cms/staff/articles/{article["id"]}/drafts/', data=json.dumps(payload), content_type="application/json").status_code, 201)
        self.assertNotContains(self.client.get(public_url), "Private news draft")

    def test_news_gallery_images_are_saved_with_the_revision(self):
        from .models import CMSMediaAsset

        image = CMSMediaAsset.objects.create(file="cms/news-gallery.jpg", original_filename="News gallery", mime_type="image/jpeg", kind="image", alt_text="Directors at an event")
        client = self.csrf_client(self.staff)
        payload = {"slug": "gallery-news", "content_type": "news", "title": "Gallery news", "body": "<p>Article content</p>", "gallery_media": [str(image.id)]}
        article = client.post("/api/v2/cms/staff/articles/", data=json.dumps(payload), content_type="application/json").json()

        self.assertEqual(article["current_draft_revision"]["gallery_media"][0]["id"], str(image.id))
        self.assertEqual(client.post(f'/api/v2/cms/staff/articles/{article["id"]}/revisions/1/publish/').status_code, 200)
        public = self.client.get("/api/v2/cms/articles/gallery-news/").json()
        self.assertEqual(public["revision"]["gallery_media"][0]["alt_text"], "Directors at an event")

    def test_staff_can_remove_published_news(self):
        from .models import CMSArticle

        client = self.csrf_client(self.staff)
        payload = {"slug": "old-news", "content_type": "news", "title": "Old news", "body": "<p>Old article</p>"}
        article = client.post("/api/v2/cms/staff/articles/", data=json.dumps(payload), content_type="application/json").json()
        article_id = article["id"]
        self.assertEqual(client.post(f"/api/v2/cms/staff/articles/{article_id}/revisions/1/publish/").status_code, 200)
        self.assertEqual(self.client.get("/api/v2/cms/articles/old-news/").status_code, 200)

        self.assertEqual(client.delete(f"/api/v2/cms/staff/articles/{article_id}/").status_code, 204)
        self.assertTrue(CMSArticle.objects.get(pk=article_id).is_deleted)
        self.assertEqual(self.client.get("/api/v2/cms/articles/old-news/").status_code, 404)
        self.assertNotIn(article_id, [entry["id"] for entry in client.get("/api/v2/cms/staff/articles/").json()])
        self.assertTrue(AuditLog.objects.filter(action="cms.article_deleted").exists())

    def test_news_author_and_category_follow_the_published_revision(self):
        from .models import CMSCategory
        original = CMSCategory.objects.create(name="Governance", slug="test-governance", taxonomy="news")
        updated = CMSCategory.objects.create(name="Institute news", slug="test-institute", taxonomy="news")
        client = self.csrf_client(self.staff)
        payload = {"slug": "byline-example", "title": "An article", "author_display_name": "Original author", "primary_category": str(original.id)}
        article = client.post("/api/v2/cms/staff/articles/", data=json.dumps(payload), content_type="application/json").json()
        base = f'/api/v2/cms/staff/articles/{article["id"]}'
        public = "/api/v2/cms/articles/byline-example/"
        self.assertEqual(client.post(base + "/revisions/1/publish/").status_code, 200)
        payload.update(author_display_name="Updated author", primary_category=str(updated.id))
        self.assertEqual(client.post(base + "/drafts/", data=json.dumps(payload), content_type="application/json").status_code, 201)
        live = self.client.get(public).json()
        self.assertEqual(live["author_display_name"], "Original author")
        self.assertEqual(live["category"]["name"], "Governance")
        by_category = self.client.get("/api/v2/cms/articles/", {"category": original.slug}).json()
        self.assertIn(article["id"], [entry["id"] for entry in by_category])
        private_category = self.client.get("/api/v2/cms/articles/", {"category": updated.slug}).json()
        self.assertNotIn(article["id"], [entry["id"] for entry in private_category])
        self.assertEqual(client.post(base + "/revisions/2/publish/").status_code, 200)
        live = self.client.get(public).json()
        self.assertEqual(live["author_display_name"], "Updated author")
        self.assertEqual(live["category"]["name"], "Institute news")
        payload.update(author_display_name="", primary_category=None)
        self.assertEqual(client.post(base + "/drafts/", data=json.dumps(payload), content_type="application/json").status_code, 201)
        self.assertEqual(client.post(base + "/revisions/3/publish/").status_code, 200)
        live = self.client.get(public).json()
        self.assertEqual(live["author_display_name"], "")
        self.assertIsNone(live["category"])
