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

    stage_color = serializers.SerializerMethodField()
    stage_name = serializers.SerializerMethodField()
    stage_order = serializers.SerializerMethodField()

    location_name = serializers.CharField(source='location.name', read_only=True, default=None)

    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'phone', 'email', 'status', 'notes',
            'tags', 'tag_ids', 'stage_color', 'stage_name', 'stage_order',
            'location', 'location_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'location_name', 'created_at', 'updated_at']

    def _get_active_deal(self, obj):
        if not hasattr(obj, '_cached_deal'):
            active_deal = None
            if hasattr(obj, 'wa_contact') and obj.wa_contact:
                deals = list(obj.wa_contact.pipeline_deals.all())
                active_deal = next((d for d in deals if d.pipeline.is_active), None)
                if not active_deal and deals:
                    active_deal = deals[0]
            obj._cached_deal = active_deal
        return obj._cached_deal

    def get_stage_color(self, obj):
        deal = self._get_active_deal(obj)
        if deal and deal.stage:
            return deal.stage.color
        return None

    def get_stage_name(self, obj):
        deal = self._get_active_deal(obj)
        if deal and deal.stage:
            return deal.stage.title
        return None

    def get_stage_order(self, obj):
        deal = self._get_active_deal(obj)
        if deal and deal.stage:
            return deal.stage.order
        return 9999


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ['id', 'title', 'color', 'order', 'created_at']
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
