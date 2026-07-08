from django.contrib import admin
from .models import Contact, Conversation, Message


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display  = ('name', 'phone', 'wa_id', 'is_saved', 'source', 'created_at')
    list_filter   = ('is_saved', 'source')
    search_fields = ('name', 'phone', 'wa_id')
    ordering      = ('-created_at',)


class MessageInline(admin.TabularInline):
    model         = Message
    extra         = 0
    readonly_fields = ('id', 'wa_message_id', 'direction', 'msg_type', 'body', 'status', 'timestamp')
    can_delete    = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display  = ('id', 'contact', 'instance', 'assigned_agent', 'status', 'unread_count', 'last_message_at')
    list_filter   = ('status', 'instance')
    search_fields = ('contact__name', 'contact__phone', 'contact__wa_id')
    raw_id_fields = ('contact', 'instance', 'assigned_agent')
    inlines       = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ('id', 'conversation', 'direction', 'msg_type', 'body_preview', 'status', 'timestamp')
    list_filter   = ('direction', 'msg_type', 'status')
    search_fields = ('body', 'wa_message_id')

    def body_preview(self, obj):
        return obj.body[:60]
    body_preview.short_description = 'Body'
