from django.db import models
from django.conf import settings
from apps.core.models import BaseModel, SoftDeleteModel
from apps.contacts.models import ContactTag


class Campaign(BaseModel, SoftDeleteModel):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Running', 'Running'),
        ('Paused', 'Paused'),
        ('Completed', 'Completed'),
    ]

    TARGET_TYPE_CHOICES = [
        ('all', 'All Contacts'),
        ('specific', 'Specific Contacts'),
    ]

    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    template_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Schedule Date Range
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    # Metrics
    sent = models.PositiveIntegerField(default=0)
    delivered = models.PositiveIntegerField(default=0)
    read = models.PositiveIntegerField(default=0)
    replied = models.PositiveIntegerField(default=0)
    
    # Target Audience
    target_type = models.CharField(max_length=20, choices=TARGET_TYPE_CHOICES, default='all')
    contacts = models.ManyToManyField('contacts.Contact', blank=True, related_name='campaigns')
    tags = models.ManyToManyField(ContactTag, blank=True, related_name='campaigns')
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='campaigns'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"
