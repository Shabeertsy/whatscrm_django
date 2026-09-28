from django.contrib import admin
from .models import WhatsappFlow, FlowSubmission


@admin.register(WhatsappFlow)
class WhatsappFlowAdmin(admin.ModelAdmin):
    list_display  = ["name", "instance", "category", "status", "meta_flow_id", "created_at"]
    list_filter   = ["status", "category", "instance"]
    search_fields = ["name", "meta_flow_id"]
    readonly_fields = ["meta_flow_id", "preview_url", "endpoint_uri", "created_at", "updated_at"]


@admin.register(FlowSubmission)
class FlowSubmissionAdmin(admin.ModelAdmin):
    list_display  = ["flow", "contact_wa_id", "completed", "created_at"]
    list_filter   = ["completed", "flow"]
    search_fields = ["contact_wa_id", "flow_token"]
    readonly_fields = ["flow_token", "created_at", "updated_at"]
