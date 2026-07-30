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

    FREQUENCY_CHOICES = [
        ('once', 'One-time'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom Day Gap'),
    ]

    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    template_name = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    # Recurrence Settings
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='once')
    custom_days_gap = models.PositiveIntegerField(null=True, blank=True, help_text="Number of days between runs if frequency is custom")

    # Execution Tracking
    last_run_at = models.DateTimeField(null=True, blank=True, help_text="When the last campaign run was executed")
    next_run_at = models.DateTimeField(null=True, blank=True, help_text="Scheduled datetime for the next run")

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


class CampaignDelivery(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='deliveries',
    )
    contact = models.ForeignKey(
        'contacts.Contact',
        on_delete=models.CASCADE,
        related_name='campaign_deliveries',
    )
    run_id = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    error = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('campaign', 'contact', 'run_id')
        indexes = [
            models.Index(fields=['campaign', 'run_id', 'status']),
        ]

    def __str__(self):
        return f"Delivery[{self.campaign_id}|{self.contact_id}|{self.run_id}] → {self.status}"
