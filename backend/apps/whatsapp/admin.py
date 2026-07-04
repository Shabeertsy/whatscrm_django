from django.contrib import admin
from .models import WhatsappInstance


@admin.register(WhatsappInstance)
class WhatsappInstanceAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "phone_number_id", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("display_name", "phone_number_id", "user__email")
    readonly_fields = ("id", "created_at", "updated_at")
    # Hide the raw access token in admin list
    exclude = ("access_token",)
