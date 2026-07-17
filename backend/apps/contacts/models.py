import uuid
from django.db import models
from django.conf import settings
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

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    notes = models.TextField(blank=True, default='')

    # Link to WhatsApp contact (populated when imported from chat)
    wa_id = models.CharField(max_length=30, blank=True, default='')

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='crm_contacts'
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
    order = models.PositiveIntegerField(default=0)
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
        on_delete=models.CASCADE, 
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
    note = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

