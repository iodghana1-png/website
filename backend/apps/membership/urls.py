from django.urls import path

from . import views

urlpatterns = [
    path("types/", views.MembershipTypeListView.as_view(), name="membership-types"),
    path("types/<uuid:pk>/", views.MembershipTypeDetailView.as_view(), name="membership-type-detail"),
    path("applications/", views.MembershipApplicationCreateView.as_view(), name="membership-application-create"),
    path("applications/<str:reference>/", views.MembershipApplicationTrackingView.as_view(), name="membership-application-tracking"),
    path("members/me/", views.MyMemberProfileView.as_view(), name="member-me"),
    path("members/me/renewals/", views.MyRenewalsView.as_view(), name="member-renewals"),
    path("members/verify/", views.PublicMemberVerificationView.as_view(), name="member-verification"),
    path("directory/", views.PublicDirectoryView.as_view(), name="member-directory"),
    path("staff/applications/", views.StaffApplicationListView.as_view(), name="staff-applications"),
    path("staff/applications/<str:reference>/review/", views.StaffApplicationReviewView.as_view(), name="staff-application-review"),
    path("staff/applications/<str:reference>/receipt-email/", views.StaffApplicationReceiptEmailView.as_view(), name="staff-application-receipt-email"),
    path("staff/applications/<str:reference>/approve/", views.StaffApplicationApproveView.as_view(), name="staff-application-approve"),
    path("staff/applications/<str:reference>/reject/", views.StaffApplicationRejectView.as_view(), name="staff-application-reject"),
    path("staff/members/", views.StaffMemberListView.as_view(), name="staff-members"),
    path("staff/members/<str:membership_number>/status/", views.StaffMemberStatusView.as_view(), name="staff-member-status"),
    path("staff/members/<str:membership_number>/status-history/", views.StaffMemberStatusHistoryView.as_view(), name="staff-member-status-history"),
    path("staff/members/<str:membership_number>/renewals/", views.StaffMemberRenewalView.as_view(), name="staff-member-renewals"),
    path("staff/directory/", views.StaffDirectoryListView.as_view(), name="staff-directory"),
    path("staff/directory/bulk-publication/", views.StaffDirectoryBulkPublicationView.as_view(), name="staff-directory-bulk-publication"),
    path("staff/directory/<uuid:pk>/", views.StaffDirectoryDetailView.as_view(), name="staff-directory-detail"),
]
