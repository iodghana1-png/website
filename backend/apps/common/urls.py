from django.urls import path

from .views import AnalyticsReportView, AnalyticsVisitCreateView, ContactEnquiryCreateView, DocumentRequestCreateView, health

urlpatterns = [
    path("health/", health, name="health"),
    path("contact/enquiries/", ContactEnquiryCreateView.as_view(), name="contact-enquiry-create"),
    path("document-requests/", DocumentRequestCreateView.as_view(), name="document-request-create"),
    path("analytics/visits/", AnalyticsVisitCreateView.as_view(), name="analytics-visit-create"),
    path("analytics/report/", AnalyticsReportView.as_view(), name="analytics-report"),
]
