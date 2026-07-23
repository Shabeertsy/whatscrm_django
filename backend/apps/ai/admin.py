from django.contrib import admin
from .models import AIProviderSettings, AIAgentSettings


@admin.register(AIProviderSettings)
class AIProviderSettingsAdmin(admin.ModelAdmin):
    list_display = ['name', 'ai_provider_name', 'created_at']


@admin.register(AIAgentSettings)
class AIAgentSettingsAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider', 'model_name', 'is_active', 'auto_reply_delay']
