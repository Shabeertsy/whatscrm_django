import uuid

from django.db import models
from apps.core.models import BaseModel
from apps.whatsapp.models import WhatsappInstance


class WhatsappFlow(BaseModel):
    """
    Stores a WhatsApp Flow definition (JSON) managed via Meta's Flow API.
    One flow = one interactive form shown inside WhatsApp.
    """

    class FlowStatus(models.TextChoices):
        DRAFT      = "DRAFT",      "Draft"
        PUBLISHED  = "PUBLISHED",  "Published"
        DEPRECATED = "DEPRECATED", "Deprecated"
        BLOCKED    = "BLOCKED",    "Blocked"

    class FlowCategory(models.TextChoices):
        BOOKING          = "BOOKING",          "Booking"
        LEAD_GENERATION  = "LEAD_GENERATION",  "Lead Generation"
        CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT", "Customer Support"
        SURVEY           = "SURVEY",           "Survey"
        OTHER            = "OTHER",            "Other"

    instance = models.ForeignKey(
        WhatsappInstance,
        on_delete=models.CASCADE,
        related_name="wa_flows",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    meta_flow_id = models.CharField(
        max_length=100, blank=True, null=True, db_index=True,
        help_text="Flow ID returned by Meta after creation",
    )
    category = models.CharField(
        max_length=50,
        choices=FlowCategory.choices,
        default=FlowCategory.BOOKING,
    )

    # The full JSON definition
    flow_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="WhatsApp Flow JSON (screens definition)",
    )

    status = models.CharField(
        max_length=20,
        choices=FlowStatus.choices,
        default=FlowStatus.DRAFT,
        db_index=True,
    )

    # Your public data-exchange endpoint registered with Meta
    endpoint_uri = models.URLField(
        blank=True,
        help_text="Your /api/flows/wa/data-exchange/ URL (auto-filled from settings)",
    )
    preview_url = models.URLField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "WhatsApp Flow"
        verbose_name_plural = "WhatsApp Flows"

    def __str__(self):
        return f"{self.name} [{self.status}]"


class FlowSubmission(BaseModel):
    """
    Records every completed WhatsApp Flow form submission.
    Linked back to the Conversation so agents can see it in the inbox.
    """
    flow = models.ForeignKey(
        WhatsappFlow,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    conversation = models.ForeignKey(
        "messaging.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flow_submissions",
    )
    contact_wa_id = models.CharField(max_length=30, db_index=True)

    # All data collected across all screens, keyed by field name
    screen_data = models.JSONField(
        default=dict,
        help_text="All field values submitted across all screens",
    )

    # The unique token we generated when sending the flow CTA button.
    flow_token = models.CharField(max_length=255, blank=True, db_index=True)
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Flow Submission"
        verbose_name_plural = "Flow Submissions"

    def __str__(self):
        return f"Submission [{self.flow.name}] by {self.contact_wa_id}"
