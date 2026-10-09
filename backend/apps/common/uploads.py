"""Layered upload validation for persisted media and direct-email documents."""
import io
from pathlib import Path
import socket
import struct
import warnings
import zipfile

import filetype
import olefile
from defusedxml import ElementTree
from django.conf import settings
from PIL import Image
from pypdf import PdfReader
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject
from rest_framework.exceptions import APIException, ValidationError


class UploadScannerUnavailable(APIException):
    status_code = 503
    default_detail = "File security scanning is temporarily unavailable. Please try again later."
    default_code = "upload_scanner_unavailable"


def scan_upload(data):
    if not settings.CLAMAV_HOST:
        if settings.UPLOAD_SCAN_REQUIRED:
            raise UploadScannerUnavailable()
        return
    try:
        with socket.create_connection((settings.CLAMAV_HOST, settings.CLAMAV_PORT), timeout=15) as scanner:
            scanner.sendall(b"zINSTREAM\0")
            for offset in range(0, len(data), 65536):
                chunk = data[offset:offset + 65536]
                scanner.sendall(struct.pack("!I", len(chunk)) + chunk)
            scanner.sendall(struct.pack("!I", 0))
            result = b""
            while b"\0" not in result and len(result) < 4096:
                chunk = scanner.recv(1024)
                if not chunk:
                    break
                result += chunk
    except OSError as exc:
        raise UploadScannerUnavailable() from exc
    if result.endswith(b" FOUND\0"):
        raise ValidationError("This file failed the malware security check.")
    if result != b"stream: OK\0":
        raise UploadScannerUnavailable()


def validate_pdf(data):
    if not data.startswith(b"%PDF-") or not data.rstrip().endswith(b"%%EOF"):
        raise ValueError("Invalid PDF framing")
    reader = PdfReader(io.BytesIO(data), strict=True)
    if reader.is_encrypted:
        raise ValueError("Encrypted files cannot be inspected")
    # Walk the reachable object graph, including indirect action dictionaries.
    pending = [(reader.trailer, 0)]
    seen = set()
    count = 0
    forbidden = {"/JS", "/JavaScript", "/AA", "/OpenAction", "/Launch", "/EmbeddedFiles", "/EmbeddedFile", "/RichMedia", "/XFA", "/AcroForm"}
    while pending:
        obj, depth = pending.pop()
        count += 1
        if count > 20000 or depth > 100:
            raise ValueError("PDF is too complex")
        if isinstance(obj, IndirectObject):
            key = (obj.idnum, obj.generation)
            if key in seen:
                continue
            seen.add(key)
            obj = obj.get_object()
        if isinstance(obj, DictionaryObject):
            if forbidden.intersection(obj.keys()) or obj.get("/Type") == "/EmbeddedFile":
                raise ValueError("Active content is not allowed")
            if "/URI" in obj and not str(obj["/URI"]).lower().startswith(("https://", "http://", "mailto:")):
                raise ValueError("Unsafe link")
            if obj.get("/S") in {"/JavaScript", "/Launch", "/SubmitForm", "/ImportData", "/GoToR", "/GoToE", "/Rendition", "/Movie", "/Sound"}:
                raise ValueError("Active action is not allowed")
            pending.extend((value, depth + 1) for value in obj.values())
        elif isinstance(obj, ArrayObject):
            pending.extend((value, depth + 1) for value in obj)
    if not 0 < len(reader.pages) <= 500:
        raise ValueError("PDF page count is not supported")


def validate_docx(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        if len(entries) > 1000 or len(names) != len(set(names)):
            raise ValueError("Invalid archive")
        if not {"[Content_Types].xml", "word/document.xml", "_rels/.rels"}.issubset(names):
            raise ValueError("Not a Word document")
        if sum(entry.file_size for entry in entries) > 40 * 1024 * 1024:
            raise ValueError("Expanded document is too large")
        for entry in entries:
            name = entry.filename.lower()
            if entry.flag_bits & 1 or entry.file_size > 10 * 1024 * 1024:
                raise ValueError("Encrypted or oversized entry")
            if name.startswith("/") or ".." in name.split("/") or "\\" in name:
                raise ValueError("Unsafe archive path")
            if any(marker in name for marker in ("vbaproject", "embeddings/", "activex/")):
                raise ValueError("Embedded executable content")
            if name.endswith((".xml", ".rels")):
                root = ElementTree.fromstring(archive.read(entry))
                if name == "word/document.xml" and root.tag != "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document":
                    raise ValueError("Invalid document root")
                for node in root.iter():
                    if "macroenabled" in node.attrib.get("ContentType", "").lower():
                        raise ValueError("Macros are not allowed")
                    if node.attrib.get("TargetMode", "").lower() == "external":
                        if not node.attrib.get("Type", "").endswith("/hyperlink") or not node.attrib.get("Target", "").lower().startswith(("https://", "http://", "mailto:")):
                            raise ValueError("External resources are not allowed")
                    if node.tag.rsplit("}", 1)[-1] in {"instrText", "fldSimple"}:
                        instruction = " ".join(node.itertext()) + str(node.attrib)
                        if any(word in instruction.upper() for word in ("DDE", "INCLUDETEXT", "INCLUDEPICTURE")):
                            raise ValueError("External document fields are not allowed")


def validate_doc(data):
    with olefile.OleFileIO(io.BytesIO(data), raise_defects=olefile.DEFECT_INCORRECT) as document:
        if not document.exists("WordDocument"):
            raise ValueError("Not a Word document")
        for path in document.listdir():
            if any(part.lower() in {"macros", "vba", "objectpool", "_vba_project", "encryptedpackage"} for part in path):
                raise ValueError("Macros and embedded objects are not allowed")
        header = document.openstream("WordDocument").read(32)
        if len(header) < 32 or header[:2] != b"\xec\xa5" or int.from_bytes(header[10:12], "little") & 0x8100:
            raise ValueError("Invalid or encrypted Word document")
        if b"DDE" in data.upper() or b"D\x00D\x00E\x00" in data.upper():
            raise ValueError("External document fields are not allowed")


IMAGE_TYPES = {
    ".png": ("PNG", "image/png"), ".jpg": ("JPEG", "image/jpeg"),
    ".jpeg": ("JPEG", "image/jpeg"), ".webp": ("WEBP", "image/webp"),
    ".gif": ("GIF", "image/gif"), ".ico": ("ICO", "image/x-icon"),
}
MEDIA_TYPES = {
    ".mp3": {"audio/mpeg"}, ".wav": {"audio/x-wav", "audio/wav"},
    ".ogg": {"audio/ogg"}, ".flac": {"audio/x-flac"},
    ".m4a": {"audio/mp4", "audio/x-m4a"}, ".mp4": {"video/mp4"},
    ".webm": {"video/webm"}, ".mov": {"video/quicktime"},
}
DOCUMENT_TYPES = {".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


def validate_upload(upload, *, cv=False, scan_for_malware=True):
    """Validate an upload without trusting its browser-supplied content type.

    Membership CVs are delivered as email attachments and are never persisted by
    this application.  They still undergo the strict structural document checks
    below, but do not depend on the unavailable network scanner.  Stored CMS
    media retains malware scanning by default.
    """
    limit = (10 if cv else 20) * 1024 * 1024
    suffix = Path(upload.name).suffix.lower()
    allowed = DOCUMENT_TYPES if cv else {**IMAGE_TYPES, **MEDIA_TYPES, ".pdf": "application/pdf"}
    if suffix not in allowed or not upload.size or upload.size > limit:
        raise ValidationError("Choose a supported file under 10 MB (CV) or 20 MB (media). HTML and SVG are not allowed.")
    upload.seek(0)
    data = upload.read(limit + 1)
    upload.seek(0)
    if len(data) > limit:
        raise ValidationError("The uploaded file is too large.")
    if scan_for_malware:
        scan_upload(data)
    try:
        if suffix in IMAGE_TYPES:
            expected, mime = IMAGE_TYPES[suffix]
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(data)) as image:
                    if image.format != expected or image.width * image.height > 25_000_000:
                        raise ValueError("Image format or dimensions not supported")
                    image.verify()
                with Image.open(io.BytesIO(data)) as image:
                    image.load()
        elif suffix == ".pdf":
            validate_pdf(data)
            mime = DOCUMENT_TYPES[suffix]
        elif suffix == ".docx":
            validate_docx(data)
            mime = DOCUMENT_TYPES[suffix]
        elif suffix == ".doc":
            validate_doc(data)
            mime = DOCUMENT_TYPES[suffix]
        else:
            detected = filetype.guess(data)
            if not detected or detected.mime not in MEDIA_TYPES[suffix]:
                raise ValueError("File signature does not match the extension")
            mime = detected.mime
    except Exception as exc:
        raise ValidationError("The file is invalid, unsafe, encrypted, or does not match its extension. Export a fresh copy and try again.") from exc
    # Never persist or email the browser's untrusted MIME declaration.
    upload.content_type = mime
    upload.seek(0)
    return upload
