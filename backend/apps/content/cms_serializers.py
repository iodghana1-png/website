from __future__ import annotations

from urllib.parse import urlparse

from django.urls import reverse
from rest_framework import serializers
from apps.common.uploads import validate_upload
from .cms_text import clean_text, clean_data, safe_link

from .models import (
    CMSArticle,
    CMSArticleRevision,
    CMSCategory,
    CMSMediaAsset,
    CMSNavigationItem,
    CMSNavigationMenu,
    CMSNavigationRevision,
    CMSPage,
    CMSPageRevision,
    CMSPageSection,
    CMSSiteSettings,
    CMSSiteSettingsRevision,
)


def canonical_path(value: str) -> str:
    value = value.strip()
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or not value.startswith("/"):
        raise serializers.ValidationError("Enter a canonical internal path beginning with '/'.")
    if "//" in value or "/../" in value or value == "/..":
        raise serializers.ValidationError("The path is not valid.")
    if value != "/" and value.endswith("/"):
        value = value.rstrip("/")
    return value or "/"


class CMSMediaAssetSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    file_url = serializers.SerializerMethodField()

    def validate_file(self, upload):
        return validate_upload(upload)

    class Meta:
        model = CMSMediaAsset
        fields = (
            "id", "file", "file_url", "original_filename", "mime_type", "byte_size", "alt_text", "caption", "credit",
            "kind", "status", "created_at", "updated_at",
        )
        read_only_fields = ("id", "file_url", "mime_type", "byte_size", "kind", "created_at", "updated_at")

    def get_file_url(self, asset):
        if not asset.file:
            return ""
        request = self.context.get("request")
        url = reverse("cms-media-asset", kwargs={"media_id": asset.id})
        return request.build_absolute_uri(url) if request else url


class CMSPageSectionSerializer(serializers.ModelSerializer):
    primary_media = CMSMediaAssetSerializer(read_only=True)
    primary_media_id = serializers.PrimaryKeyRelatedField(source="primary_media", queryset=CMSMediaAsset.objects.filter(status=CMSMediaAsset.Status.READY), allow_null=True, required=False, write_only=True)

    class Meta:
        model = CMSPageSection
        fields = ("id", "slot", "section_type", "position", "data", "primary_media", "primary_media_id", "is_enabled")
        read_only_fields = ("id",)


class CMSPageRevisionSerializer(serializers.ModelSerializer):
    sections = CMSPageSectionSerializer(many=True, read_only=True)
    social_image = CMSMediaAssetSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CMSPageRevision
        fields = (
            "id", "number", "state", "eyebrow", "title", "summary", "body", "seo_title", "seo_description",
            "canonical_path", "robots", "social_image", "sections", "change_summary", "review_note", "created_by_name",
            "submitted_at", "publish_at", "published_at", "created_at",
        )

    def get_created_by_name(self, value):
        return value.created_by.full_name or value.created_by.email if value.created_by else ""


class CMSPageListSerializer(serializers.ModelSerializer):
    published_revision_number = serializers.IntegerField(source="published_revision.number", read_only=True, allow_null=True)
    current_draft_revision_number = serializers.IntegerField(source="current_draft_revision.number", read_only=True, allow_null=True)
    live_title = serializers.CharField(source="published_revision.title", read_only=True, allow_null=True)

    class Meta:
        model = CMSPage
        fields = (
            "id", "path", "slug", "label", "template_key", "is_system_page", "published_revision_number",
            "current_draft_revision_number", "live_title", "created_at", "updated_at",
        )


class CMSPageDetailSerializer(CMSPageListSerializer):
    published_revision = CMSPageRevisionSerializer(read_only=True)
    current_draft_revision = CMSPageRevisionSerializer(read_only=True)
    revisions = serializers.SerializerMethodField()

    class Meta(CMSPageListSerializer.Meta):
        fields = CMSPageListSerializer.Meta.fields + ("published_revision", "current_draft_revision", "revisions")

    def get_revisions(self, page):
        revisions = page.revisions.select_related("created_by", "social_image").prefetch_related("sections__primary_media")[:20]
        return CMSPageRevisionSerializer(revisions, many=True, context=self.context).data


class CMSPublicPageSerializer(serializers.ModelSerializer):
    revision = CMSPageRevisionSerializer(source="published_revision", read_only=True)
    published_at = serializers.DateTimeField(source="published_revision.published_at", read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("revision"):
            # Retire the former browser-graded practice assessment. Real exam
            # questions and keys are available only through examinations APIs.
            data["revision"]["sections"] = [section for section in data["revision"]["sections"] if section["section_type"] != "exam_assessment"]
        return data

    class Meta:
        model = CMSPage
        fields = ("id", "path", "slug", "template_key", "revision", "published_at")


class CMSPageSectionWriteSerializer(serializers.Serializer):
    slot = serializers.CharField(max_length=80, default="main")
    section_type = serializers.ChoiceField(choices=CMSPageSection._meta.get_field("section_type").choices)
    position = serializers.IntegerField(min_value=0)
    data = serializers.JSONField(required=False, default=dict)
    primary_media = serializers.PrimaryKeyRelatedField(queryset=CMSMediaAsset.objects.all(), allow_null=True, required=False)
    is_enabled = serializers.BooleanField(default=True)

    def validate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Section data must be a JSON object.")
        return clean_data(value)


class CMSPageDraftSerializer(serializers.Serializer):
    def validate_body(self, value):
        return clean_text(value)

    label = serializers.CharField(max_length=150)
    path = serializers.CharField(max_length=255)
    slug = serializers.SlugField(max_length=50)
    template_key = serializers.CharField(max_length=80, default="standard")
    eyebrow = serializers.CharField(max_length=150, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255)
    summary = serializers.CharField(required=False, allow_blank=True)
    body = serializers.CharField(required=False, allow_blank=True)
    seo_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    seo_description = serializers.CharField(max_length=320, required=False, allow_blank=True)
    canonical_path = serializers.CharField(max_length=255, required=False, allow_blank=True)
    robots = serializers.CharField(max_length=80, required=False, default="index,follow")
    social_image = serializers.PrimaryKeyRelatedField(queryset=CMSMediaAsset.objects.all(), allow_null=True, required=False)
    sections = CMSPageSectionWriteSerializer(many=True, required=False, default=list)
    change_summary = serializers.CharField(max_length=500, required=False, allow_blank=True)
    base_revision_number = serializers.IntegerField(min_value=1, required=False)

    def validate_path(self, value):
        return canonical_path(value)

    def validate_canonical_path(self, value):
        return canonical_path(value) if value else ""

    def validate_sections(self, value):
        seen = set()
        for section in value:
            key = (section["slot"], section["position"])
            if key in seen:
                raise serializers.ValidationError("Section positions must be unique within a slot.")
            seen.add(key)
        return value


class CMSCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CMSCategory
        fields = ("id", "taxonomy", "name", "slug", "description", "position", "is_active")
        read_only_fields = ("id",)


class CMSArticleRevisionSerializer(serializers.ModelSerializer):
    cover_media = CMSMediaAssetSerializer(read_only=True)
    gallery_media = CMSMediaAssetSerializer(many=True, read_only=True)

    class Meta:
        model = CMSArticleRevision
        fields = (
            "id", "number", "state", "title", "standfirst", "body", "cover_media", "gallery_media", "seo_title", "seo_description",
            "change_summary", "publish_at", "published_at", "created_at",
        )


class CMSArticleListSerializer(serializers.ModelSerializer):
    primary_category = CMSCategorySerializer(read_only=True)
    published_revision_number = serializers.IntegerField(source="published_revision.number", read_only=True, allow_null=True)
    current_draft_revision_number = serializers.IntegerField(source="current_draft_revision.number", read_only=True, allow_null=True)
    live_title = serializers.CharField(source="published_revision.title", read_only=True, allow_null=True)

    class Meta:
        model = CMSArticle
        fields = (
            "id", "slug", "content_type", "primary_category", "author_display_name", "published_revision_number",
            "current_draft_revision_number", "live_title", "updated_at",
        )


class CMSArticleDetailSerializer(CMSArticleListSerializer):
    categories = CMSCategorySerializer(many=True, read_only=True)
    published_revision = CMSArticleRevisionSerializer(read_only=True)
    current_draft_revision = CMSArticleRevisionSerializer(read_only=True)
    revisions = CMSArticleRevisionSerializer(many=True, read_only=True)

    class Meta(CMSArticleListSerializer.Meta):
        fields = CMSArticleListSerializer.Meta.fields + ("categories", "published_revision", "current_draft_revision", "revisions")


class CMSPublicArticleSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    author_display_name = serializers.SerializerMethodField()
    revision = CMSArticleRevisionSerializer(source="published_revision", read_only=True)
    published_at = serializers.DateTimeField(source="published_revision.published_at", read_only=True)

    def get_category(self, article):
        snapshot = article.published_revision.snapshot
        if "category" in snapshot:
            return snapshot["category"]
        return CMSCategorySerializer(article.primary_category).data if article.primary_category else None

    def get_author_display_name(self, article):
        return article.published_revision.snapshot.get("author_display_name", article.author_display_name)

    class Meta:
        model = CMSArticle
        fields = ("id", "slug", "content_type", "category", "author_display_name", "revision", "published_at")


class CMSArticleDraftSerializer(serializers.Serializer):
    def validate_body(self, value):
        return clean_text(value)

    slug = serializers.SlugField(max_length=50)
    content_type = serializers.ChoiceField(choices=CMSArticle.ContentType.choices, default=CMSArticle.ContentType.NEWS)
    primary_category = serializers.PrimaryKeyRelatedField(queryset=CMSCategory.objects.filter(is_active=True), allow_null=True, required=False)
    categories = serializers.PrimaryKeyRelatedField(queryset=CMSCategory.objects.filter(is_active=True), many=True, required=False)
    author_display_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255)
    standfirst = serializers.CharField(required=False, allow_blank=True)
    body = serializers.CharField(required=False, allow_blank=True)
    cover_media = serializers.PrimaryKeyRelatedField(queryset=CMSMediaAsset.objects.all(), allow_null=True, required=False)
    gallery_media = serializers.PrimaryKeyRelatedField(queryset=CMSMediaAsset.objects.filter(kind="image"), many=True, required=False)
    seo_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    seo_description = serializers.CharField(max_length=320, required=False, allow_blank=True)
    change_summary = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CMSNavigationItemSerializer(serializers.ModelSerializer):
    href = serializers.SerializerMethodField()

    def get_href(self, item):
        return item.page.path if item.link_type == 'page' and item.page else item.href

    page_id = serializers.UUIDField(source="page.id", read_only=True, allow_null=True)
    parent_id = serializers.UUIDField(source="parent.id", read_only=True, allow_null=True)

    class Meta:
        model = CMSNavigationItem
        fields = ("id", "parent_id", "position", "label", "link_type", "page_id", "href", "open_in_new_tab", "is_enabled")


class CMSNavigationRevisionSerializer(serializers.ModelSerializer):
    items = CMSNavigationItemSerializer(many=True, read_only=True)

    class Meta:
        model = CMSNavigationRevision
        fields = ("id", "number", "state", "items", "change_summary", "published_at", "created_at")


class CMSNavigationMenuSerializer(serializers.ModelSerializer):
    published_revision = CMSNavigationRevisionSerializer(read_only=True)
    current_draft_revision = CMSNavigationRevisionSerializer(read_only=True)

    class Meta:
        model = CMSNavigationMenu
        fields = ("id", "key", "label", "published_revision", "current_draft_revision", "updated_at")
        read_only_fields = ("id", "updated_at")


class CMSPublicNavigationMenuSerializer(serializers.ModelSerializer):
    published_revision = CMSNavigationRevisionSerializer(read_only=True)

    class Meta:
        model = CMSNavigationMenu
        fields = ("id", "key", "label", "published_revision", "updated_at")


class CMSNavigationItemWriteSerializer(serializers.Serializer):
    parent_index = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    position = serializers.IntegerField(min_value=0, required=False)
    label = serializers.CharField(max_length=120)
    link_type = serializers.ChoiceField(choices=CMSNavigationItem.LinkType.choices, default=CMSNavigationItem.LinkType.INTERNAL)
    page = serializers.PrimaryKeyRelatedField(queryset=CMSPage.objects.filter(is_deleted=False), allow_null=True, required=False)
    href = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    open_in_new_tab = serializers.BooleanField(default=False)
    is_enabled = serializers.BooleanField(default=True)

    def validate(self, value):
        if value.get("href") and not safe_link(value["href"]):
            raise serializers.ValidationError({"href": ["Use a website address or a link beginning with /."]})
        if value["link_type"] == CMSNavigationItem.LinkType.PAGE and not value.get("page"):
            raise serializers.ValidationError({"page": ["Choose a page for a page link."]})
        if value["link_type"] != CMSNavigationItem.LinkType.PAGE and not value.get("href"):
            raise serializers.ValidationError({"href": ["Enter a destination URL or path."]})
        return value


class CMSNavigationDraftSerializer(serializers.Serializer):
    items = CMSNavigationItemWriteSerializer(many=True, default=list)
    change_summary = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_items(self, value):
        for index, item in enumerate(value):
            parent = item.get("parent_index")
            if parent is not None and parent >= index:
                raise serializers.ValidationError("A parent menu item must appear before its child.")
        return value


class CMSSiteSettingsRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CMSSiteSettingsRevision
        fields = ("id", "number", "state", "data", "change_summary", "published_at", "created_at")


class CMSSiteSettingsSerializer(serializers.ModelSerializer):
    published_revision = CMSSiteSettingsRevisionSerializer(read_only=True)
    current_draft_revision = CMSSiteSettingsRevisionSerializer(read_only=True)

    class Meta:
        model = CMSSiteSettings
        fields = ("id", "key", "published_revision", "current_draft_revision", "updated_at")


class CMSSiteSettingsDraftSerializer(serializers.Serializer):
    data = serializers.JSONField()
    change_summary = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Settings must be a JSON object.")
        return value
