from django.contrib import admin

from .models import ContactEnquiry, DocumentRequest


@admin.register(ContactEnquiry)
class ContactEnquiryAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone_number", "enquiry_type", "status", "created_at")
    list_filter = ("status", "enquiry_type")
    search_fields = ("first_name", "last_name", "email", "message")
    readonly_fields = ("created_at", "updated_at")


@admin.register(DocumentRequest)
class DocumentRequestAdmin(admin.ModelAdmin):
    list_display = ("full_name", "request_type", "programme", "email", "status", "created_at")
    list_filter = ("status", "request_type")
    search_fields = ("first_name", "last_name", "email", "membership_number", "programme", "purpose")
    readonly_fields = ("created_at", "updated_at")
