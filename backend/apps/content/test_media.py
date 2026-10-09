from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, RequestFactory, TestCase, override_settings

from .cms_serializers import CMSMediaAssetSerializer, CMSPageSectionSerializer
from .models import CMSMediaAsset, CMSPage, CMSPageRevision, CMSPageSection


class CMSMediaDeliveryTests(TestCase):
    def test_public_media_uses_a_stable_api_url_and_streams_the_asset(self):
        with TemporaryDirectory(prefix="iod-cms-media-") as media_root, override_settings(MEDIA_ROOT=media_root):
            asset = CMSMediaAsset.objects.create(
                file=SimpleUploadedFile("logo.png", b"cms-image", content_type="image/png"),
                original_filename="logo.png",
                mime_type="image/png",
                byte_size=9,
                kind=CMSMediaAsset.Kind.IMAGE,
            )

            serializer = CMSMediaAssetSerializer(asset, context={"request": RequestFactory().get("/")})
            self.assertEqual(
                serializer.data["file_url"],
                f"http://testserver/api/v2/cms/media/{asset.id}/",
            )
            self.assertNotIn("file", serializer.data)

            response = Client().get(f"/api/v2/cms/media/{asset.id}/")
            payload = b"".join(response.streaming_content)
            response.close()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(response["Cache-Control"], "public, max-age=3600")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(payload, b"cms-image")

    def test_legacy_local_media_urls_are_rewritten_for_the_current_api_host(self):
        asset = CMSMediaAsset.objects.create(
            file="cms/2026/10/local-logo.png",
            original_filename="local-logo.png",
            mime_type="image/png",
            byte_size=1,
            kind=CMSMediaAsset.Kind.IMAGE,
        )
        page = CMSPage.objects.create(path="/legacy-media", slug="legacy-media", label="Legacy media")
        revision = CMSPageRevision.objects.create(page=page, number=1, title="Legacy media")
        section = CMSPageSection.objects.create(
            revision=revision,
            section_type="image",
            position=0,
            data={
                "image_url": "http://localhost:8010/media/cms/2026/10/local-logo.png",
                "nested": {"image_url": "http://127.0.0.1:8010/media/cms/2026/10/local-logo.png"},
                "external_url": "https://example.test/image.png",
            },
        )

        data = CMSPageSectionSerializer(section, context={"request": RequestFactory().get("/")}).data["data"]

        expected = f"http://testserver/api/v2/cms/media/{asset.id}/"
        self.assertEqual(data["image_url"], expected)
        self.assertEqual(data["nested"]["image_url"], expected)
        self.assertEqual(data["external_url"], "https://example.test/image.png")
