import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __repr__(self):
        return f"<{self.__class__.__name__} id={self.id}>"



# Soft Delete Layer
class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)

    def delete(self):
        """Perform soft delete on the entire queryset."""
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def restore(self):
        """Restore soft-deleted records in the queryset."""
        return self.update(is_deleted=False, deleted_at=None)

    def hard_delete(self, confirm=False):
        """
        GDPR-compliant permanent physical deletion from the database.
        Requires explicit `confirm=True` to prevent accidental developer wipes.
        """
        if not confirm:
            raise ValueError("You must pass confirm=True to permanently delete these records.")
        return super().delete()


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        # Default manager excludes soft-deleted rows automatically
        return SoftDeleteQuerySet(self.model, using=self._db).alive()


class AllObjectsManager(models.Manager):
    """
    Escape hatch manager returning both active and soft-deleted rows.
    """
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, *args, hard=False, **kwargs):
        if hard:
            return super().delete(*args, **kwargs)
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])




# Auditing & Combinations
class AuditableModel(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        abstract = True



class ProxyURL(BaseModel):
    name = models.CharField(max_length=255, default="Default Proxy")
    url = models.URLField()

    def __str__(self):
        return f"{self.name} ({self.url})"


class UserActiveProxy(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='active_proxy')
    proxy = models.ForeignKey(ProxyURL, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.user} -> {self.proxy}"


