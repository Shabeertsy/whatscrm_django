import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import BaseModel

class Location(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Department(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('admin', 'Admin'),
        ('agent', 'Agent'),
        ('staff', 'Staff'),
    )

    # Primary Key (UUID)
    id = models.UUIDField( 
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Extra fields
    phone_number = models.CharField(
        max_length=30,
        blank=True,
        null=True
    )

    user_type = models.CharField(
        max_length=20,
        choices=USER_TYPE_CHOICES,
        default='staff'
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )

    location = models.ForeignKey(
        'Location',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


class DepartmentRolePermission(BaseModel):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('agent', 'CRM Agent'),
        ('staff', 'General Staff'),
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='role_permissions'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    permissions = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('department', 'role')
        ordering = ['department__name', 'role']

    def __str__(self):
        return f"{self.department.name} — {self.role}"