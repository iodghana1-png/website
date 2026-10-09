from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsContentEditor
from apps.audit.services import record_event

from .models import ContentItem, ContentPage
from .serializers import ContentItemSerializer, ContentPageSerializer, PublicContentItemQuerySerializer, StaffContentItemListQuerySerializer


class PublicContentPageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        page = ContentPage.objects.filter(slug=slug, status=ContentPage.Status.PUBLISHED).first()
        if not page:
            raise NotFound("Published content was not found.")
        return Response(ContentPageSerializer(page, context={"request": request}).data)


class StaffContentPageListView(APIView):
    permission_classes = [IsContentEditor]

    def get(self, request):
        return Response(ContentPageSerializer(ContentPage.objects.all(), many=True, context={"request": request}).data)

    def post(self, request):
        serializer = ContentPageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        page = serializer.save(updated_by=request.user, published_at=timezone.now() if serializer.validated_data.get("status") == ContentPage.Status.PUBLISHED else None)
        record_event(action="content.page_created", target_type="content_page", target_id=page.id, actor=request.user, request=request)
        return Response(ContentPageSerializer(page, context={"request": request}).data, status=status.HTTP_201_CREATED)


class StaffContentPageDetailView(APIView):
    permission_classes = [IsContentEditor]

    def patch(self, request, pk):
        try:
            page = ContentPage.objects.get(pk=pk)
        except ContentPage.DoesNotExist:
            raise NotFound("Content page was not found.")
        serializer = ContentPageSerializer(page, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        is_publishing = serializer.validated_data.get("status") == ContentPage.Status.PUBLISHED and page.status != ContentPage.Status.PUBLISHED
        page = serializer.save(updated_by=request.user, published_at=timezone.now() if is_publishing else page.published_at)
        record_event(action="content.page_updated", target_type="content_page", target_id=page.id, actor=request.user, request=request)
        return Response(ContentPageSerializer(page, context={"request": request}).data)


class PublicContentItemListView(APIView):
    """Return the published items for a single public CMS section."""

    permission_classes = [AllowAny]

    @extend_schema(
        operation_id="public_content_item_list",
        parameters=[
            OpenApiParameter(
                name="section",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                enum=[section.value for section in ContentItem.Section],
            ),
        ],
        responses={200: ContentItemSerializer(many=True)},
    )
    def get(self, request):
        query = PublicContentItemQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        items = ContentItem.objects.filter(
            section=query.validated_data["section"],
            status=ContentItem.Status.PUBLISHED,
        ).order_by("sort_order", "title", "id")
        return Response(ContentItemSerializer(items, many=True, context={"request": request}).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffContentItemListView(APIView):
    permission_classes = [IsContentEditor]

    @extend_schema(
        operation_id="staff_content_item_list",
        parameters=[
            OpenApiParameter(
                name="section",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                enum=[section.value for section in ContentItem.Section],
            ),
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                enum=[item_status.value for item_status in ContentItem.Status],
            ),
        ],
        responses={200: ContentItemSerializer(many=True)},
    )
    def get(self, request):
        query = StaffContentItemListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        items = ContentItem.objects.all()
        if section := query.validated_data.get("section"):
            items = items.filter(section=section)
        if item_status := query.validated_data.get("status"):
            items = items.filter(status=item_status)
        return Response(ContentItemSerializer(items.order_by("section", "sort_order", "title", "id"), many=True, context={"request": request}).data)

    @extend_schema(
        operation_id="staff_content_item_create",
        request=ContentItemSerializer,
        responses={201: ContentItemSerializer},
    )
    def post(self, request):
        serializer = ContentItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(
            updated_by=request.user,
            published_at=timezone.now() if serializer.validated_data.get("status") == ContentItem.Status.PUBLISHED else None,
        )
        record_event(action="content.item_created", target_type="content_item", target_id=item.id, actor=request.user, request=request)
        return Response(ContentItemSerializer(item, context={"request": request}).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffContentItemDetailView(APIView):
    permission_classes = [IsContentEditor]

    def get_object(self, pk):
        try:
            return ContentItem.objects.get(pk=pk)
        except ContentItem.DoesNotExist:
            raise NotFound("Content item was not found.")

    @extend_schema(operation_id="staff_content_item_retrieve", responses={200: ContentItemSerializer})
    def get(self, request, pk):
        return Response(ContentItemSerializer(self.get_object(pk), context={"request": request}).data)

    @extend_schema(
        operation_id="staff_content_item_update",
        request=ContentItemSerializer,
        responses={200: ContentItemSerializer},
    )
    def patch(self, request, pk):
        item = self.get_object(pk)
        serializer = ContentItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        is_publishing = (
            serializer.validated_data.get("status") == ContentItem.Status.PUBLISHED
            and item.status != ContentItem.Status.PUBLISHED
        )
        item = serializer.save(
            updated_by=request.user,
            published_at=timezone.now() if is_publishing else item.published_at,
        )
        record_event(action="content.item_updated", target_type="content_item", target_id=item.id, actor=request.user, request=request)
        return Response(ContentItemSerializer(item, context={"request": request}).data)

    @extend_schema(operation_id="staff_content_item_delete", responses={204: OpenApiTypes.NONE})
    def delete(self, request, pk):
        item = self.get_object(pk)
        item_id = item.id
        item.delete()
        record_event(action="content.item_deleted", target_type="content_item", target_id=item_id, actor=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)
