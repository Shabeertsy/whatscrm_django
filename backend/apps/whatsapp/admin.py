from django.contrib import admin
from .models import WhatsappInstance , WhatsappTemplate


@admin.register(WhatsappInstance)
class WhatsappInstanceAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "phone_number_id", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("display_name", "phone_number_id", "user__email")
    readonly_fields = ("id", "created_at", "updated_at")
    exclude = ("access_token",)




@admin.register(WhatsappTemplate)
class WhatsappTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "instance", "language", "category", "status", "created_at")
    list_filter = ("status", "category", "language")
    search_fields = ("name", "language")
    readonly_fields = ("id", "created_at", "updated_at")