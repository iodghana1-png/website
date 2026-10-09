from __future__ import annotations

from uuid import uuid4

from django.db.models import Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.common.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.accounts.permissions import IsDirectoryManager, IsMembershipOfficer
from apps.audit.services import record_event

from .models import MemberDirectoryEntry, MemberProfile, MembershipApplication, MembershipRenewal, MembershipStatusHistory, MembershipType
from .notifications import send_application_decision_email, send_application_received_email, send_application_submitted_to_staff_email, send_renewal_created_email
from .serializers import ApplicationApprovalSerializer, ApplicationRejectionSerializer, ApplicationReviewSerializer, MemberDirectoryBulkPublishSerializer, MemberDirectoryEntrySerializer, MemberProfileSerializer, MemberProfileUpdateSerializer, MemberStatusUpdateSerializer, MembershipApplicationStaffSerializer, MembershipApplicationSubmitSerializer, MembershipApplicationTrackingSerializer, MembershipRenewalCreateSerializer, MembershipRenewalSerializer, MembershipStatusHistorySerializer, MembershipTypeSerializer, PublicMemberVerificationSerializer
from .services import approve_application, reject_application


class MembershipTypeListView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsMembershipOfficer()]

    @extend_schema(responses={200: MembershipTypeSerializer(many=True)})
    def get(self, request):
        return Response(MembershipTypeSerializer(MembershipType.objects.filter(is_active=True), many=True).data)

    @extend_schema(request=MembershipTypeSerializer, responses={201: MembershipTypeSerializer})
    def post(self, request):
        serializer = MembershipTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership_type = serializer.save()
        record_event(action="membership.type_created", target_type="membership_type", target_id=membership_type.id, actor=request.user, request=request)
        return Response(MembershipTypeSerializer(membership_type).data, status=status.HTTP_201_CREATED)


class MembershipTypeDetailView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsMembershipOfficer()]

    def get_object(self, pk):
        queryset = MembershipType.objects.all() if self.request.user.is_authenticated and IsMembershipOfficer().has_permission(self.request, self) else MembershipType.objects.filter(is_active=True)
        try:
            return queryset.get(pk=pk)
        except MembershipType.DoesNotExist:
            raise NotFound()

    @extend_schema(responses={200: MembershipTypeSerializer})
    def get(self, request, pk):
        return Response(MembershipTypeSerializer(self.get_object(pk)).data)

    @extend_schema(request=MembershipTypeSerializer, responses={200: MembershipTypeSerializer})
    def patch(self, request, pk):
        membership_type = self.get_object(pk)
        serializer = MembershipTypeSerializer(membership_type, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        membership_type = serializer.save()
        record_event(action="membership.type_updated", target_type="membership_type", target_id=membership_type.id, actor=request.user, request=request)
        return Response(MembershipTypeSerializer(membership_type).data)


@method_decorator(csrf_protect, name="dispatch")
class MembershipApplicationCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "membership_application"

    @extend_schema(request=MembershipApplicationSubmitSerializer, responses={201: MembershipApplicationTrackingSerializer})
    def post(self, request):
        serializer = MembershipApplicationSubmitSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        data = MembershipApplicationTrackingSerializer(application).data
        data["tracking_token"] = application._tracking_token
        record_event(action="membership.application_submitted", target_type="membership_application", target_id=application.id, actor=request.user, request=request)
        cv_upload = application._cv_upload
        try:
            send_application_received_email(application)
            send_application_submitted_to_staff_email(application, cv_upload)
        finally:
            cv_upload.close()
        return Response(data, status=status.HTTP_201_CREATED)


class MembershipApplicationTrackingView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(parameters=[OpenApiParameter(name="X-Application-Access-Token", location=OpenApiParameter.HEADER, required=False, type=OpenApiTypes.STR)], responses={200: MembershipApplicationTrackingSerializer})
    def get(self, request, reference):
        application = MembershipApplication.objects.select_related("assigned_type", "user").filter(reference=reference).first()
        if not application:
            raise NotFound()
        is_owner = request.user.is_authenticated and application.user_id == request.user.id
        token = request.headers.get("X-Application-Access-Token", "")
        if not is_owner and (not token or not application.tracking_token_is_valid(token)):
            raise NotFound()
        return Response(MembershipApplicationTrackingSerializer(application).data)


@method_decorator(csrf_protect, name="dispatch")
class MyMemberProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_member(self, user):
        try:
            return user.member_profile
        except MemberProfile.DoesNotExist:
            raise NotFound("No member profile is associated with this account.")

    @extend_schema(responses={200: MemberProfileSerializer})
    def get(self, request):
        return Response(MemberProfileSerializer(self.get_member(request.user)).data)

    @extend_schema(request=MemberProfileUpdateSerializer, responses={200: MemberProfileSerializer})
    def patch(self, request):
        member = self.get_member(request.user)
        serializer = MemberProfileUpdateSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        record_event(action="membership.member_profile_updated", target_type="member", target_id=member.id, actor=request.user, request=request)
        return Response(MemberProfileSerializer(member).data)


class MyRenewalsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MembershipRenewalSerializer(many=True)})
    def get(self, request):
        try:
            renewals = request.user.member_profile.renewals.all()
        except MemberProfile.DoesNotExist:
            raise NotFound("No member profile is associated with this account.")
        return Response(MembershipRenewalSerializer(renewals, many=True).data)


class PublicMemberVerificationView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(parameters=[OpenApiParameter(name="member_name", required=True, type=OpenApiTypes.STR)], responses={200: PublicMemberVerificationSerializer(many=True)})
    def get(self, request):
        member_name = " ".join(request.query_params.get("member_name", "").split())
        if not member_name:
            raise ValidationError({"member_name": ["This query parameter is required."]})

        name_query = Q()
        for name_part in member_name.split(" "):
            name_query &= Q(full_name__icontains=name_part)
        entries = MemberDirectoryEntry.objects.filter(is_published=True).filter(name_query).order_by("full_name")[:12]
        if not entries:
            raise NotFound("No member was found in the published Members in Good Standing register.")
        return Response(PublicMemberVerificationSerializer(entries, many=True).data)


class PublicDirectoryView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(parameters=[OpenApiParameter(name="q", required=False, type=OpenApiTypes.STR)], responses={200: MemberDirectoryEntrySerializer(many=True)})
    def get(self, request):
        entries = MemberDirectoryEntry.objects.filter(is_published=True).order_by("designation", "full_name")
        query = request.query_params.get("q", "").strip()
        if query:
            entries = entries.filter(full_name__icontains=query)
        return Response(MemberDirectoryEntrySerializer(entries, many=True).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffDirectoryListView(APIView):
    permission_classes = [IsDirectoryManager]

    @extend_schema(responses={200: MemberDirectoryEntrySerializer(many=True)})
    def get(self, request):
        return Response(MemberDirectoryEntrySerializer(MemberDirectoryEntry.objects.all(), many=True).data)

    @extend_schema(request=MemberDirectoryEntrySerializer, responses={201: MemberDirectoryEntrySerializer})
    def post(self, request):
        serializer = MemberDirectoryEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        record_event(action="membership.directory_entry_created", target_type="member_directory_entry", target_id=entry.id, actor=request.user, request=request)
        return Response(MemberDirectoryEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffDirectoryDetailView(APIView):
    permission_classes = [IsDirectoryManager]

    def get_object(self, pk):
        try:
            return MemberDirectoryEntry.objects.get(pk=pk)
        except MemberDirectoryEntry.DoesNotExist:
            raise NotFound("Directory entry was not found.")

    @extend_schema(request=MemberDirectoryEntrySerializer, responses={200: MemberDirectoryEntrySerializer})
    def patch(self, request, pk):
        entry = self.get_object(pk)
        serializer = MemberDirectoryEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        record_event(action="membership.directory_entry_updated", target_type="member_directory_entry", target_id=entry.id, actor=request.user, request=request)
        return Response(MemberDirectoryEntrySerializer(entry).data)

    def delete(self, request, pk):
        entry = self.get_object(pk)
        entry_id = entry.id
        entry.delete()
        record_event(action="membership.directory_entry_deleted", target_type="member_directory_entry", target_id=entry_id, actor=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class StaffDirectoryBulkPublicationView(APIView):
    permission_classes = [IsDirectoryManager]

    @extend_schema(request=MemberDirectoryBulkPublishSerializer, responses={200: dict})
    def patch(self, request):
        serializer = MemberDirectoryBulkPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entries = MemberDirectoryEntry.objects.all()
        designation = serializer.validated_data.get("designation")
        if designation:
            entries = entries.filter(designation=designation)
        if "current_state" in serializer.validated_data:
            entries = entries.filter(is_published=serializer.validated_data["current_state"])
        updated = entries.update(is_published=serializer.validated_data["is_published"])
        record_event(action="membership.directory_bulk_publication_updated", target_type="member_directory", actor=request.user, request=request, metadata={"updated": updated, "designation": designation, "is_published": serializer.validated_data["is_published"]})
        return Response({"updated": updated})


class StaffApplicationListView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(parameters=[OpenApiParameter(name="status", required=False, type=OpenApiTypes.STR)], responses={200: MembershipApplicationStaffSerializer(many=True)})
    def get(self, request):
        applications = MembershipApplication.objects.select_related("assigned_type", "reviewed_by").all()
        requested_status = request.query_params.get("status")
        if requested_status:
            applications = applications.filter(status=requested_status)
        return Response(MembershipApplicationStaffSerializer(applications, many=True).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffApplicationReviewView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(request=ApplicationReviewSerializer, responses={200: MembershipApplicationStaffSerializer})
    def post(self, request, reference):
        application = MembershipApplication.objects.filter(reference=reference).first()
        if not application:
            raise NotFound()
        if application.status != MembershipApplication.Status.SUBMITTED:
            raise ValidationError({"status": ["Only submitted applications can move to review."]})
        serializer = ApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application.status = MembershipApplication.Status.UNDER_REVIEW
        application.internal_notes = serializer.validated_data.get("internal_notes", application.internal_notes)
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save(update_fields=["status", "internal_notes", "reviewed_by", "reviewed_at", "updated_at"])
        record_event(action="membership.application_under_review", target_type="membership_application", target_id=application.id, actor=request.user, request=request)
        return Response(MembershipApplicationStaffSerializer(application).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffApplicationReceiptEmailView(APIView):
    """Allow membership staff to retry a client's application receipt on request."""

    permission_classes = [IsMembershipOfficer]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "membership_application_email_resend"

    @extend_schema(request=None, responses={204: OpenApiTypes.NONE})
    def post(self, request, reference):
        application = MembershipApplication.objects.filter(reference=reference).first()
        if not application:
            raise NotFound()
        send_application_received_email(
            application,
            idempotency_key=f"membership-receipt-resend/{application.reference}/{uuid4().hex}",
        )
        record_event(
            action="membership.application_receipt_resent",
            target_type="membership_application",
            target_id=application.id,
            actor=request.user,
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class StaffApplicationApproveView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(request=ApplicationApprovalSerializer, responses={201: MemberProfileSerializer})
    def post(self, request, reference):
        application = MembershipApplication.objects.filter(reference=reference).first()
        if not application:
            raise NotFound()
        serializer = ApplicationApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = approve_application(application=application, reviewer=request.user, **serializer.validated_data)
        application.refresh_from_db()
        record_event(action="membership.application_approved", target_type="membership_application", target_id=application.id, actor=request.user, request=request, metadata={"member_id": str(member.id)})
        send_application_decision_email(application, member)
        return Response(MemberProfileSerializer(member).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class StaffApplicationRejectView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(request=ApplicationRejectionSerializer, responses={200: MembershipApplicationStaffSerializer})
    def post(self, request, reference):
        application = MembershipApplication.objects.filter(reference=reference).first()
        if not application:
            raise NotFound()
        serializer = ApplicationRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = reject_application(application=application, reviewer=request.user, reason=serializer.validated_data["reason"])
        record_event(action="membership.application_rejected", target_type="membership_application", target_id=application.id, actor=request.user, request=request)
        send_application_decision_email(application)
        return Response(MembershipApplicationStaffSerializer(application).data)


class StaffMemberListView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(parameters=[OpenApiParameter(name="status", required=False, type=OpenApiTypes.STR)], responses={200: MemberProfileSerializer(many=True)})
    def get(self, request):
        members = MemberProfile.objects.select_related("membership_type").all()
        requested_status = request.query_params.get("status")
        if requested_status:
            members = members.filter(status=requested_status)
        return Response(MemberProfileSerializer(members, many=True).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffMemberStatusView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(request=MemberStatusUpdateSerializer, responses={200: MemberProfileSerializer})
    def patch(self, request, membership_number):
        try:
            member = MemberProfile.objects.select_related("membership_type").get(membership_number=membership_number)
        except MemberProfile.DoesNotExist:
            raise NotFound()
        serializer = MemberStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_status = member.status
        member.status = serializer.validated_data["status"]
        if "is_publicly_listed" in serializer.validated_data:
            member.is_publicly_listed = serializer.validated_data["is_publicly_listed"]
        member.save(update_fields=["status", "is_publicly_listed", "updated_at"])
        MembershipStatusHistory.objects.create(member=member, previous_status=previous_status, new_status=member.status, changed_by=request.user, reason=serializer.validated_data.get("reason", ""))
        record_event(action="membership.member_status_updated", target_type="member", target_id=member.id, actor=request.user, request=request)
        return Response(MemberProfileSerializer(member).data)


class StaffMemberStatusHistoryView(APIView):
    permission_classes = [IsMembershipOfficer]

    @extend_schema(responses={200: MembershipStatusHistorySerializer(many=True)})
    def get(self, request, membership_number):
        try:
            member = MemberProfile.objects.get(membership_number=membership_number)
        except MemberProfile.DoesNotExist:
            raise NotFound()
        return Response(MembershipStatusHistorySerializer(member.status_history.select_related("changed_by"), many=True).data)


@method_decorator(csrf_protect, name="dispatch")
class StaffMemberRenewalView(APIView):
    permission_classes = [IsMembershipOfficer]

    def get_member(self, membership_number):
        try:
            return MemberProfile.objects.get(membership_number=membership_number)
        except MemberProfile.DoesNotExist:
            raise NotFound()

    @extend_schema(responses={200: MembershipRenewalSerializer(many=True)})
    def get(self, request, membership_number):
        member = self.get_member(membership_number)
        return Response(MembershipRenewalSerializer(member.renewals.all(), many=True).data)

    @extend_schema(request=MembershipRenewalCreateSerializer, responses={201: MembershipRenewalSerializer})
    def post(self, request, membership_number):
        member = self.get_member(membership_number)
        serializer = MembershipRenewalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        renewal = serializer.save(member=member)
        record_event(action="membership.renewal_created", target_type="membership_renewal", target_id=renewal.id, actor=request.user, request=request, metadata={"member_id": str(member.id)})
        send_renewal_created_email(member, renewal)
        return Response(MembershipRenewalSerializer(renewal).data, status=status.HTTP_201_CREATED)
