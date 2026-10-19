import hashlib
import hmac
from datetime import timedelta

from django.conf import settings
from django.db import DatabaseError, connection
from django.db.models import Count
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.serializers import CharField, Serializer
from apps.common.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from .email import send_institutional_email
from .models import AnalyticsDailyVisitor, AnalyticsPageView
from .serializers import AnalyticsVisitSerializer, ContactEnquiryCreateSerializer, ContactEnquiryResponseSerializer, DocumentRequestCreateSerializer, DocumentRequestResponseSerializer


class HealthResponseSerializer(Serializer):
    status = CharField()
    service = CharField()
    version = CharField()


@extend_schema(responses=HealthResponseSerializer)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    try:
        connection.ensure_connection()
    except DatabaseError:
        return Response({"status": "unavailable", "service": "iod-gh-api", "version": "v1"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"status": "ok", "service": "iod-gh-api", "version": "v1"})


@method_decorator(csrf_protect, name="dispatch")
class ContactEnquiryCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact_enquiry"

    @extend_schema(request=ContactEnquiryCreateSerializer, responses={201: ContactEnquiryResponseSerializer})
    def post(self, request):
        serializer = ContactEnquiryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()

        send_institutional_email(
            subject=f"New IoD-Gh website enquiry — {enquiry.enquiry_type}",
            recipient=settings.CONTACT_ENQUIRY_RECIPIENTS,
            recipient_name="IoD-Gh Team",
            heading="A new website enquiry has arrived.",
            introduction="A visitor has submitted an enquiry through the IoD-Gh website.",
            details=(
                ("Enquiry type", enquiry.enquiry_type),
                ("Name", enquiry.full_name),
                ("Email address", enquiry.email),
                ("Phone number", enquiry.phone_number or "Not provided"),
                ("Message", enquiry.message),
            ),
            closing="You can reply directly to this email to respond to the enquirer.",
            reply_to=(enquiry.email,),
        )
        send_institutional_email(
            subject="We received your IoD-Gh enquiry",
            recipient=enquiry.email,
            recipient_name=enquiry.full_name,
            heading="Thank you for contacting IoD-Gh.",
            introduction="We have received your enquiry and the appropriate IoD-Gh team will be in touch.",
            details=(("Enquiry type", enquiry.enquiry_type),),
            closing="Thank you for your interest in the Institute of Directors-Ghana.",
        )
        return Response(ContactEnquiryResponseSerializer(enquiry).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class DocumentRequestCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "document_request"

    @extend_schema(request=DocumentRequestCreateSerializer, responses={201: DocumentRequestResponseSerializer})
    def post(self, request):
        serializer = DocumentRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document_request = serializer.save()
        request_label = document_request.get_request_type_display()

        send_institutional_email(
            subject=f"New IoD-Gh {request_label.lower()} request",
            recipient=settings.DOCUMENT_REQUEST_RECIPIENTS,
            recipient_name="IoD-Gh Team",
            heading="A new document request has arrived.",
            introduction="A client has requested a document through the IoD-Gh website.",
            details=(
                ("Request", request_label),
                ("Name", document_request.full_name),
                ("Email address", document_request.email),
                ("Phone number", document_request.phone_number),
                ("Membership number", document_request.membership_number or "Not provided"),
                ("Programme, course or membership", document_request.programme),
                ("Address the document to", document_request.addressee or "Not specified"),
                ("Purpose or details", document_request.purpose),
            ),
            closing="You can reply directly to this email to follow up with the client.",
            reply_to=(document_request.email,),
        )
        send_institutional_email(
            subject=f"We received your IoD-Gh {request_label.lower()} request",
            recipient=document_request.email,
            recipient_name=document_request.full_name,
            heading="Your request is with us.",
            introduction=f"We have received your request for an IoD-Gh {request_label.lower()}.",
            details=(("Request", request_label), ("Programme, course or membership", document_request.programme)),
            closing="Our team will verify the details and contact you if anything further is needed.",
        )
        return Response(DocumentRequestResponseSerializer(document_request).data, status=status.HTTP_201_CREATED)


def device_type(user_agent: str) -> str:
    value = user_agent.lower()
    if "ipad" in value or "tablet" in value:
        return "tablet"
    if any(marker in value for marker in ("mobi", "iphone", "android")):
        return "mobile"
    if value:
        return "desktop"
    return "other"


def daily_visitor_hash(request, date) -> str:
    # This marker is deliberately rotated each day and is never returned or stored with source data.
    source = "|".join((date.isoformat(), request.META.get("REMOTE_ADDR", ""), request.META.get("HTTP_USER_AGENT", "")))
    return hmac.new(settings.SECRET_KEY.encode(), source.encode(), hashlib.sha256).hexdigest()


class AnalyticsVisitCreateView(APIView):
    """Accept a public page view without cookies or persistent visitor identifiers."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics_visit"

    @extend_schema(request=AnalyticsVisitSerializer, responses={201: None})
    def post(self, request):
        serializer = AnalyticsVisitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        path = serializer.validated_data["path"]
        if any(path == prefix or path.startswith(f"{prefix}/") for prefix in ("/admin", "/member", "/api", "/_next")):
            return Response(status=status.HTTP_204_NO_CONTENT)

        today = timezone.localdate()
        cutoff = today - timedelta(days=90)
        AnalyticsDailyVisitor.objects.filter(date__lt=cutoff).delete()
        AnalyticsPageView.objects.filter(date__lt=cutoff).delete()
        AnalyticsDailyVisitor.objects.get_or_create(date=today, visitor_hash=daily_visitor_hash(request, today))
        AnalyticsPageView.objects.create(
            date=today,
            path=path,
            referrer_host=serializer.validated_data.get("referrer", ""),
            device_type=device_type(request.META.get("HTTP_USER_AGENT", "")),
        )
        return Response(status=status.HTTP_201_CREATED)


class AnalyticsReportView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(responses={200: None})
    def get(self, request):
        try:
            days = int(request.query_params.get("days", "30"))
        except ValueError:
            days = 30
        days = min(max(days, 7), 90)
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        views = AnalyticsPageView.objects.filter(date__gte=start)
        visitors = AnalyticsDailyVisitor.objects.filter(date__gte=start)
        daily_views = {row["date"].isoformat(): row["page_views"] for row in views.values("date").annotate(page_views=Count("id"))}
        daily_visitors = {row["date"].isoformat(): row["unique_visitors"] for row in visitors.values("date").annotate(unique_visitors=Count("id"))}
        daily = []
        for offset in range(days):
            date = start + timedelta(days=offset)
            key = date.isoformat()
            daily.append({"date": key, "page_views": daily_views.get(key, 0), "unique_visitors": daily_visitors.get(key, 0)})
        return Response({
            "range": {"from": start, "to": today, "days": days},
            "totals": {"page_views": views.count(), "unique_daily_visitors": visitors.count()},
            "today": {"page_views": daily_views.get(today.isoformat(), 0), "unique_visitors": daily_visitors.get(today.isoformat(), 0)},
            "daily": daily,
            "pages": list(views.values("path").annotate(page_views=Count("id")).order_by("-page_views", "path")[:8]),
            "referrers": list(views.exclude(referrer_host="").values("referrer_host").annotate(page_views=Count("id")).order_by("-page_views", "referrer_host")[:8]),
            "devices": list(views.values("device_type").annotate(page_views=Count("id")).order_by("-page_views", "device_type")),
        })
