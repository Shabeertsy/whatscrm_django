import uuid

from django.conf import settings
from django.db import models
from apps.core.models import BaseModel


class WhatsappInstance(BaseModel):
    INSTANCE_TYPE_CHOICES = (
        ('meta_cloud', 'Official Meta Cloud API'),
        ('scanned_device', 'Scanned Physical Device (Evolution API)'),
    )
    instance_type = models.CharField(
        max_length=30,
        choices=INSTANCE_TYPE_CHOICES,
        default='meta_cloud',
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="whatsapp_instances",
    )
    display_name = models.CharField(
        max_length=255,
        help_text="Friendly label, e.g. 'Sales', 'Support'",
    )
    phone_number_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Phone Number ID from Meta Developer Console",
    )
    whatsapp_business_account_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="WABA ID",
        help_text="WhatsApp Business Account ID",
    )
    app_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Meta App ID",
        help_text="Meta App ID required for Resumable Upload API",
    )
    access_token = models.TextField(
        blank=True,
        default="",
        help_text="Permanent or temporary access token from Meta",
    )
    webhook_verify_token = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Token you set in Meta webhook configuration",
    )
    is_active = models.BooleanField(default=True)

    # ── Evolution API Fields (Scanned Physical Devices) ───────────────────
    evolution_instance_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        help_text="Instance identifier in Evolution API",
    )
    evolution_status = models.CharField(
        max_length=50,
        default="disconnected",
        help_text="Connection status reported by Evolution API (e.g. open, close, connecting)",
    )
    evolution_phone = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Connected physical phone number",
    )
    evolution_qr_code = models.TextField(
        blank=True,
        default="",
        help_text="Latest base64 QR code or pairing code for linking",
    )
    
    class Meta(BaseModel.Meta):
        verbose_name = "WhatsApp Instance"
        verbose_name_plural = "WhatsApp Instances"

    def __str__(self):
        return f"{self.display_name} ({self.user})"


class WhatsappTemplate(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PAUSED = "PAUSED", "Paused"
        DISABLED = "DISABLED", "Disabled"

    class Category(models.TextChoices):
        MARKETING = "MARKETING", "Marketing"
        UTILITY = "UTILITY", "Utility"
        AUTHENTICATION = "AUTHENTICATION", "Authentication"

    class TemplateType(models.TextChoices):
        REGULAR = "REGULAR", "Regular"
        CAMPAIGN = "CAMPAIGN", "Campaign"

    instance = models.ForeignKey(WhatsappInstance,on_delete=models.CASCADE,related_name="templates")
    meta_id = models.CharField(max_length=100,unique=True,db_index=True,blank=True,null=True,)
    name = models.CharField(max_length=255)
    language = models.CharField(max_length=20)
    components = models.JSONField(default=list)
    rejection_reason = models.TextField(blank=True)
    quality_score = models.CharField(max_length=20, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
    )
    template_type = models.CharField(
        max_length=20,
        choices=TemplateType.choices,
        default=TemplateType.REGULAR,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    class Meta:
        unique_together = ('instance', 'name', 'language')
        verbose_name = "WhatsApp Template"
        verbose_name_plural = "WhatsApp Templates"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.language})"
