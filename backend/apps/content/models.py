from __future__ import annotations

import uuid

from django.conf import settings
from django.conf import settings as django_settings
from django.db import models
from django.utils import timezone


class CMSRevisionState(models.TextChoices):
    DRAFT = "draft", "Draft"
    IN_REVIEW = "in_review", "In review"
    SCHEDULED = "scheduled", "Scheduled"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"
    SUPERSEDED = "superseded", "Superseded"


CMS_SECTION_TYPES = (
    ("gallery", "Gallery"),
    ("faq", "FAQ"),
    ("hero", "Hero"),
    ("rich_text", "Rich text"),
    ("callout", "Callout"),
    ("stat_grid", "Statistics"),
    ("card_grid", "Card grid"),
    ("feature_list", "Feature list"),
    ("quote", "Quote"),
    ("image", "Image"),
    ("image_with_copy", "Image with copy"),
    ("document_list", "Document list"),
    ("seminar_list", "Seminar list"),
    ("video_list", "Video list"),
    ("training_countdown", "Next training countdown"),
    ("cohort_availability", "Application cohort availability"),
    ("article_feed", "Article feed"),
    ("event_feed", "Event feed"),
    ("cta_banner", "CTA banner"),
    ("member_directory", "Member directory"),
    ("contact_details", "Contact details"),
    ("partner_logos", "Partner logos"),
    ("profile_gallery", "Profile photos"),
    ("exam_assessment", "Assessment questions"),
)


class CMSMediaAsset(models.Model):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        DOCUMENT = "document", "Document"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"

    class Status(models.TextChoices):
        READY = "ready", "Ready"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to="cms/%Y/%m/")
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=120, blank=True)
    byte_size = models.PositiveBigIntegerField(default=0)
    alt_text = models.CharField(max_length=300, blank=True)
    caption = models.TextField(blank=True)
    credit = models.CharField(max_length=255, blank=True)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.IMAGE)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.READY)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_media_uploads")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_filename


class CMSPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    path = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(unique=True)
    label = models.CharField(max_length=150)
    template_key = models.CharField(max_length=80, default="standard")
    published_revision = models.ForeignKey("CMSPageRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="published_for_pages")
    current_draft_revision = models.ForeignKey("CMSPageRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="draft_for_pages")
    is_system_page = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_pages_created")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_pages_updated")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["label", "path"]

    def __str__(self):
        return self.label


class CMSPageRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    page = models.ForeignKey(CMSPage, on_delete=models.CASCADE, related_name="revisions")
    number = models.PositiveIntegerField()
    state = models.CharField(max_length=12, choices=CMSRevisionState.choices, default=CMSRevisionState.DRAFT)
    eyebrow = models.CharField(max_length=150, blank=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    body = models.TextField(blank=True)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.CharField(max_length=320, blank=True)
    canonical_path = models.CharField(max_length=255, blank=True)
    robots = models.CharField(max_length=80, default="index,follow")
    social_image = models.ForeignKey(CMSMediaAsset, null=True, blank=True, on_delete=models.PROTECT, related_name="page_social_revisions")
    snapshot = models.JSONField(default=dict, blank=True)
    change_summary = models.CharField(max_length=500, blank=True)
    review_note = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_page_revisions_created")
    submitted_at = models.DateTimeField(null=True, blank=True)
    publish_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
        constraints = [models.UniqueConstraint(fields=["page", "number"], name="content_cms_page_revision_number")]

    def __str__(self):
        return f"{self.page.label} r{self.number}"


class CMSPageSection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    revision = models.ForeignKey(CMSPageRevision, on_delete=models.CASCADE, related_name="sections")
    slot = models.CharField(max_length=80, default="main")
    section_type = models.CharField(max_length=40, choices=CMS_SECTION_TYPES)
    position = models.PositiveIntegerField(default=0)
    data = models.JSONField(default=dict, blank=True)
    primary_media = models.ForeignKey(CMSMediaAsset, null=True, blank=True, on_delete=models.PROTECT, related_name="page_sections")
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["slot", "position", "id"]
        constraints = [models.UniqueConstraint(fields=["revision", "slot", "position"], name="content_cms_section_position")]


class CMSCategory(models.Model):
    class Taxonomy(models.TextChoices):
        NEWS = "news", "News"
        INSIGHT = "insight", "Insight"
        EVENT = "event", "Event"
        DOCUMENT = "document", "Document"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    taxonomy = models.CharField(max_length=20, choices=Taxonomy.choices, default=Taxonomy.NEWS)
    name = models.CharField(max_length=120)
    slug = models.SlugField()
    description = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["taxonomy", "position", "name"]
        constraints = [models.UniqueConstraint(fields=["taxonomy", "slug"], name="content_cms_category_taxonomy_slug")]

    def __str__(self):
        return self.name


class CMSArticle(models.Model):
    class ContentType(models.TextChoices):
        NEWS = "news", "News"
        INSIGHT = "insight", "Insight"
        EVENT = "event", "Event"
        NOTICE = "notice", "Notice"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(unique=True)
    content_type = models.CharField(max_length=20, choices=ContentType.choices, default=ContentType.NEWS)
    primary_category = models.ForeignKey(CMSCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="primary_articles")
    categories = models.ManyToManyField(CMSCategory, blank=True, related_name="articles")
    author_display_name = models.CharField(max_length=255, blank=True)
    published_revision = models.ForeignKey("CMSArticleRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="published_for_articles")
    current_draft_revision = models.ForeignKey("CMSArticleRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="draft_for_articles")
    is_deleted = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_articles_created")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_articles_updated")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.slug


class CMSArticleRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    article = models.ForeignKey(CMSArticle, on_delete=models.CASCADE, related_name="revisions")
    number = models.PositiveIntegerField()
    state = models.CharField(max_length=12, choices=CMSRevisionState.choices, default=CMSRevisionState.DRAFT)
    title = models.CharField(max_length=255)
    standfirst = models.TextField(blank=True)
    body = models.TextField(blank=True)
    cover_media = models.ForeignKey(CMSMediaAsset, null=True, blank=True, on_delete=models.PROTECT, related_name="article_cover_revisions")
    gallery_media = models.ManyToManyField(CMSMediaAsset, blank=True, related_name="article_gallery_revisions")
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.CharField(max_length=320, blank=True)
    snapshot = models.JSONField(default=dict, blank=True)
    change_summary = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_article_revisions_created")
    publish_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
        constraints = [models.UniqueConstraint(fields=["article", "number"], name="content_cms_article_revision_number")]


class CMSNavigationMenu(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.SlugField(unique=True)
    label = models.CharField(max_length=120)
    published_revision = models.ForeignKey("CMSNavigationRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="published_for_menus")
    current_draft_revision = models.ForeignKey("CMSNavigationRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="draft_for_menus")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]


class CMSNavigationRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu = models.ForeignKey(CMSNavigationMenu, on_delete=models.CASCADE, related_name="revisions")
    number = models.PositiveIntegerField()
    state = models.CharField(max_length=12, choices=CMSRevisionState.choices, default=CMSRevisionState.DRAFT)
    snapshot = models.JSONField(default=list, blank=True)
    change_summary = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_navigation_revisions_created")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
        constraints = [models.UniqueConstraint(fields=["menu", "number"], name="content_cms_navigation_revision_number")]


class CMSNavigationItem(models.Model):
    class LinkType(models.TextChoices):
        PAGE = "page", "Page"
        INTERNAL = "internal", "Internal path"
        EXTERNAL = "external", "External URL"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    revision = models.ForeignKey(CMSNavigationRevision, on_delete=models.CASCADE, related_name="items")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    position = models.PositiveIntegerField(default=0)
    label = models.CharField(max_length=120)
    link_type = models.CharField(max_length=12, choices=LinkType.choices, default=LinkType.INTERNAL)
    page = models.ForeignKey(CMSPage, null=True, blank=True, on_delete=models.SET_NULL, related_name="navigation_items")
    href = models.CharField(max_length=1000, blank=True)
    open_in_new_tab = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["position", "label"]


class CMSSiteSettings(models.Model):
    """A singleton-like global configuration record with versioned values."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.SlugField(unique=True, default="global")
    published_revision = models.ForeignKey("CMSSiteSettingsRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="published_for_settings")
    current_draft_revision = models.ForeignKey("CMSSiteSettingsRevision", null=True, blank=True, on_delete=models.SET_NULL, related_name="draft_for_settings")
    updated_at = models.DateTimeField(auto_now=True)


class CMSSiteSettingsRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    settings = models.ForeignKey(CMSSiteSettings, on_delete=models.CASCADE, related_name="revisions")
    number = models.PositiveIntegerField()
    state = models.CharField(max_length=12, choices=CMSRevisionState.choices, default=CMSRevisionState.DRAFT)
    data = models.JSONField(default=dict, blank=True)
    change_summary = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(django_settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cms_site_settings_revisions_created")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-number"]
        constraints = [models.UniqueConstraint(fields=["settings", "number"], name="content_cms_settings_revision_number")]


class ContentPage(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(unique=True)
    label = models.CharField(max_length=150)
    eyebrow = models.CharField(max_length=150, blank=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    body = models.TextField(blank=True)
    blocks = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="updated_content_pages")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["label"]

    def publish(self):
        self.status = self.Status.PUBLISHED
        self.published_at = timezone.now()

    def __str__(self):
        return self.label


class ContentItem(models.Model):
    """A reusable, ordered item displayed in one of the site's CMS sections."""

    class Section(models.TextChoices):
        HERO = "hero", "Hero"
        MEMBERSHIP = "membership", "Membership"
        TRAINING = "training", "Training"
        KNOWLEDGE = "knowledge", "Knowledge"
        NEWS = "news", "News"
        EVENTS = "events", "Events"
        SERVICES = "services", "Services"
        PARTNERS = "partners", "Partners"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.CharField(max_length=20, choices=Section.choices)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    # These remain character fields so the CMS supports both internal paths
    # (for example, "/membership") and absolute external URLs.
    href = models.CharField(max_length=1000, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    image_url = models.CharField(max_length=1000, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_content_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["section", "sort_order", "title"]

    def publish(self):
        self.status = self.Status.PUBLISHED
        self.published_at = timezone.now()

    def __str__(self):
        return f"{self.get_section_display()}: {self.title}"
