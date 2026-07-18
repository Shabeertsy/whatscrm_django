from django.contrib import admin
from .models import AIAgentSettings


@admin.register(AIAgentSettings)
class AIAgentSettingsAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider', 'model_name', 'temperature', 'auto_reply_delay']
    list_filter = ['provider']
    search_fields = ['name', 'model_name']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
