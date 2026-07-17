from rest_framework import serializers
from .models import Contact, ContactTag, Pipeline, PipelineStage, PipelineDeal


class ContactTagSerializer(serializers.ModelSerializer):
    contact_count = serializers.SerializerMethodField()

    class Meta:
        model = ContactTag
        fields = ['id', 'name', 'color', 'contact_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'contact_count']

    def get_contact_count(self, obj):
        return obj.contacts.count()


class ContactSerializer(serializers.ModelSerializer):
    tags = ContactTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=ContactTag.objects.all(),
        source='tags', required=False
    )

    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'phone', 'email', 'status', 'notes',
            'tags', 'tag_ids', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ['id', 'title', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class PipelineSerializer(serializers.ModelSerializer):
    stages = PipelineStageSerializer(many=True, read_only=True)
    deal_count = serializers.SerializerMethodField()

    class Meta:
        model = Pipeline
        fields = ['id', 'name', 'description', 'is_active', 'auto_create_deals', 'stages', 'deal_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_active']

    def get_deal_count(self, obj):
        return obj.deals.count()


class PipelineDealSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()

    class Meta:
        model = PipelineDeal
        fields = ['id', 'name', 'value', 'pipeline', 'stage', 'wa_contact', 'contact_name', 'contact_phone', 'note', 'created_at']
        read_only_fields = ['id', 'created_at', 'contact_name', 'contact_phone']

    def get_contact_name(self, obj):
        if obj.wa_contact:
            if getattr(obj.wa_contact, 'crm_contact', None):
                return obj.wa_contact.crm_contact.name
            return obj.wa_contact.name or ''
        return ''

    def get_contact_phone(self, obj):
        if obj.wa_contact:
            if getattr(obj.wa_contact, 'crm_contact', None):
                return obj.wa_contact.crm_contact.phone
            return obj.wa_contact.phone or ''
        return ''
