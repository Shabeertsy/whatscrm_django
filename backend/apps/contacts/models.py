import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import BaseModel, SoftDeleteModel


class ContactTag(BaseModel):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='#007e3a')
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contact_tags'
    )

    class Meta:
        ordering = ['name']
        unique_together = ['name', 'owner']

    def __str__(self):
        return self.name


class Contact(BaseModel, SoftDeleteModel):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]

    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('whatsapp', 'WhatsApp'),
        ('csv', 'CSV'),
    ]

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    notes = models.TextField(blank=True, default='')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')

    # Link to WhatsApp contact (populated when imported from chat)
    wa_id = models.CharField(max_length=30, blank=True, default='')

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='crm_contacts'
    )
    location = models.ForeignKey(
        'accounts.Location',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contacts'
    )
    tags = models.ManyToManyField(ContactTag, blank=True, related_name='contacts')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Pipeline(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=False)
    auto_create_deals = models.BooleanField(
        default=False,
        help_text="Only the active pipeline can have this enabled"
    )
    extra_fields = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"key":"check_in","label":"Check-in Date","type":"date","required":false}]'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pipelines'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def activate(self):
        """Make this pipeline active and deactivate all others for this owner."""
        Pipeline.objects.filter(owner=self.owner, is_active=True).update(is_active=False)
        self.is_active = True
        self.save(update_fields=['is_active'])


class PipelineStage(BaseModel):
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='stages',
        null=True, blank=True 
    )
    title = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='#e2e8f0')
    order = models.PositiveIntegerField(default=0)

    # Mark this stage as a confirmed booking stage
    is_confirmed = models.BooleanField(
        default=False,
        help_text="Deals moved into this stage are recorded as confirmed bookings"
    )
    # Dynamic extra fields definition: [{key, label, type, required, options}]
    extra_fields = models.JSONField(
        default=list,
        blank=True,
        help_text='[{"key":"check_in","label":"Check-in Date","type":"date","required":false}]'
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pipeline_stages'
    )

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title


class PipelineDeal(BaseModel):
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name='deals',
        null=True, blank=True  
    )
    name = models.CharField(max_length=255)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.ForeignKey(
        PipelineStage, 
        on_delete=models.SET_NULL,   # Changed from CASCADE — preserves deals when stage deleted
        null=True,
        blank=True,
        related_name='deals'
    )
    # connection with whatsapp message contact (apps.messaging.models.Contact)
    wa_contact = models.ForeignKey(
        'messaging.Contact', 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='pipeline_deals'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pipeline_deals'
    )
    manual_contact = models.CharField(max_length=255, blank=True, default='')
    note = models.TextField(blank=True, default='')
    

    # ── Dynamic extra field values (keyed by StageField.key) ────────────────
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='{"check_in":"2026-11-01"}'
    )



    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# Confirmed Booking Table 
# Standalone table that records confirmed bookings independently.
class ConfirmedBooking(BaseModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='confirmed_bookings'
    )
    deal = models.ForeignKey(
        PipelineDeal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_booking_records'
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_bookings'
    )
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_bookings'
    )
    stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_bookings'
    )

    # Preserved copies of data (survives deletions of stage/pipeline/deal)
    deal_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True, default='')
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    pipeline_name = models.CharField(max_length=255, blank=True, default='')
    stage_title = models.CharField(max_length=100, blank=True, default='')
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    note = models.TextField(blank=True, default='')
    extra_data = models.JSONField(default=dict, blank=True)
    confirmed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-confirmed_at', '-created_at']

    def __str__(self):
        return f"Confirmed Booking: {self.deal_name} ({self.stage_title})"


