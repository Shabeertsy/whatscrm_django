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
    name = models.CharField(max_length=255, default="WhatSapp Assistant Agent")
    provider = models.ForeignKey(AIProviderSettings, on_delete=models.SET_NULL, null=True, blank=True)
    model_name = models.CharField(max_length=255, default="gpt-4o")
    system_prompt = models.TextField(default="You are a professional customer support representative.")
    temperature = models.FloatField(default=0.7)
    auto_reply_delay = models.PositiveIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    knowledge_base = models.FileField(upload_to="ai_knowledge_bases/", blank=True, null=True)

    def save(self, *args, **kwargs):
        if self._state.adding and AIAgentSettings.objects.exists():
            existing = AIAgentSettings.objects.first()
            self.pk = existing.pk
            if hasattr(self, 'created_at'):
                self.created_at = existing.created_at
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
