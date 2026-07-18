from rest_framework import serializers
from .models import AIAgentSettings, AIProviderSettings


class AIProviderSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIProviderSettings
        fields = ['id', 'name', 'ai_provider_name', 'ai_provider_api_key', 'ai_provider_secret_key', 'created_at']
        read_only_fields = ['id', 'created_at']

class AIAgentSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAgentSettings
        fields = ['id', 'name', 'provider', 'model_name', 'system_prompt', 'temperature', 'auto_reply_delay', 'is_active', 'knowledge_base', 'created_at']
        read_only_fields = ['id', 'created_at']
