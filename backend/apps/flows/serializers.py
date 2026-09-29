from rest_framework import serializers
from django.db import transaction
from .models import WhatsappFlow, FlowSubmission


class WhatsappFlowSerializer(serializers.ModelSerializer):
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = WhatsappFlow
        fields = [
            "id", "instance", "name", "description",
            "meta_flow_id", "category", "flow_json", "data_api_config",
            "status", "endpoint_uri", "preview_url",
            "submission_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "preview_url", "submission_count", "created_at", "updated_at"]

    def get_submission_count(self, obj):
        return obj.submissions.count()


class WhatsappFlowListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list/dropdown endpoints (no flow_json)."""
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = WhatsappFlow
        fields = [
            "id", "instance", "name", "description",
            "meta_flow_id", "category", "status",
            "submission_count", "created_at",
        ]

    def get_submission_count(self, obj):
        return obj.submissions.count()


class FlowSubmissionSerializer(serializers.ModelSerializer):
    flow_name        = serializers.CharField(source="flow.name", read_only=True)
    conversation_id  = serializers.IntegerField(source="conversation.id", read_only=True, default=None)

    class Meta:
        model = FlowSubmission
        fields = [
            "id", "flow", "flow_name", "conversation_id",
            "contact_wa_id", "screen_data", "flow_token",
            "completed", "created_at",
        ]
        read_only_fields = ["id", "flow_name", "conversation_id", "created_at"]
