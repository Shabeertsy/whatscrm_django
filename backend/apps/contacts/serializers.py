from rest_framework import serializers
from .models import Contact, ContactTag, Pipeline, PipelineStage, PipelineDeal, ConfirmedBooking


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
            'id', 'name', 'phone', 'email', 'status', 'notes', 'source',
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
        fields = ['id', 'title', 'color', 'order', 'is_confirmed', 'extra_fields', 'created_at']
        read_only_fields = ['id', 'created_at']


class PipelineSerializer(serializers.ModelSerializer):
    stages = PipelineStageSerializer(many=True, read_only=True)
    deal_count = serializers.SerializerMethodField()

    class Meta:
        model = Pipeline
        fields = ['id', 'name', 'description', 'is_active', 'auto_create_deals', 'extra_fields', 'stages', 'deal_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_active']

    def get_deal_count(self, obj):
        return obj.deals.count()


class PipelineDealSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()
    is_confirmed_booking = serializers.SerializerMethodField()
    confirmed_at = serializers.SerializerMethodField()
    manual_contact = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'note' in data and data['note'] is None:
            data['note'] = ''
        if 'manual_contact' in data and data['manual_contact'] is None:
            data['manual_contact'] = ''
        if 'wa_contact' in data:
            val = data['wa_contact']
            if val in ('', 'null', None):
                data['wa_contact'] = None
            else:
                from apps.messaging.models import Contact as MessagingContact
                from apps.contacts.models import Contact as CrmContact
                if not MessagingContact.objects.filter(pk=val).exists():
                    crm = CrmContact.objects.filter(pk=val).first()
                    if crm and hasattr(crm, 'wa_contact') and crm.wa_contact:
                        data['wa_contact'] = str(crm.wa_contact.id)
                    else:
                        data['wa_contact'] = None
        return super().to_internal_value(data)

    class Meta:
        model = PipelineDeal
        fields = [
            'id', 'name', 'value', 'pipeline', 'stage',
            'wa_contact', 'manual_contact', 'contact_name', 'contact_phone',
            'note', 'extra_data',
            'is_confirmed_booking', 'confirmed_at',
            'created_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'contact_name', 'contact_phone',
            'is_confirmed_booking', 'confirmed_at',
        ]

    def get_contact_name(self, obj):
        if obj.wa_contact:
            if getattr(obj.wa_contact, 'crm_contact', None):
                return obj.wa_contact.crm_contact.name
            return obj.wa_contact.name or ''
        return obj.manual_contact or ''

    def get_contact_phone(self, obj):
        if obj.wa_contact:
            if getattr(obj.wa_contact, 'crm_contact', None):
                return obj.wa_contact.crm_contact.phone
            return obj.wa_contact.phone or ''
        return ''

    def _get_confirmed_record(self, obj):
        """Fetch and cache the confirmed booking record once per deal."""
        if not hasattr(obj, '_confirmed_record_cache'):
            if not (obj.stage and obj.stage.is_confirmed):
                obj._confirmed_record_cache = None
            else:
                obj._confirmed_record_cache = obj.confirmed_booking_records.first()
        return obj._confirmed_record_cache

    def get_is_confirmed_booking(self, obj):
        if not (obj.stage and obj.stage.is_confirmed):
            return False
        return self._get_confirmed_record(obj) is not None

    def get_confirmed_at(self, obj):
        if not (obj.stage and obj.stage.is_confirmed):
            return None
        record = self._get_confirmed_record(obj)
        return record.confirmed_at if record else None



class ConfirmedBookingSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='deal_name', read_only=True)
    confirmed_stage_title = serializers.CharField(source='stage_title', read_only=True)
    confirmed_pipeline_name = serializers.CharField(source='pipeline_name', read_only=True)

    class Meta:
        model = ConfirmedBooking
        fields = [
            'id', 'deal', 'name', 'deal_name',
            'contact', 'contact_name', 'contact_phone',
            'pipeline', 'pipeline_name', 'confirmed_pipeline_name',
            'stage', 'stage_title', 'confirmed_stage_title',
            'value', 'note', 'extra_data',
            'confirmed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

