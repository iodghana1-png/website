from __future__ import annotations

import base64
from collections.abc import Iterable
from email.mime.image import MIMEImage
import json
from mimetypes import guess_type
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


class ResendDeliveryError(RuntimeError):
    """Raised when Resend cannot accept a transactional email."""


def _resend_attachment(filename: str, content: bytes, *, content_id: str | None = None) -> dict[str, str]:
    mimetype, _ = guess_type(filename)
    attachment = {
        "filename": filename,
        "content": base64.b64encode(content).decode("ascii"),
        "content_type": mimetype or "application/octet-stream",
    }
    if content_id:
        attachment["content_id"] = content_id
    return attachment


def _send_via_resend(
    *,
    subject: str,
    recipients: list[str],
    text: str,
    html: str,
    attachments: list[tuple[str, bytes]],
    logo_path: Path | None,
    reply_to: list[str],
    idempotency_key: str | None,
) -> None:
    """Use Resend's HTTPS API so Railway plans without SMTP egress can deliver mail."""
    resend_attachments = [_resend_attachment(filename, content) for filename, content in attachments]
    if logo_path:
        resend_attachments.insert(0, _resend_attachment(logo_path.name, logo_path.read_bytes(), content_id="iod-gh-logo"))

    payload: dict[str, object] = {
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": recipients,
        "subject": subject,
        "text": text,
        "html": html,
    }
    if resend_attachments:
        payload["attachments"] = resend_attachments
    if reply_to:
        payload["reply_to"] = reply_to

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "iod-gh-website/1.0",
    }
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key

    request = Request("https://api.resend.com/emails", data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urlopen(request, timeout=10):  # nosec B310 - fixed HTTPS Resend endpoint
            pass
    except HTTPError as error:
        raise ResendDeliveryError(f"Resend did not accept the email (HTTP {error.code}).") from error
    except (OSError, URLError) as error:
        raise ResendDeliveryError("Could not connect to Resend's email API.") from error


def send_institutional_email(
    *,
    subject: str,
    recipient: str | Iterable[str],
    recipient_name: str,
    heading: str,
    introduction: str,
    details: Iterable[tuple[str, str]] = (),
    closing: str,
    action_label: str | None = None,
    action_url: str | None = None,
    attachments: Iterable[tuple[str, bytes]] = (),
    reply_to: Iterable[str] = (),
    idempotency_key: str | None = None,
) -> None:
    """Send a consistently branded IoD-Gh email, preferring Resend HTTPS when configured."""
    detail_rows = [{"label": label, "value": value} for label, value in details]
    logo_path = Path(settings.BASE_DIR).parent / "public" / "images" / "iod-logo-white.png"
    has_logo = logo_path.is_file()
    logo = logo_path if has_logo else None
    attachment_list = list(attachments)
    recipients = [recipient] if isinstance(recipient, str) else list(recipient)
    reply_to_list = list(reply_to)

    text_lines = [
        f"Dear {recipient_name},",
        "",
        introduction,
        "",
        *[f"{row['label']}: {row['value']}" for row in detail_rows],
        "",
        closing,
        "",
        "Institute of Directors-Ghana",
    ]
    if action_label and action_url:
        text_lines.extend(["", f"{action_label}: {action_url}"])

    context = {
        "recipient_name": recipient_name,
        "heading": heading,
        "introduction": introduction,
        "details": detail_rows,
        "closing": closing,
        "action_label": action_label,
        "action_url": action_url,
        "has_logo": has_logo,
    }
    text = "\n".join(text_lines)
    html = render_to_string("emails/institutional_email.html", context)

    if settings.RESEND_API_KEY:
        _send_via_resend(
            subject=subject,
            recipients=recipients,
            text=text,
            html=html,
            attachments=attachment_list,
            logo_path=logo,
            reply_to=reply_to_list,
            idempotency_key=idempotency_key,
        )
        return

    message = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
        reply_to=reply_to_list,
    )
    message.attach_alternative(html, "text/html")

    if has_logo:
        inline_logo = MIMEImage(logo_path.read_bytes())
        inline_logo.add_header("Content-ID", "<iod-gh-logo>")
        inline_logo.add_header("Content-Disposition", "inline", filename=logo_path.name)
        message.attach(inline_logo)

    for filename, content in attachment_list:
        mimetype, _ = guess_type(filename)
        message.attach(filename, content, mimetype or "application/octet-stream")

    message.send(fail_silently=False)
