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

