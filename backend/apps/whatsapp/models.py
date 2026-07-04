import uuid

from django.conf import settings
from django.db import models


class WhatsappInstance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
        help_text="Phone Number ID from Meta Developer Console",
    )
    whatsapp_business_account_id = models.CharField(
        max_length=255,
        verbose_name="WABA ID",
        help_text="WhatsApp Business Account ID",
    )
    access_token = models.TextField(
        help_text="Permanent or temporary access token from Meta",
    )
    webhook_verify_token = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Token you set in Meta webhook configuration",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "WhatsApp Instance"
        verbose_name_plural = "WhatsApp Instances"

    def __str__(self):
        return f"{self.display_name} ({self.user})"
