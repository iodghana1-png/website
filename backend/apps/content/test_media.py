from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, RequestFactory, TestCase, override_settings

from .cms_serializers import CMSMediaAssetSerializer
from .models import CMSMediaAsset


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
