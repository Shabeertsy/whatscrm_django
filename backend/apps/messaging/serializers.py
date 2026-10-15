import json
from rest_framework import serializers
from .models import Contact, Conversation, Message, CustomMessage, MediaLibraryItem, PropertyShareConfig
from .storage_backends import get_whatsapp_storage
from django.conf import settings
from apps.messaging.storage_backends import get_whatsapp_storage



def _resolve_media_url(storage_path, fallback_url):
    if storage_path:
        try:
            storage = get_whatsapp_storage()
            url = storage.url(storage_path)
            if url.startswith('http://') or url.startswith('https://'):
                return url
                
            from django.conf import settings
            base = getattr(settings, 'BACKEND_PUBLIC_URL', 'http://127.0.0.1:8000').rstrip('/')
            if not url.startswith('/'):
                url = '/' + url
            return f"{base}{url}"
        except Exception:
            pass
            
    if fallback_url and fallback_url.startswith('/media/'):
        from django.conf import settings
        base = getattr(settings, 'BACKEND_PUBLIC_URL', 'http://127.0.0.1:8000').rstrip('/')
        return f"{base}{fallback_url}"
        
    return fallback_url


#  Contact ##
class ContactSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model  = Contact
        fields = [
            'id', 'wa_id', 'phone', 'name', 'profile_pic_url',
            'is_saved', 'source', 'tags', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_name(self, obj):
        if obj.crm_contact:
            return obj.crm_contact.name
        return obj.name


class ContactMinimalSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    stage_color = serializers.SerializerMethodField()
    stage_name = serializers.SerializerMethodField()
    stage_order = serializers.SerializerMethodField()
    active_deal_id = serializers.SerializerMethodField()

    class Meta:
        model  = Contact
        fields = ['id', 'wa_id', 'phone', 'name', 'profile_pic_url', 'is_saved', 'tags', 'stage_color', 'stage_name', 'stage_order', 'active_deal_id']

    def get_name(self, obj):
        if obj.crm_contact:
            return obj.crm_contact.name
        return obj.name

    def get_active_deal_id(self, obj):
        deal = self._get_active_deal(obj)
        return deal.id if deal else None

    def _get_active_deal(self, obj):
        if not hasattr(obj, '_cached_deal'):
            deals = list(obj.pipeline_deals.all())
            active_deal = next((d for d in deals if d.pipeline.is_active), None)
            obj._cached_deal = active_deal if active_deal else (deals[0] if deals else None)
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


##  Message ##
class MessageSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()
    replied_to_message = serializers.SerializerMethodField()
    interactive_data = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'conversation', 'wa_message_id',
            'direction', 'msg_type', 'body', 'media_url', 'storage_path', 'related_room_uuid',
            'sent_by', 'sent_by_name', 'status', 'timestamp', 'replied_to_message', 'reaction',
            'interactive_data',
        ]
        read_only_fields = ['id', 'wa_message_id', 'replied_to_message']

    def get_sent_by_name(self, obj):
        if obj.direction == 'outbound' and obj.sent_by:
            return obj.sent_by.get_full_name() or obj.sent_by.email
        elif obj.direction == 'inbound':
            wa_contact = obj.conversation.contact
            if wa_contact.crm_contact:
                return wa_contact.crm_contact.name
            return wa_contact.name or wa_contact.phone
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # Override media_url with actual storage URL if available
        ret['media_url'] = _resolve_media_url(instance.storage_path, ret.get('media_url'))
            
        if ret.get('replied_to_message'):
            replied_to_storage_path = instance.replied_to.storage_path if instance.replied_to else None
            ret['replied_to_message']['media_url'] = _resolve_media_url(
                replied_to_storage_path, 
                ret['replied_to_message'].get('media_url')
            )
            
        return ret

    def get_replied_to_message(self, obj):
        if obj.replied_to:
            sent_by_name = None
            if obj.replied_to.direction == 'outbound' and obj.replied_to.sent_by:
                sent_by_name = obj.replied_to.sent_by.get_full_name() or obj.replied_to.sent_by.email
            else:
                wa_contact = obj.replied_to.conversation.contact
                if wa_contact.crm_contact:
                    sent_by_name = wa_contact.crm_contact.name
                else:
                    sent_by_name = wa_contact.name or wa_contact.phone

            return {
                'id': obj.replied_to.id,
                'body': obj.replied_to.body,
                'msg_type': obj.replied_to.msg_type,
                'media_url': obj.replied_to.media_url,
                'sent_by_name': sent_by_name
            }
        return None

    def get_interactive_data(self, obj):
        if obj.msg_type != 'interactive':
            return None

        # Check outbound interactive payload
        if obj.direction == 'outbound':
            if obj.body:
                try:
                    parsed = json.loads(obj.body)
                    if isinstance(parsed, dict) and ('type' in parsed or 'options' in parsed):
                        return parsed
                except Exception:
                    pass
            return None

        # Inbound interactive replies
        raw = obj.raw_data if isinstance(obj.raw_data, dict) else {}
        interactive_obj = raw.get('interactive', {}) if isinstance(raw, dict) else {}
        i_type = interactive_obj.get('type')

        def _format_label(key_name: str) -> str:
            clean_k = key_name.replace('_', ' ').strip().title()
            clean_k = clean_k.replace('Checkin', 'Check-In').replace('Checkout', 'Check-Out')
            return clean_k

        # 1. WhatsApp Flow Form Submission (nfm_reply) or body has "Sent" / "[Form Submitted]"
        if i_type == 'nfm_reply' or obj.body == 'Sent' or (obj.body and obj.body.startswith('[Form Submitted]')):
            nfm = interactive_obj.get('nfm_reply', {}) if isinstance(interactive_obj, dict) else {}
            resp_json_raw = nfm.get('response_json', '{}')
            resp_data = {}
            if resp_json_raw:
                if isinstance(resp_json_raw, dict):
                    resp_data = dict(resp_json_raw)
                elif isinstance(resp_json_raw, str):
                    try:
                        resp_data = json.loads(resp_json_raw)
                    except Exception:
                        resp_data = {}

            # Look up FlowSubmission for enriched labels / screen_data
            submission = None
            try:
                from apps.flows.models import FlowSubmission
                flow_token = resp_data.get('flow_token')
                if flow_token:
                    submission = FlowSubmission.objects.filter(flow_token=flow_token).first()
                if not submission and obj.conversation:
                    submission = FlowSubmission.objects.filter(
                        conversation=obj.conversation,
                        completed=True
                    ).order_by('-updated_at').first()

                if submission and isinstance(submission.screen_data, dict) and submission.screen_data:
                    # Enrich with submission screen_data (which has resolved human-readable titles)
                    resp_data = {**resp_data, **submission.screen_data}
            except Exception:
                submission = None

            # Fallback if resp_data is still empty: parse key-value lines from obj.body if formatted
            if not resp_data and obj.body and '[Form Submitted]' in obj.body:
                for line in obj.body.splitlines():
                    if ':' in line and not line.startswith('['):
                        parts = line.split(':', 1)
                        resp_data[parts[0].strip()] = parts[1].strip()

            # Separate labeled keys
            labeled_keys = {k[:-6] for k in resp_data.keys() if k.endswith('_label')}
            selected_items = []
            clean_fields = {}

            for k, v in resp_data.items():
                if k in ('flow_token', '__wa_flow_token') or k.startswith('_') or k.endswith('_uuid') or k.endswith('_labels'):
                    continue
                if k in labeled_keys:
                    continue

                if k.endswith('_label'):
                    orig_key = k[:-6]
                    display_label = _format_label(orig_key)
                    display_val = v
                    clean_fields[orig_key] = v
                else:
                    display_label = _format_label(k)
                    display_val = v
                    clean_fields[k] = v

                if isinstance(display_val, list):
                    display_val_str = ", ".join(str(item) for item in display_val)
                elif isinstance(display_val, bool):
                    display_val_str = "Yes" if display_val else "No"
                elif display_val is None:
                    display_val_str = "-"
                else:
                    display_val_str = str(display_val)

                if display_val_str.strip():
                    selected_items.append({
                        "key": k,
                        "label": display_label,
                        "value": display_val_str,
                    })

            flow_name = nfm.get('name') or (submission.flow.name if submission and submission.flow else '')
            return {
                "type": "nfm_reply",
                "flow_name": flow_name,
                "title": flow_name or "Form Submission",
                "body_text": nfm.get('body', obj.body or 'Sent'),
                "selected_data": selected_items,
                "raw_fields": clean_fields,
            }

        # 2. List Reply
        elif i_type == 'list_reply':
            list_reply = interactive_obj.get('list_reply', {})
            title = list_reply.get('title', obj.body)
            desc = list_reply.get('description', '')
            return {
                "type": "list_reply",
                "id": list_reply.get('id', ''),
                "title": title,
                "description": desc,
                "selected_data": [
                    {
                        "key": "selection",
                        "label": "Option Selected",
                        "value": title,
                        "description": desc,
                    }
                ],
            }

        # 3. Button Reply
        elif i_type == 'button_reply':
            btn_reply = interactive_obj.get('button_reply', {})
            title = btn_reply.get('title', obj.body)
            return {
                "type": "button_reply",
                "id": btn_reply.get('id', ''),
                "title": title,
                "selected_data": [
                    {
                        "key": "button",
                        "label": "Option Selected",
                        "value": title,
                    }
                ],
            }

        return None


## Conversation ##
class ConversationListSerializer(serializers.ModelSerializer):
    contact = ContactMinimalSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    last_inbound_at = serializers.SerializerMethodField()
    instance_name   = serializers.SerializerMethodField()
    agent_name      = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = [
            'id', 'contact', 'instance', 'instance_name',
            'assigned_agent', 'agent_name', 'status', 'ai_active', 'interactive_active',
            'unread_count', 'last_message', 'last_message_at', 'last_inbound_at',
        ]
        read_only_fields = ['id', 'unread_count', 'last_message_at']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-timestamp').first()
        if msg:
            media_url = _resolve_media_url(msg.storage_path, msg.media_url)
            return {'body': msg.body, 'direction': msg.direction, 'msg_type': msg.msg_type, 'media_url': media_url}
        return None

    def get_last_inbound_at(self, obj):
        msg = obj.messages.filter(direction='inbound').order_by('-timestamp').first()
        return msg.timestamp.isoformat() if msg else None

    def get_instance_name(self, obj):
        return obj.instance.display_name if obj.instance else None

    def get_agent_name(self, obj):
        if obj.assigned_agent:
            return obj.assigned_agent.get_full_name() or obj.assigned_agent.email
        return None


class ConversationDetailSerializer(ConversationListSerializer):
    class Meta(ConversationListSerializer.Meta):
        pass


class ConversationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Conversation
        fields = ['status', 'assigned_agent', 'ai_active', 'interactive_active']


class SendMessageSerializer(serializers.Serializer):
    body      = serializers.CharField(max_length=4096, allow_blank=True, required=False, default='')
    media_url = serializers.URLField(max_length=1024, required=False, allow_blank=True, default='')
    storage_path = serializers.CharField(max_length=512, allow_blank=True, required=False, default='')
    related_room_uuid   = serializers.CharField(max_length=255, allow_blank=True, required=False, default='')
    reply_to_message_id = serializers.IntegerField(required=False, allow_null=True)
    msg_type            = serializers.ChoiceField(
        choices=['text', 'template', 'image', 'document', 'video', 'audio', 'sticker', 'interactive'],
        default='text',
    )
    template_name       = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    template_language   = serializers.CharField(max_length=50, required=False, allow_blank=True, default='en')
    interactive_options = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    header_image_url    = serializers.URLField(max_length=1024, required=False, allow_blank=True, default='')
    footer_text         = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    # Context saved alongside interactive share cards so button handlers can re-use filters
    share_context       = serializers.DictField(required=False, allow_null=True, default=dict)


class CustomMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomMessage
        fields = ['id', 'title', 'text', 'owner', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']



class MediaLibraryItemSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaLibraryItem
        fields = ['id', 'name', 'file_url', 'storage_path', 'media_type', 'mime_type', 'file_size', 'owner', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def get_file_url(self, obj):
        if obj.storage_path:
            try:
                storage = get_whatsapp_storage()
                url = storage.url(obj.storage_path)
                if url.startswith('http://') or url.startswith('https://'):
                    return url
                
                request = self.context.get('request')
                if getattr(settings, 'BACKEND_PUBLIC_URL', None):
                    base_url = settings.BACKEND_PUBLIC_URL.rstrip('/')
                    return f"{base_url}{url}"
                elif request:
                    return request.build_absolute_uri(url)
                return url
            except Exception:
                pass
        return obj.file_url


class PropertyShareConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyShareConfig
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']


class InitialShareSerializer(serializers.Serializer):
    conversation_ids = serializers.ListField(
        child=serializers.IntegerField(),   # PKs must be int, not str
        required=True,
        allow_empty=False,
    )
    rooms = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        allow_empty=False,
    )
    filters = serializers.DictField(required=False, default=dict)
    share_options = serializers.DictField(required=False, default=dict)
    use_interactive = serializers.BooleanField(required=False, default=True)
    available_room_uuids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )


