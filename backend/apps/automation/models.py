
import uuid
from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import BaseModel, SoftDeleteModel


# Constants
class NodeType(models.TextChoices):
    TRIGGER       = "trigger",       "Trigger"
    ACTION        = "action",        "Send Message"
    WAIT          = "wait",          "Wait / Delay"
    CONDITION     = "condition",     "Condition Split"
    MENU          = "menu",          "Menu Options"
    END_CHAT      = "end_chat",      "End Chat"
    COLLECT_INPUT = "collect_input", "Collect Input"
    SAVE_CONTACT  = "save_contact",  "Save Contact"
    AI_CONTROL    = "ai_control",    "AI Control"
    HTTP_REQUEST  = "http_request",  "HTTP Request"


class TriggerType(models.TextChoices):
    INBOUND_MESSAGE  = "inbound_message",  "Inbound Message"
    KEYWORD          = "keyword",          "Keyword Match"
    NEW_CONTACT      = "new_contact",      "New Contact"
    CONTACT_TAG      = "contact_tag",      "Contact Tagged"
    SCHEDULED        = "scheduled",        "Scheduled"
    WEBHOOK          = "webhook",          "Incoming Webhook"


class FlowStatus(models.TextChoices):
    DRAFT    = "draft",    "Draft"
    ACTIVE   = "active",   "Active"
    PAUSED   = "paused",   "Paused"
    ARCHIVED = "archived", "Archived"


class ExecutionStatus(models.TextChoices):
    RUNNING   = "running",   "Running"
    WAITING   = "waiting",   "Waiting for Input"
    COMPLETED = "completed", "Completed"
    FAILED    = "failed",    "Failed"
    CANCELLED = "cancelled", "Cancelled"


class StepStatus(models.TextChoices):
    PENDING   = "pending",   "Pending"
    RUNNING   = "running",   "Running"
    COMPLETED = "completed", "Completed"
    FAILED    = "failed",    "Failed"
    SKIPPED   = "skipped",   "Skipped"



# AutomationFlow 
class AutomationFlow(BaseModel, SoftDeleteModel):

    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status      = models.CharField(
        max_length=20, choices=FlowStatus.choices, default=FlowStatus.DRAFT, db_index=True
    )

    # The WhatsApp instance this flow is scoped to (optional – NULL = all instances)
    instance = models.ForeignKey(
        "whatsapp.WhatsappInstance",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="automation_flows",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="automation_flows",
    )

    # Canvas viewport state: { x, y, zoom }
    viewport = models.JSONField(default=dict, blank=True)

    # Execution counters (denormalised for fast dashboard display)
    total_executions   = models.PositiveIntegerField(default=0)
    active_executions  = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        verbose_name        = "Automation Flow"
        verbose_name_plural = "Automation Flows"

    def __str__(self):
        return f"{self.name} [{self.status}]"

    def activate(self):
        """Mark flow as active."""
        self.status = FlowStatus.ACTIVE
        self.save(update_fields=["status", "updated_at"])

    def pause(self):
        self.status = FlowStatus.PAUSED
        self.save(update_fields=["status", "updated_at"])


# FlowNode  —  one canvas node
class FlowNode(BaseModel):
    """
    One node on the ReactFlow canvas.

    `node_id`   mirrors the frontend id (e.g. "n_1721730000000") so the
                backend can round-trip the exact same id without remapping.
    `config`    is a JSONField whose schema depends on `node_type`.

    Config schemas (matching frontend INITIAL_DATA):
    ─────────────────────────────────────────────────
    trigger:
        { triggerType, keywords[], description }

    action (send message):
        { message, mediaUrl, mediaName, mediaType }

    wait:
        { delayValue: int, delayUnit: "seconds"|"minutes"|"hours"|"days" }

    condition:
        { conditions: [{ field, operator, value, logic }] }

    menu:
        { message, invalidOptionMessage, noMatchMessage,
          options: [{ id, label, value }] }

    end_chat:
        { closingMessage }

    collect_input:
        { prompt, variableName, validationType, errorMessage, maxRetries }

    save_contact:
        { fieldToUpdate, fieldValue, tagToAdd }

    ai_control:
        { aiAction: "enable_ai"|"disable_ai", systemInstructions, agentPersona }

    http_request:
        { httpMethod, url, headers: {}, requestBody, responseVariable }
    """

    flow = models.ForeignKey(
        AutomationFlow,
        on_delete=models.CASCADE,
        related_name="nodes",
    )

    # Frontend-assigned node id (stable across saves)
    node_id = models.CharField(max_length=64, db_index=True)

    node_type = models.CharField(
        max_length=20, choices=NodeType.choices, db_index=True
    )

    # Human-readable label shown on the canvas card
    title       = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")

    # Canvas position & size (mirrors ReactFlow node.position / width / height)
    pos_x  = models.FloatField(default=0)
    pos_y  = models.FloatField(default=0)
    width  = models.FloatField(default=220)
    height = models.FloatField(default=100)

    # All node-type-specific fields live here
    config = models.JSONField(default=dict, blank=True)

    # Bumped whenever the config schema changes — lets the executor handle old saved flows
    config_version = models.PositiveSmallIntegerField(default=1)

    # Required config keys per node type (used in clean()) 
    _REQUIRED_CONFIG_KEYS: dict[str, list[str]] = {
        "trigger":       [],
        "action":        ["message"],
        "wait":          ["delayValue", "delayUnit"],
        "condition":     ["conditions"],
        "menu":          ["message", "options"],
        "end_chat":      ["closingMessage"],
        "collect_input": ["prompt", "variableName"],
        "save_contact":  ["fieldToUpdate", "fieldValue"],
        "ai_control":    ["aiAction"],
        "http_request":  ["httpMethod", "url"],
    }

    def clean(self):
        """Validate that config contains at least the required keys for this node_type."""
        required = self._REQUIRED_CONFIG_KEYS.get(self.node_type, [])
        if required and isinstance(self.config, dict):
            missing = [k for k in required if k not in self.config]
            if missing:
                raise ValidationError(
                    {"config": f"Node type '{self.node_type}' is missing required config keys: {missing}"}
                )

    class Meta:
        ordering = ["created_at"]
        unique_together = [("flow", "node_id")]
        verbose_name        = "Flow Node"
        verbose_name_plural = "Flow Nodes"

    def __str__(self):
        return f"[{self.node_type}] {self.title or self.node_id}"


# FlowEdge  —  directed connection between two nodes
class FlowEdge(BaseModel):

    flow = models.ForeignKey(
        AutomationFlow,
        on_delete=models.CASCADE,
        related_name="edges",
    )

    edge_id = models.CharField(max_length=128, db_index=True)
    source_node = models.ForeignKey(
        FlowNode,
        on_delete=models.CASCADE,
        related_name="outgoing_edges",
    )
    target_node = models.ForeignKey(
        FlowNode,
        on_delete=models.CASCADE,
        related_name="incoming_edges",
    )

    # Used for nodes with multiple outputs (condition true/false, menu options)
    source_handle = models.CharField(max_length=64, blank=True, default="")
    target_handle = models.CharField(max_length=64, blank=True, default="")

    label = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["created_at"]
        unique_together = [("flow", "edge_id")]
        verbose_name        = "Flow Edge"
        verbose_name_plural = "Flow Edges"

    def __str__(self):
        return f"{self.source_node.node_id} → {self.target_node.node_id}"



# FlowExecution  —  one run of a flow for one contact
class FlowExecution(BaseModel):

    flow = models.ForeignKey(
        AutomationFlow,
        on_delete=models.CASCADE,
        related_name="executions",
    )

    # The WhatsApp contact that triggered this execution
    contact = models.ForeignKey(
        "messaging.Contact",
        on_delete=models.CASCADE,
        related_name="flow_executions",
    )

    status = models.CharField(
        max_length=20, choices=ExecutionStatus.choices,
        default=ExecutionStatus.RUNNING, db_index=True,
    )

    # The node currently being processed (NULL when finished)
    current_node = models.ForeignKey(
        FlowNode,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="active_executions",
    )

    # Runtime accumulated variables (template interpolation)
    variables = models.JSONField(default=dict, blank=True)
    resume_at = models.DateTimeField(null=True, blank=True, db_index=True)
    started_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Error message if status == failed
    error = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-started_at"]
        verbose_name        = "Flow Execution"
        verbose_name_plural = "Flow Executions"
        # Composite indexes for fast dashboard/queue queries
        indexes = [
            models.Index(fields=["flow", "status"],    name="exec_flow_status_idx"),
            models.Index(fields=["contact", "status"], name="exec_contact_status_idx"),
            models.Index(fields=["current_node"],      name="exec_current_node_idx"),
            models.Index(fields=["resume_at"],         name="exec_resume_at_idx"),
        ]

    def __str__(self):
        return f"Execution {str(self.id)[:8]} | {self.flow.name} | {self.contact}"

    def complete(self):
        self.status       = ExecutionStatus.COMPLETED
        self.completed_at = timezone.now()
        self.current_node = None
        self.save(update_fields=["status", "completed_at", "current_node", "updated_at"])

    def fail(self, error: str):
        self.status       = ExecutionStatus.FAILED
        self.completed_at = timezone.now()
        self.error        = error
        self.save(update_fields=["status", "completed_at", "error", "updated_at"])


# FlowStepLog 
class FlowStepLog(BaseModel):
   
    execution = models.ForeignKey(
        FlowExecution,
        on_delete=models.CASCADE,
        related_name="step_logs",
    )

    node = models.ForeignKey(
        FlowNode,
        on_delete=models.CASCADE,
        related_name="step_logs",
    )

    status = models.CharField(
        max_length=20, choices=StepStatus.choices, default=StepStatus.PENDING
    )

    # Snapshot of config at execution time (node may change after)
    node_config_snapshot = models.JSONField(default=dict, blank=True)

    # Variables captured by this step (e.g. collect_input saves here)
    output_variables = models.JSONField(default=dict, blank=True)

    # For http_request: raw API response body
    raw_response = models.TextField(blank=True, default="")

    # For condition: which branch was taken
    branch_taken = models.CharField(max_length=64, blank=True, default="")

    # For menu: which option the user selected
    user_input = models.CharField(max_length=512, blank=True, default="")

    started_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["started_at"]
        verbose_name        = "Flow Step Log"
        verbose_name_plural = "Flow Step Logs"

    def __str__(self):
        return f"Step {self.node} [{self.status}]"
