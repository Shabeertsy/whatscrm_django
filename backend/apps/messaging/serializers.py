from rest_framework import serializers
from .models import Contact, Conversation, Message
from .storage_backends import get_whatsapp_storage

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

    class Meta:
        model  = Contact
        fields = ['id', 'wa_id', 'phone', 'name', 'profile_pic_url', 'is_saved', 'tags']

    def get_name(self, obj):
        if obj.crm_contact:
            return obj.crm_contact.name
        return obj.name


##  Message ##
class MessageSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()
    replied_to_message = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'conversation', 'wa_message_id',
            'direction', 'msg_type', 'body', 'media_url', 'storage_path', 'related_room_uuid',
            'sent_by', 'sent_by_name', 'status', 'timestamp', 'replied_to_message',
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
            'assigned_agent', 'agent_name', 'status', 'ai_active',
            'unread_count', 'last_message', 'last_message_at', 'last_inbound_at',
        ]
        read_only_fields = ['id', 'unread_count', 'last_message_at']

    def get_last_message(self, obj):
        messages = list(obj.messages.all())
        if not messages:
            return None
        msg = sorted(messages, key=lambda m: m.timestamp, reverse=True)[0]
        media_url = _resolve_media_url(msg.storage_path, msg.media_url)
        return {'body': msg.body, 'direction': msg.direction, 'msg_type': msg.msg_type, 'media_url': media_url}

    def get_last_inbound_at(self, obj):
        messages = list(obj.messages.all())
        inbound = [m for m in messages if m.direction == 'inbound']
        if not inbound:
            return None
        msg = sorted(inbound, key=lambda m: m.timestamp, reverse=True)[0]
        return msg.timestamp.isoformat()

    def get_instance_name(self, obj):
        return obj.instance.display_name if obj.instance else None

    def get_agent_name(self, obj):
        if obj.assigned_agent:
            return obj.assigned_agent.get_full_name() or obj.assigned_agent.email
        return None


class ConversationDetailSerializer(ConversationListSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ['messages']


class ConversationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Conversation
        fields = ['status', 'assigned_agent', 'ai_active']


class SendMessageSerializer(serializers.Serializer):
    body      = serializers.CharField(max_length=4096, allow_blank=True, required=False, default='')
    media_url = serializers.URLField(max_length=1024, required=False, allow_blank=True, default='')
    storage_path = serializers.CharField(max_length=512, allow_blank=True, required=False, default='')
    related_room_uuid   = serializers.CharField(max_length=255, allow_blank=True, required=False, default='')
    reply_to_message_id = serializers.IntegerField(required=False, allow_null=True)
    msg_type            = serializers.ChoiceField(
        choices=['text', 'template', 'image', 'document', 'video', 'audio'],
        default='text',
    )
    template_name       = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    template_language   = serializers.CharField(max_length=50, required=False, allow_blank=True, default='en')
