"""Helpers for serving CMS media independently of the environment URL."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import unquote

from django.conf import settings
from django.urls import reverse

from .models import CMSMediaAsset


# Earlier CMS revisions stored a URL generated while development ran locally.
# Keep the original value when it cannot be tied safely to a known CMS asset.
LEGACY_MEDIA_URL = re.compile(
    r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?/media/(?P<file>[^?#\s<>'\"]+)",
    re.IGNORECASE,
)
_REQUEST_CACHE_ATTRIBUTE = "_cms_media_url_by_file"


def media_asset_url(asset: CMSMediaAsset, request=None) -> str:
    """Return the stable public API route for an asset."""
    url = reverse("cms-media-asset", kwargs={"media_id": asset.id})
    if settings.CMS_PUBLIC_API_BASE_URL:
        return f"{settings.CMS_PUBLIC_API_BASE_URL}{url}"
    return request.build_absolute_uri(url) if request else url


def _legacy_file_names(value: Any) -> set[str]:
    if isinstance(value, str):
        return {unquote(match.group("file")) for match in LEGACY_MEDIA_URL.finditer(value)}
    if isinstance(value, dict):
        return set().union(*(_legacy_file_names(item) for item in value.values())) if value else set()
    if isinstance(value, list):
        return set().union(*(_legacy_file_names(item) for item in value)) if value else set()
    return set()


def _media_urls_by_file(value: Any, request) -> dict[str, str | None]:
    file_names = _legacy_file_names(value)
    if not file_names:
        return {}
    cache = getattr(request, _REQUEST_CACHE_ATTRIBUTE, {}) if request else {}
    missing = file_names.difference(cache)
    if missing:
        assets = CMSMediaAsset.objects.filter(file__in=missing).only("id", "file")
        found = {asset.file.name: media_asset_url(asset, request) for asset in assets if asset.file}
        cache.update(found)
        cache.update({name: None for name in missing.difference(found)})
        if request:
            setattr(request, _REQUEST_CACHE_ATTRIBUTE, cache)
    return cache


def resolve_legacy_media_urls(value: Any, request=None) -> Any:
    """Replace stored local media URLs in JSON-like CMS values.

    The content is left unchanged in the database. Only the API response is
    normalized, letting the same revision work on a local API and on Railway.
    """
    urls_by_file = _media_urls_by_file(value, request)
    if not urls_by_file:
        return value
    if isinstance(value, str):
        return LEGACY_MEDIA_URL.sub(
            lambda match: urls_by_file.get(unquote(match.group("file"))) or match.group(0),
            value,
        )
    if isinstance(value, dict):
        return {key: resolve_legacy_media_urls(item, request) for key, item in value.items()}
    if isinstance(value, list):
        return [resolve_legacy_media_urls(item, request) for item in value]
    return value
