from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Pipeline, PipelineStage, PipelineDeal
from .utils import increment_pipeline_cache_version



@receiver([post_save, post_delete], sender=Pipeline)
def invalidate_pipeline_cache(sender, instance, **kwargs):
    increment_pipeline_cache_version(instance.owner_id)

@receiver([post_save, post_delete], sender=PipelineStage)
def invalidate_pipeline_stage_cache(sender, instance, **kwargs):
    increment_pipeline_cache_version(instance.owner_id)

@receiver([post_save, post_delete], sender=PipelineDeal)
def invalidate_pipeline_deal_cache(sender, instance, **kwargs):
    increment_pipeline_cache_version(instance.owner_id)
