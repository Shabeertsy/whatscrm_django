from rest_framework import serializers
from .models import Contact, Conversation, Message


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
            'direction', 'msg_type', 'body', 'media_url', 'related_room_uuid',
            'sent_by', 'sent_by_name', 'status', 'timestamp', 'replied_to_message',
        ]
        read_only_fields = ['id', 'wa_message_id', 'replied_to_message']

    def get_sent_by_name(self, obj):
        if obj.sent_by:
            return obj.sent_by.get_full_name() or obj.sent_by.email
        return None

    def get_replied_to_message(self, obj):
        if obj.replied_to:
            return {
                'id': obj.replied_to.id,
                'body': obj.replied_to.body,
                'msg_type': obj.replied_to.msg_type,
                'sent_by_name': obj.replied_to.sent_by.get_full_name() if obj.replied_to.sent_by else None
            }
        return None


## Conversation ##
class ConversationListSerializer(serializers.ModelSerializer):
    contact           = ContactMinimalSerializer(read_only=True)
    last_message      = serializers.SerializerMethodField()
    last_inbound_at   = serializers.SerializerMethodField()
    instance_name     = serializers.SerializerMethodField()
    agent_name        = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = [
            'id', 'contact', 'instance', 'instance_name',
            'assigned_agent', 'agent_name', 'status',
            'unread_count', 'last_message', 'last_message_at', 'last_inbound_at',
        ]
        read_only_fields = ['id', 'unread_count', 'last_message_at']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-timestamp').first()
        if msg:
            return {'body': msg.body, 'direction': msg.direction, 'msg_type': msg.msg_type, 'media_url': msg.media_url}
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
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ['messages']


class ConversationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Conversation
        fields = ['status', 'assigned_agent']


class SendMessageSerializer(serializers.Serializer):
    body      = serializers.CharField(max_length=4096, allow_blank=True, required=False, default='')
    media_url = serializers.URLField(required=False, allow_blank=True, default='')
    related_room_uuid = serializers.CharField(max_length=255, allow_blank=True, required=False, default='')
    reply_to_message_id = serializers.IntegerField(required=False, allow_null=True)
    msg_type  = serializers.ChoiceField(
        choices=['text', 'template', 'image', 'document', 'video', 'audio'],
        default='text',
    )
