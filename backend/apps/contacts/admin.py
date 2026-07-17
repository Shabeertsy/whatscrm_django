from django.contrib import admin
from .models import Contact, ContactTag,Pipeline,PipelineDeal,PipelineStage

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'owner', 'status')
    search_fields = ('name', 'phone', 'email')
    list_filter = ('owner', 'status', 'tags')

@admin.register(ContactTag)
class ContactTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'color')


@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "owner", "is_active")


@admin.register(PipelineStage)
class PipelineStageAdmin(admin.ModelAdmin):
    list_display = ("title", "pipeline", "order")


@admin.register(PipelineDeal)
class PipelineDealAdmin(admin.ModelAdmin):
    list_display = ("name", "stage", "pipeline")
