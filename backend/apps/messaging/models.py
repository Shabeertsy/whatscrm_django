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
    profile_pic_url = models.URLField(max_length=1024, blank=True)

    is_saved = models.BooleanField(default=False)
    source   = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='inbound')
    tags     = models.JSONField(default=list, blank=True)
    notes    = models.TextField(blank=True)

    # Link to CRM contact
    crm_contact = models.OneToOneField(
        'contacts.Contact',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='wa_contact',
    )
    
    # Link to Location
    location = models.ForeignKey(
        'accounts.Location',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='wa_contacts',
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
    ai_active       = models.BooleanField(default=True)
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
        ('text',        'Text'),
        ('image',       'Image'),
        ('audio',       'Audio'),
        ('video',       'Video'),
        ('document',    'Document'),
        ('template',    'Template'),
        ('sticker',     'Sticker'),
        ('location',    'Location'),
        ('interactive', 'Interactive'),
    ]

    conversation    = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )

    wa_message_id = models.CharField(max_length=255, blank=True, db_index=True)
    direction  = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    msg_type   = models.CharField(max_length=20, choices=TYPE_CHOICES, default='text')
    body       = models.TextField(blank=True)
    media_url  = models.URLField(max_length=1024, blank=True)
    storage_path = models.CharField(max_length=512, blank=True, null=True)
    related_room_uuid = models.CharField(max_length=255, null=True, blank=True)
    
    replied_to = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='replies'
    )

    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages',
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
  
    # WhatsApp timestamp from Meta payload
    timestamp = models.DateTimeField()
    
    # Reaction emoji 
    reaction = models.CharField(max_length=50, blank=True, null=True)
    raw_data = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ['timestamp']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f"[{self.direction}] {self.body[:60]}"


class CustomMessage(BaseModel):
    title = models.CharField(max_length=255)
    text = models.TextField()
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_messages'
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Custom Message'
        verbose_name_plural = 'Custom Messages'

    def __str__(self):
        return self.title


class MediaLibraryItem(BaseModel):
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
    ]
    name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=1024)
    storage_path = models.CharField(max_length=512, blank=True, null=True)
    media_type = models.CharField(max_length=50, choices=MEDIA_TYPES, default='image')
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0)
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='media_library_items'
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Media Library Item'
        verbose_name_plural = 'Media Library Items'

    def __str__(self):
        return self.name


class PropertyShareConfig(BaseModel):

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="property_share_configs",
    )

    # Button Labels & Actions (Max 20 chars per Meta rule)
    book_button_enabled = models.BooleanField(default=True)
    book_button_label = models.CharField(max_length=20, default="Book Now")
    book_action_type = models.CharField(
        max_length=50,
        choices=[("flow", "WhatsApp Flow"), ("agent", "Notify Agent"), ("link", "Checkout URL")],
        default="agent",
    )
    book_flow_id = models.CharField(max_length=255, blank=True, default="")

    details_button_enabled = models.BooleanField(default=True)
    details_button_label = models.CharField(max_length=20, default="More Details")
    next_button_enabled = models.BooleanField(default=True)
    next_button_label = models.CharField(max_length=20, default="Next")
    exit_button_enabled = models.BooleanField(default=False)
    exit_button_label = models.CharField(max_length=20, default="Exit")

    # "More Details" Images & Media Rules
    details_send_room_images = models.BooleanField(default=True)
    details_room_image_limit = models.PositiveIntegerField(default=4)
    details_send_property_images = models.BooleanField(default=False)
    details_property_image_limit = models.PositiveIntegerField(default=2)
    details_send_videos = models.BooleanField(default=False)
    details_video_limit = models.PositiveIntegerField(default=1)
    details_text_template = models.TextField(blank=True, default="")
    details_selected_fields = models.JSONField(
        default=dict,
        blank=True,
        help_text="Selected fields/categories for More Details message generation",
    )

    # Initial Share Media Rules (When sharing from hotel search page)
    initial_send_room_images = models.BooleanField(default=True)
    initial_room_image_limit = models.PositiveIntegerField(default=1)
    initial_send_property_images = models.BooleanField(default=True)
    initial_property_image_limit = models.PositiveIntegerField(default=1)
    initial_send_videos = models.BooleanField(default=False)
    initial_video_limit = models.PositiveIntegerField(default=1)

    # "Next" Button Navigation & Media Rules
    next_include_hero_image = models.BooleanField(default=True)
    next_send_extra_album = models.BooleanField(default=False)
    next_album_limit = models.PositiveIntegerField(default=2)
    no_more_results_text = models.CharField(
        max_length=255, default="You have viewed all available options."
    )
    exit_message_text = models.CharField(
        max_length=255, default="Thank you! Let us know if you need anything else."
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Property Share Config"
        verbose_name_plural = "Property Share Configs"

    def __str__(self):
        return f"PropertyShareConfig ({self.owner or 'Global'})"

    @classmethod
    def get_effective_config(cls, user=None):
        """Retrieve user's config or global fallback singleton."""
        if user and user.is_authenticated:
            cfg = cls.objects.filter(owner=user).first()
            if cfg:
                return cfg
        cfg = cls.objects.filter(owner__isnull=True).first()
        if not cfg:
            cfg = cls.objects.create(owner=None)
        return cfg
