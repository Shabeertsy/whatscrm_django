from django.db import models
from apps.core.models import BaseModel


class AIProviderSettings(BaseModel):
    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('claude', 'Claude'),
        ('gemini', 'Gemini'),
    ]
    name = models.CharField(max_length=255, default="Default Provider")
    ai_provider_name = models.CharField(max_length=255, choices=PROVIDER_CHOICES)
    ai_provider_api_key = models.CharField(max_length=255, blank=True, null=True)
    ai_provider_secret_key = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name


class AIAgentSettings(BaseModel):
    name = models.CharField(max_length=255, default="WhatsApp Assistant")
    provider = models.ForeignKey(AIProviderSettings, on_delete=models.SET_NULL, null=True, blank=True)
    model_name = models.CharField(max_length=255, default="gpt-4o-mini")
    system_prompt = models.TextField(
        default="You are a professional, friendly customer support representative. "
                "Be concise, helpful, and always respond in the same language as the customer."
    )
    temperature = models.FloatField(default=0.7)
    auto_reply_delay = models.PositiveIntegerField(default=2) 
    is_active = models.BooleanField(default=True)
    knowledge_base = models.FileField(upload_to="ai_knowledge_bases/", blank=True, null=True)

    def save(self, *args, **kwargs):
        if self._state.adding and AIAgentSettings.objects.exists():
            existing = AIAgentSettings.objects.first()
            if existing is not None:
                self.pk = existing.pk
                if hasattr(self, 'created_at'):
                    self.created_at = existing.created_at
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


## FlowBot
class FlowBot(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)

    instance = models.ForeignKey(
        'whatsapp.WhatsappInstance',
        on_delete=models.CASCADE,
        related_name='flow_bots',
        null=True, blank=True,
    )

    # Pointer to the first node of the flow graph
    start_node = models.ForeignKey(
        'FlowNode',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Flow Bot'
        verbose_name_plural = 'Flow Bots'

    def __str__(self):
        return self.name


class FlowNode(BaseModel):
    NODE_TYPE_CHOICES = [
        ('text',        'Send Text'),
        ('quick_reply', 'Quick Reply / Menu'),
        ('input_match', 'Match User Input'),
        ('condition',   'Condition Branch'),
        ('handoff',     'Handoff to Agent'),
        ('end',         'End Flow'),
    ]

    flow = models.ForeignKey(FlowBot, on_delete=models.CASCADE, related_name='nodes')
    node_type = models.CharField(max_length=30, choices=NODE_TYPE_CHOICES, default='text')
    label = models.CharField(max_length=255, blank=True)

    # Flexible JSON payload — interpreted differently per node_type
    content = models.JSONField(default=dict, blank=True)

    # Keywords that route to this node from a parent input_match/quick_reply node
    match_keywords = models.JSONField(default=list, blank=True)

    # Ordered children — the flow graph edges
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='children',
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Flow Node'
        verbose_name_plural = 'Flow Nodes'

    def __str__(self):
        return f"[{self.node_type}] {self.label or self.id}"


class ConversationFlowState(models.Model):
    conversation_id = models.IntegerField(db_index=True)
    flow = models.ForeignKey(FlowBot, on_delete=models.CASCADE, related_name='states')
    current_node = models.ForeignKey(
        FlowNode,
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    is_complete = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('conversation_id', 'flow')]
        verbose_name = 'Conversation Flow State'
        verbose_name_plural = 'Conversation Flow States'

    def __str__(self):
        return f"Conv {self.conversation_id} @ {self.current_node}"
