import io
import zipfile
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch, MagicMock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, SimpleTestCase, override_settings
from PIL import Image
from pypdf import PdfWriter
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import User
from apps.content.cms_serializers import CMSMediaAssetSerializer
from apps.content.models import CMSMediaAsset
from apps.membership.serializers import MembershipApplicationSubmitSerializer
from .models import RateLimitBucket
from .throttling import ScopedRateThrottle, client_address
from .uploads import UploadScannerUnavailable, scan_upload, validate_upload


class SharedRateLimitTests(TestCase):
    def test_spoofing_forwarded_headers_does_not_bypass_login_limit(self):
        client = APIClient()
        codes = [client.post("/api/v1/auth/login/", {"email": "nobody@example.com", "password": "wrong"},
                             REMOTE_ADDR="192.0.2.10", HTTP_X_FORWARDED_FOR=f"198.51.100.{i}").status_code for i in range(6)]
        self.assertEqual(codes, [403, 403, 403, 403, 403, 429])
        # Login protection uses an IP bucket and a separate account bucket.
        self.assertEqual(RateLimitBucket.objects.count(), 2)
        self.assertTrue(all("192.0.2.10" not in bucket.key for bucket in RateLimitBucket.objects.all()))

    def test_separate_instances_share_history_and_expired_attempts_are_removed(self):
        request = APIRequestFactory().get("/", REMOTE_ADDR="192.0.2.11")
        view = SimpleNamespace(throttle_scope="login")
        for _ in range(5):
            throttle = ScopedRateThrottle()
            throttle.timer = lambda: 1000
            self.assertTrue(throttle.allow_request(request, view))
        throttle = ScopedRateThrottle()
        throttle.timer = lambda: 1001
        self.assertFalse(throttle.allow_request(request, view))
        self.assertGreater(throttle.wait(), 0)
        throttle.timer = lambda: 1061
        self.assertTrue(throttle.allow_request(request, view))
        self.assertEqual(len(RateLimitBucket.objects.get().history), 1)

    @override_settings(TRUSTED_PROXY_CIDRS=["10.10.0.0/24"])
    def test_only_known_proxies_can_forward_and_client_cannot_spoof_leftmost_hop(self):
        factory = APIRequestFactory()
        self.assertEqual(client_address(factory.get("/", REMOTE_ADDR="10.10.0.1", HTTP_X_FORWARDED_FOR="1.2.3.4, 192.0.2.5")), "192.0.2.5")
        self.assertEqual(client_address(factory.get("/", REMOTE_ADDR="192.0.2.6", HTTP_X_FORWARDED_FOR="1.2.3.4")), "192.0.2.6")
        self.assertEqual(client_address(factory.get("/", REMOTE_ADDR="10.10.0.1", HTTP_X_FORWARDED_FOR="garbage")), "10.10.0.1")


def pdf_bytes(*, script=False, encrypted=False):
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    if script:
        writer.add_js("app.alert('test')")
    if encrypted:
        writer.encrypt("test-password")
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def docx_bytes(*, extra=None):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        archive.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')
        archive.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>')
        for name, value in (extra or {}).items():
            archive.writestr(name, value)
    return output.getvalue()


class UploadValidationTests(SimpleTestCase):
    def test_html_cannot_be_disguised_as_an_image_or_pdf(self):
        for name in ("payload.html", "photo.png", "cv.pdf"):
            with self.subTest(name=name), self.assertRaises(ValidationError):
                CMSMediaAssetSerializer().validate_file(SimpleUploadedFile(name, b"<html>not an image</html>", "image/png"))

    def test_cv_checks_contents_not_only_suffix(self):
        for name in ("cv.pdf", "cv.doc", "cv.docx"):
            with self.subTest(name=name), self.assertRaises(ValidationError):
                MembershipApplicationSubmitSerializer().validate_cv(SimpleUploadedFile(name, b"not a document"))

    def test_valid_pdf_is_rewound_and_uses_verified_content_type(self):
        contents = pdf_bytes()
        upload = validate_upload(SimpleUploadedFile("cv.pdf", contents, "text/html"), cv=True)
        self.assertEqual(upload.content_type, "application/pdf")
        self.assertEqual(upload.read(), contents)

    @override_settings(UPLOAD_SCAN_REQUIRED=True, CLAMAV_HOST="")
    def test_membership_cv_uses_strict_document_checks_without_network_scanner(self):
        with patch("apps.common.uploads.scan_upload") as scan:
            upload = MembershipApplicationSubmitSerializer().validate_cv(SimpleUploadedFile("cv.pdf", pdf_bytes()))
        self.assertEqual(upload.content_type, "application/pdf")
        scan.assert_not_called()

    def test_active_and_encrypted_pdfs_are_rejected(self):
        for contents in (pdf_bytes(script=True), pdf_bytes(encrypted=True)):
            with self.assertRaises(ValidationError):
                validate_upload(SimpleUploadedFile("cv.pdf", contents), cv=True)

    def test_images_are_decoded_and_extension_must_match(self):
        output = io.BytesIO()
        Image.new("RGB", (10, 10)).save(output, format="PNG")
        upload = validate_upload(SimpleUploadedFile("photo.png", output.getvalue(), "text/html"))
        self.assertEqual(upload.content_type, "image/png")
        with self.assertRaises(ValidationError):
            validate_upload(SimpleUploadedFile("photo.jpg", output.getvalue(), "image/jpeg"))

    def test_docx_rejects_macros_external_templates_and_xml_entities(self):
        validate_upload(SimpleUploadedFile("cv.docx", docx_bytes()), cv=True)
        for extra in (
            {"word/vbaProject.bin": b"macro"},
            {"word/_rels/settings.xml.rels": '<Relationships><Relationship TargetMode="External" Type="attachedTemplate" Target="https://example.com/template"/></Relationships>'},
            {"word/settings.xml": '<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///not-read">]><x>&secret;</x>'},
        ):
            with self.assertRaises(ValidationError):
                validate_upload(SimpleUploadedFile("cv.docx", docx_bytes(extra=extra)), cv=True)

    def test_empty_and_oversized_files_are_rejected_before_scanning(self):
        for upload in (SimpleUploadedFile("cv.pdf", b""), SimpleUploadedFile("cv.pdf", b"x")):
            if upload.size:
                upload.size = 11 * 1024 * 1024
            with self.assertRaises(ValidationError), patch("apps.common.uploads.scan_upload") as scan:
                validate_upload(upload, cv=True)
            scan.assert_not_called()

    @override_settings(UPLOAD_SCAN_REQUIRED=True, CLAMAV_HOST="")
    def test_required_scanning_never_silently_skips_missing_configuration(self):
        with self.assertRaises(UploadScannerUnavailable):
            validate_upload(SimpleUploadedFile("cv.pdf", pdf_bytes()), cv=True)

    @override_settings(CLAMAV_HOST="127.0.0.1")
    def test_scanner_connection_failure_fails_closed(self):
        with patch("apps.common.uploads.socket.create_connection", side_effect=OSError), self.assertRaises(UploadScannerUnavailable):
            scan_upload(b"test")

    @override_settings(CLAMAV_HOST="127.0.0.1")
    def test_scanner_malware_and_protocol_errors_fail_closed(self):
        for reply, error in ((b"stream: Test-Signature FOUND\0", ValidationError), (b"stream: size limit ERROR\0", UploadScannerUnavailable), (b"", UploadScannerUnavailable)):
            scanner = MagicMock()
            scanner.__enter__.return_value.recv.return_value = reply
            with patch("apps.common.uploads.socket.create_connection", return_value=scanner), self.assertRaises(error):
                scan_upload(b"test")

    @override_settings(CLAMAV_HOST="127.0.0.1")
    def test_scanner_accepts_only_an_explicit_clean_result(self):
        scanner = MagicMock()
        scanner.__enter__.return_value.recv.return_value = b"stream: OK\0"
        with patch("apps.common.uploads.socket.create_connection", return_value=scanner):
            scan_upload(b"test")
        self.assertEqual(scanner.__enter__.return_value.sendall.call_count, 3)


class UploadEndpointSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_superuser("upload-test@example.com", "Safe-test-password!"))

    def test_cms_create_rejects_disguised_upload_without_saving(self):
        count = CMSMediaAsset.objects.count()
        response = self.client.post("/api/v2/cms/staff/media/", {"file": SimpleUploadedFile("photo.html", b"<html>test</html>", "image/png")}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CMSMediaAsset.objects.count(), count)

    def test_valid_multipart_upload_above_default_memory_threshold_still_works(self):
        writer = PdfWriter()
        writer.add_blank_page(width=595, height=842)
        writer.add_metadata({"/Subject": "a" * (3 * 1024 * 1024)})
        output = io.BytesIO()
        writer.write(output)
        with TemporaryDirectory(prefix="iod-upload-security-test-") as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post("/api/v2/cms/staff/media/", {
                "file": SimpleUploadedFile("document.pdf", output.getvalue(), "application/octet-stream"),
            }, format="multipart")
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data["mime_type"], "application/pdf")
            self.assertEqual(response.data["byte_size"], len(output.getvalue()))

    def test_cms_replace_rejects_disguised_upload_without_replacing_original(self):
        asset = CMSMediaAsset.objects.create(file="cms/existing.png", original_filename="existing.png", mime_type="image/png", kind="image")
        response = self.client.patch(f"/api/v2/cms/staff/media/{asset.id}/", {"file": SimpleUploadedFile("photo.png", b"<html>test</html>", "image/png")}, format="multipart")
        self.assertEqual(response.status_code, 400)
        asset.refresh_from_db()
        self.assertEqual(asset.file.name, "cms/existing.png")
