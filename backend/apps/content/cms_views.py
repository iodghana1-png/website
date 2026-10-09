from __future__ import annotations

import mimetypes

from django.core import signing
from django.db import IntegrityError
from django.db.models import Q
from django.http import FileResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from .cms_permissions import CMSPermission, cms_access
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import record_event

from .cms_revalidation import queue_revalidation
from .cms_serializers import (
    CMSArticleDetailSerializer,
    CMSArticleDraftSerializer,
    CMSArticleListSerializer,
    CMSCategorySerializer,
    CMSMediaAssetSerializer,
    CMSNavigationDraftSerializer,
    CMSNavigationMenuSerializer,
    CMSPublicNavigationMenuSerializer,
    CMSPageDetailSerializer,
    CMSPageDraftSerializer,
    CMSPageListSerializer,
    CMSPageRevisionSerializer,
    CMSPublicArticleSerializer,
    CMSPublicPageSerializer,
    CMSSiteSettingsDraftSerializer,
    CMSSiteSettingsSerializer,
)
from .cms_services import (
    publish_article_revision,
    publish_navigation_revision,
    publish_page_revision,
    publish_settings_revision,
    restore_page_revision,
    save_article_draft,
    save_navigation_draft,
    save_page_draft,
    save_settings_draft,
    unpublish_page,
)
from .models import (
    CMSArticle,
    CMSCategory,
    CMSMediaAsset,
    CMSNavigationMenu,
    CMSPage,
    CMSSiteSettings,
)


def page_or_404(page_id) -> CMSPage:
    page = CMSPage.objects.filter(pk=page_id, is_deleted=False).first()
    if not page:
        raise NotFound("CMS page was not found.")
    return page


def article_or_404(article_id) -> CMSArticle:
    article = CMSArticle.objects.filter(pk=article_id, is_deleted=False).first()
    if not article:
        raise NotFound("CMS article was not found.")
    return article


def settings_record() -> CMSSiteSettings:
    settings, _ = CMSSiteSettings.objects.get_or_create(key="global")
    return settings


def save_event(*, action: str, target_type: str, target, request, metadata: dict | None = None) -> None:
    record_event(action=action, target_type=target_type, target_id=target.id, actor=request.user, request=request, metadata=metadata)


class PublicCMSPageResolveView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: CMSPublicPageSerializer})
    def get(self, request):
        path = request.query_params.get("path", "")
        if path.startswith("/news/") and CMSArticle.objects.filter(slug=path.removeprefix("/news/"), published_revision__isnull=False, is_deleted=False).exists():
            raise NotFound("This address is managed under News.")
        page = (
            CMSPage.objects.select_related("published_revision__social_image")
            .prefetch_related("published_revision__sections__primary_media")
            .filter(path=path, is_deleted=False, published_revision__isnull=False)
            .first()
        )
        if not page:
            raise NotFound("Published CMS page was not found.")
        return Response(CMSPublicPageSerializer(page, context={"request": request}).data)


class PublicCMSPageBySlugView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: CMSPublicPageSerializer})
    def get(self, request, slug):
        page = (
            CMSPage.objects.select_related("published_revision__social_image")
            .prefetch_related("published_revision__sections__primary_media")
            .filter(slug=slug, is_deleted=False, published_revision__isnull=False)
            .first()
        )
        if not page:
            raise NotFound("Published CMS page was not found.")
        return Response(CMSPublicPageSerializer(page, context={"request": request}).data)


class PublicCMSArticleListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: CMSPublicArticleSerializer(many=True)})
    def get(self, request):
        articles = CMSArticle.objects.select_related("primary_category", "published_revision__cover_media").prefetch_related("published_revision__gallery_media").filter(is_deleted=False, published_revision__isnull=False)
        if content_type := request.query_params.get("type"):
            articles = articles.filter(content_type=content_type)
        if category := request.query_params.get("category"):
            articles = articles.filter(
                Q(published_revision__snapshot__category__slug=category)
                | (~Q(published_revision__snapshot__has_key="category") & Q(categories__slug=category))
            ).distinct()
        return Response(CMSPublicArticleSerializer(articles.order_by("-published_revision__published_at", "-updated_at")[:100], many=True, context={"request": request}).data)


class PublicCMSArticleDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: CMSPublicArticleSerializer})
    def get(self, request, slug):
        article = CMSArticle.objects.select_related("primary_category", "published_revision__cover_media").prefetch_related("published_revision__gallery_media").filter(slug=slug, is_deleted=False, published_revision__isnull=False).first()
        if not article:
            raise NotFound("Published CMS article was not found.")
        return Response(CMSPublicArticleSerializer(article, context={"request": request}).data)


class PublicCMSCategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = CMSCategory.objects.filter(is_active=True)
        if taxonomy := request.query_params.get("taxonomy"):
            categories = categories.filter(taxonomy=taxonomy)
        return Response(CMSCategorySerializer(categories, many=True).data)


class PublicCMSNavigationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, key):
        menu = CMSNavigationMenu.objects.select_related("published_revision").prefetch_related("published_revision__items__page").filter(key=key, published_revision__isnull=False).first()
        if not menu:
            raise NotFound("Published navigation menu was not found.")
        return Response(CMSPublicNavigationMenuSerializer(menu).data)


class PublicCMSSiteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        settings = CMSSiteSettings.objects.select_related("published_revision").filter(key="global").first()
        return Response({"settings": settings.published_revision.data if settings and settings.published_revision_id else {}})


class PublicCMSMediaAssetView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, media_id):
        asset = CMSMediaAsset.objects.filter(pk=media_id).first()
        if not asset or not asset.file:
            raise NotFound("CMS media asset was not found.")
        try:
            file_handle = asset.file.open("rb")
        except (FileNotFoundError, OSError):
            raise NotFound("CMS media asset is unavailable.")
        response = FileResponse(
            file_handle,
            as_attachment=False,
            filename=asset.original_filename,
            content_type=asset.mime_type or None,
        )
        response["Cache-Control"] = "public, max-age=3600"
        response["X-Content-Type-Options"] = "nosniff"
        return response


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSPageListView(APIView):
    permission_classes = [CMSPermission]

    @extend_schema(responses={200: CMSPageListSerializer(many=True)})
    def get(self, request):
        pages = CMSPage.objects.select_related("published_revision", "current_draft_revision").filter(is_deleted=False)
        if CMSPage.objects.filter(slug="home").exists():
            pages = pages.exclude(path__startswith="/_cms/home-")
        pages = pages.exclude(path__startswith="/news/", template_key="legacy")
        return Response(CMSPageListSerializer(pages, many=True).data)

    @extend_schema(request=CMSPageDraftSerializer, responses={201: CMSPageDetailSerializer})
    def post(self, request):
        serializer = CMSPageDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if CMSPage.objects.filter(path=data["path"], is_deleted=False).exists():
            raise ValidationError({"path": ["A CMS page already uses this path."]})
        if CMSPage.objects.filter(slug=data["slug"], is_deleted=False).exists():
            raise ValidationError({"slug": ["A CMS page already uses this slug."]})
        page = CMSPage.objects.create(
            path=data["path"], slug=data["slug"], label=data["label"], template_key=data["template_key"],
            created_by=request.user, updated_by=request.user,
        )
        save_page_draft(page=page, data=data, actor=request.user)
        save_event(action="cms.page_created", target_type="cms_page", target=page, request=request)
        page = CMSPage.objects.select_related("published_revision", "current_draft_revision").prefetch_related("revisions__sections").get(pk=page.pk)
        return Response(CMSPageDetailSerializer(page, context={"request": request}).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSPageDetailView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request, page_id):
        page = CMSPage.objects.select_related("published_revision__social_image", "current_draft_revision__social_image").prefetch_related("revisions__sections__primary_media").filter(pk=page_id, is_deleted=False).first()
        if not page:
            raise NotFound("CMS page was not found.")
        return Response(CMSPageDetailSerializer(page, context={"request": request}).data)

    def delete(self, request, page_id):
        page = page_or_404(page_id)
        if page.is_system_page:
            raise ValidationError({"page": ["This protected system page cannot be removed."]})
        path = page.path
        page.is_deleted = True
        page.updated_by = request.user
        page.save(update_fields=["is_deleted", "updated_by", "updated_at"])
        save_event(action="cms.page_deleted", target_type="cms_page", target=page, request=request, metadata={"path": path})
        queue_revalidation(tags=["cms:site", f"cms:page:{page.id}", f"cms:path:{path}"], paths=[path])
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSPageDraftView(APIView):
    permission_classes = [CMSPermission]

    @extend_schema(request=CMSPageDraftSerializer, responses={201: CMSPageRevisionSerializer})
    def post(self, request, page_id):
        page = page_or_404(page_id)
        serializer = CMSPageDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        conflicting = CMSPage.objects.filter(path=data["path"], is_deleted=False).exclude(pk=page.pk).exists()
        if conflicting:
            raise ValidationError({"path": ["A CMS page already uses this path."]})
        conflicting = CMSPage.objects.filter(slug=data["slug"], is_deleted=False).exclude(pk=page.pk).exists()
        if conflicting:
            raise ValidationError({"slug": ["A CMS page already uses this slug."]})
        revision = save_page_draft(page=page, data=data, actor=request.user)
        save_event(action="cms.page_draft_saved", target_type="cms_page", target=page, request=request, metadata={"revision": revision.number})
        return Response(CMSPageRevisionSerializer(revision, context={"request": request}).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSPageRevisionActionView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, page_id, revision_number, action):
        page = page_or_404(page_id)
        if action == "publish":
            revision = publish_page_revision(page=page, revision_number=revision_number)
            save_event(action="cms.page_published", target_type="cms_page", target=page, request=request, metadata={"revision": revision.number})
            queue_revalidation(tags=["cms:site", f"cms:page:{page.id}", f"cms:path:{page.path}"], paths=[page.path])
            return Response(CMSPageRevisionSerializer(revision, context={"request": request}).data)
        if action == "restore":
            revision = restore_page_revision(page=page, revision_number=revision_number, actor=request.user)
            save_event(action="cms.page_restored", target_type="cms_page", target=page, request=request, metadata={"from_revision": revision_number, "revision": revision.number})
            return Response(CMSPageRevisionSerializer(revision, context={"request": request}).data, status=status.HTTP_201_CREATED)
        if action == "preview":
            revision = page.revisions.filter(number=revision_number).first()
            if not revision:
                raise NotFound("CMS page revision was not found.")
            token = signing.dumps({"revision": str(revision.id)}, salt="cms-page-preview", compress=True)
            return Response({"token": token, "revision": CMSPageRevisionSerializer(revision, context={"request": request}).data})
        raise NotFound("CMS action was not found.")


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSPageUnpublishView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, page_id):
        page = page_or_404(page_id)
        unpublish_page(page=page)
        save_event(action="cms.page_unpublished", target_type="cms_page", target=page, request=request)
        queue_revalidation(tags=["cms:site", f"cms:page:{page.id}", f"cms:path:{page.path}"], paths=[page.path])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicCMSPagePreviewView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, revision_id):
        token = request.query_params.get("token", "")
        try:
            claims = signing.loads(token, salt="cms-page-preview", max_age=60 * 60 * 24)
        except signing.BadSignature as error:
            raise NotFound("The preview link has expired.") from error
        if claims.get("revision") != str(revision_id):
            raise NotFound("The preview link is not valid for this revision.")
        from .models import CMSPageRevision

        page_revision = CMSPageRevision.objects.select_related("page", "social_image").prefetch_related("sections__primary_media").filter(pk=revision_id).first()
        if not page_revision:
            raise NotFound("CMS page revision was not found.")
        payload = CMSPageRevisionSerializer(page_revision, context={"request": request}).data
        return Response({"id": str(page_revision.page_id), "path": page_revision.page.path, "slug": page_revision.page.slug, "template_key": page_revision.page.template_key, "revision": payload}, headers={"Cache-Control": "private, no-store"})


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSMediaListView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request):
        return Response(CMSMediaAssetSerializer(CMSMediaAsset.objects.all(), many=True, context={"request": request}).data)

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            raise ValidationError({"file": ["Choose a file to upload."]})
        upload = CMSMediaAssetSerializer().validate_file(upload)
        if upload.size > 20 * 1024 * 1024:
            raise ValidationError({"file": ["Files must be 20 MB or smaller."]})
        mime_type = upload.content_type or mimetypes.guess_type(upload.name)[0] or "application/octet-stream"
        if not (mime_type.startswith("image/") or mime_type.startswith("audio/") or mime_type.startswith("video/") or mime_type == "application/pdf"):
            raise ValidationError({"file": ["Only images, PDFs, audio and video files are accepted."]})
        kind = "image" if mime_type.startswith("image/") else "audio" if mime_type.startswith("audio/") else "video" if mime_type.startswith("video/") else "document"
        asset = CMSMediaAsset.objects.create(file=upload, original_filename=upload.name[:255], mime_type=mime_type, byte_size=upload.size, kind=kind, uploaded_by=request.user)
        save_event(action="cms.media_uploaded", target_type="cms_media", target=asset, request=request)
        return Response(CMSMediaAssetSerializer(asset, context={"request": request}).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSMediaDetailView(APIView):
    permission_classes = [CMSPermission]

    def patch(self, request, media_id):
        asset = CMSMediaAsset.objects.filter(pk=media_id).first()
        if not asset:
            raise NotFound("CMS media asset was not found.")
        serializer = CMSMediaAssetSerializer(asset, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        asset = serializer.save()
        if upload := serializer.validated_data.get("file"):
            asset.original_filename = upload.name[:255]
            asset.mime_type = upload.content_type or ""
            asset.byte_size = upload.size
            asset.kind = "image" if asset.mime_type.startswith("image/") else "audio" if asset.mime_type.startswith("audio/") else "video" if asset.mime_type.startswith("video/") else "document"
            asset.save()
        save_event(action="cms.media_updated", target_type="cms_media", target=asset, request=request)
        return Response(CMSMediaAssetSerializer(asset, context={"request": request}).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSCategoryListView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request):
        return Response(CMSCategorySerializer(CMSCategory.objects.all(), many=True).data)

    def post(self, request):
        serializer = CMSCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        save_event(action="cms.category_created", target_type="cms_category", target=category, request=request)
        return Response(CMSCategorySerializer(category).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSCategoryDetailView(APIView):
    permission_classes = [CMSPermission]

    def patch(self, request, category_id):
        category = CMSCategory.objects.filter(pk=category_id).first()
        if not category:
            raise NotFound("CMS category was not found.")
        serializer = CMSCategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        save_event(action="cms.category_updated", target_type="cms_category", target=category, request=request)
        return Response(CMSCategorySerializer(category).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSArticleListView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request):
        articles = CMSArticle.objects.select_related("primary_category", "published_revision", "current_draft_revision").filter(is_deleted=False)
        return Response(CMSArticleListSerializer(articles, many=True).data)

    def post(self, request):
        serializer = CMSArticleDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if CMSArticle.objects.filter(slug=data["slug"], is_deleted=False).exists():
            raise ValidationError({"slug": ["An article already uses this slug."]})
        article = CMSArticle.objects.create(slug=data["slug"], content_type=data["content_type"], primary_category=data.get("primary_category"), author_display_name=data.get("author_display_name", ""), created_by=request.user, updated_by=request.user)
        save_article_draft(article=article, data=data, actor=request.user)
        save_event(action="cms.article_created", target_type="cms_article", target=article, request=request)
        article = CMSArticle.objects.select_related("published_revision", "current_draft_revision", "primary_category").prefetch_related("categories", "revisions__cover_media", "revisions__gallery_media").get(pk=article.pk)
        return Response(CMSArticleDetailSerializer(article, context={"request": request}).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSArticleDetailView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request, article_id):
        article = CMSArticle.objects.select_related("published_revision__cover_media", "current_draft_revision__cover_media", "primary_category").prefetch_related("categories", "revisions__cover_media", "revisions__gallery_media").filter(pk=article_id, is_deleted=False).first()
        if not article:
            raise NotFound("CMS article was not found.")
        return Response(CMSArticleDetailSerializer(article, context={"request": request}).data)

    def delete(self, request, article_id):
        article = article_or_404(article_id)
        slug = article.slug
        content_type = article.content_type
        article.is_deleted = True
        article.updated_by = request.user
        article.save(update_fields=["is_deleted", "updated_by", "updated_at"])
        save_event(action="cms.article_deleted", target_type="cms_article", target=article, request=request, metadata={"slug": slug, "content_type": content_type})
        queue_revalidation(tags=["cms:site", f"cms:article:{article.id}", f"cms:articles:{content_type}"], paths=["/news", f"/news/{slug}"])
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSArticleDraftView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, article_id):
        article = article_or_404(article_id)
        serializer = CMSArticleDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if CMSArticle.objects.filter(slug=data["slug"], is_deleted=False).exclude(pk=article.pk).exists():
            raise ValidationError({"slug": ["An article already uses this slug."]})
        revision = save_article_draft(article=article, data=data, actor=request.user)
        save_event(action="cms.article_draft_saved", target_type="cms_article", target=article, request=request, metadata={"revision": revision.number})
        from .cms_serializers import CMSArticleRevisionSerializer

        return Response(CMSArticleRevisionSerializer(revision, context={"request": request}).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSArticlePublishView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, article_id, revision_number):
        article = article_or_404(article_id)
        revision = publish_article_revision(article=article, revision_number=revision_number)
        save_event(action="cms.article_published", target_type="cms_article", target=article, request=request, metadata={"revision": revision.number})
        queue_revalidation(tags=["cms:site", f"cms:article:{article.id}", f"cms:articles:{article.content_type}"], paths=[f"/news/{article.slug}"])
        from .cms_serializers import CMSArticleRevisionSerializer

        return Response(CMSArticleRevisionSerializer(revision, context={"request": request}).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSNavigationListView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request):
        menus = CMSNavigationMenu.objects.select_related("published_revision", "current_draft_revision")
        return Response(CMSNavigationMenuSerializer(menus, many=True).data)

    def post(self, request):
        key = request.data.get("key", "")
        label = request.data.get("label", "")
        if not key or not label:
            raise ValidationError({"key": ["Enter a menu key."], "label": ["Enter a menu label."]})
        try:
            menu = CMSNavigationMenu.objects.create(key=key, label=label)
        except IntegrityError as error:
            raise ValidationError({"key": ["A navigation menu already uses this key."]}) from error
        save_event(action="cms.navigation_created", target_type="cms_navigation", target=menu, request=request)
        return Response(CMSNavigationMenuSerializer(menu).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSNavigationDetailView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request, menu_id):
        menu = CMSNavigationMenu.objects.select_related("published_revision", "current_draft_revision").prefetch_related("published_revision__items", "current_draft_revision__items").filter(pk=menu_id).first()
        if not menu:
            raise NotFound("CMS navigation menu was not found.")
        return Response(CMSNavigationMenuSerializer(menu).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSNavigationDraftView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, menu_id):
        menu = CMSNavigationMenu.objects.filter(pk=menu_id).first()
        if not menu:
            raise NotFound("CMS navigation menu was not found.")
        serializer = CMSNavigationDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        revision = save_navigation_draft(menu=menu, data=serializer.validated_data, actor=request.user)
        save_event(action="cms.navigation_draft_saved", target_type="cms_navigation", target=menu, request=request, metadata={"revision": revision.number})
        return Response(CMSNavigationMenuSerializer(CMSNavigationMenu.objects.select_related("current_draft_revision").prefetch_related("current_draft_revision__items").get(pk=menu.pk)).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSNavigationPublishView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, menu_id, revision_number):
        menu = CMSNavigationMenu.objects.filter(pk=menu_id).first()
        if not menu:
            raise NotFound("CMS navigation menu was not found.")
        revision = publish_navigation_revision(menu=menu, revision_number=revision_number)
        save_event(action="cms.navigation_published", target_type="cms_navigation", target=menu, request=request, metadata={"revision": revision.number})
        queue_revalidation(tags=["cms:site", f"cms:navigation:{menu.key}"], paths=["/"])
        return Response(CMSNavigationMenuSerializer(CMSNavigationMenu.objects.select_related("published_revision").prefetch_related("published_revision__items").get(pk=menu.pk)).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSSiteSettingsView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request):
        return Response(CMSSiteSettingsSerializer(settings_record()).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSSiteSettingsDraftView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request):
        serializer = CMSSiteSettingsDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        settings = settings_record()
        revision = save_settings_draft(settings=settings, data=serializer.validated_data, actor=request.user)
        save_event(action="cms.settings_draft_saved", target_type="cms_settings", target=settings, request=request, metadata={"revision": revision.number})
        return Response(CMSSiteSettingsSerializer(CMSSiteSettings.objects.select_related("current_draft_revision").get(pk=settings.pk)).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffCMSSiteSettingsPublishView(APIView):
    permission_classes = [CMSPermission]

    def post(self, request, revision_number):
        settings = settings_record()
        revision = publish_settings_revision(settings=settings, revision_number=revision_number)
        save_event(action="cms.settings_published", target_type="cms_settings", target=settings, request=request, metadata={"revision": revision.number})
        queue_revalidation(tags=["cms:site"], paths=["/"])
        return Response(CMSSiteSettingsSerializer(CMSSiteSettings.objects.select_related("published_revision").get(pk=settings.pk)).data)

class StaffCMSAccessView(APIView):
    permission_classes = [CMSPermission]

    def get(self, request):
        return Response(cms_access(request.user))

