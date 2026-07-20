from django.contrib import admin
from .models import AIProviderSettings, AIAgentSettings, FlowBot, FlowNode, ConversationFlowState


@admin.register(AIProviderSettings)
class AIProviderSettingsAdmin(admin.ModelAdmin):
    list_display = ['name', 'ai_provider_name', 'created_at']


@admin.register(AIAgentSettings)
class AIAgentSettingsAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider', 'model_name', 'is_active', 'auto_reply_delay']


class FlowNodeInline(admin.TabularInline):
    model = FlowNode
    extra = 0
    fields = ['node_type', 'label', 'content', 'match_keywords', 'parent', 'order']


@admin.register(FlowBot)
class FlowBotAdmin(admin.ModelAdmin):
    list_display = ['name', 'instance', 'is_active', 'start_node', 'created_at']
    inlines = [FlowNodeInline]


@admin.register(FlowNode)
class FlowNodeAdmin(admin.ModelAdmin):
    list_display = ['label', 'flow', 'node_type', 'parent', 'order']
    list_filter = ['flow', 'node_type']


@admin.register(ConversationFlowState)
class ConversationFlowStateAdmin(admin.ModelAdmin):
    list_display = ['conversation_id', 'flow', 'current_node', 'is_complete', 'updated_at']
    list_filter = ['is_complete', 'flow']
