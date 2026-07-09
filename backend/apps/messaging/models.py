from django.conf import settings
from django.db import models
from apps.core.models import BaseModel


class Contact(BaseModel):

    SOURCE_CHOICES = [
        ('inbound',    'Inbound Message'),
        ('manual',     'Manual Entry'),
        ('automation', 'Automation Rule'),
        ('import',     'CSV Import'),
        ('campaign',   'Campaign Reply'),
    ]

    # WhatsApp phone number  (no + prefix)
    wa_id           = models.CharField(max_length=30, unique=True, db_index=True)
    phone           = models.CharField(max_length=30)
    name            = models.CharField(max_length=255, blank=True)
    profile_pic_url = models.URLField(blank=True)

    is_saved        = models.BooleanField(default=False)
    source          = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='inbound')
    tags            = models.JSONField(default=list, blank=True)
    notes           = models.TextField(blank=True)

    # Link to CRM contact — set when the WhatsApp contact is imported into CRM
    crm_contact     = models.OneToOneField(
        'contacts.Contact',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='wa_contact',
    )

    class Meta: 
        ordering = ['-created_at']
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'

    def __str__(self):
        return self.name or self.phone


class Conversation(models.Model):

    STATUS_CHOICES = [
        ('open',     'Open'),
        ('pending',  'Pending'),
        ('resolved', 'Resolved'),
        ('snoozed',  'Snoozed'),
    ]

    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    instance = models.ForeignKey(
        'whatsapp.WhatsappInstance',
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True,
        blank=True,
    )
    assigned_agent  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_conversations',
    )
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    unread_count    = models.PositiveIntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_message_at']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'

    def __str__(self):
        return f"Conv #{str(self.id)[:8]} — {self.contact}"


class Message(models.Model):  

    DIRECTION_CHOICES = [
        ('inbound',  'Inbound'), 
        ('outbound', 'Outbound'),  
    ]
    STATUS_CHOICES = [
        ('sent',      'Sent'),
        ('delivered', 'Delivered'),
        ('read',      'Read'),
        ('failed',    'Failed'),
    ]
    TYPE_CHOICES = [
        ('text',     'Text'),
        ('image',    'Image'),
        ('audio',    'Audio'),
        ('video',    'Video'),
        ('document', 'Document'),
        ('template', 'Template'),
        ('sticker',  'Sticker'),
        ('location', 'Location'),
    ]

    conversation    = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    # Meta's own message ID — used for delivery/read receipt updates
    wa_message_id = models.CharField(max_length=255, blank=True, db_index=True)

    direction  = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    msg_type   = models.CharField(max_length=20, choices=TYPE_CHOICES, default='text')
    body       = models.TextField(blank=True)
    media_url  = models.URLField(blank=True)

    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages',
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    # Original WhatsApp timestamp from Meta payload
    timestamp = models.DateTimeField()

    class Meta:
        ordering = ['timestamp']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f"[{self.direction}] {self.body[:60]}"
