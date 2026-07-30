from django.contrib import admin
from .models import Campaign, CampaignDelivery

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'template_name', 'owner', 'created_at', 'last_run_at', 'sent', 'failed_count')
    list_filter = ('status', 'target_type', 'frequency')
    search_fields = ('name', 'template_name', 'owner__email')
    readonly_fields = ('sent', 'delivered', 'read', 'replied', 'created_at', 'updated_at')

    def failed_count(self, obj):
        return obj.deliveries.filter(status='failed').count()
    failed_count.short_description = 'Failed'

@admin.register(CampaignDelivery)
class CampaignDeliveryAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'contact', 'status', 'run_id', 'sent_at')
    list_filter = ('status', 'run_id')
    search_fields = ('campaign__name', 'contact__wa_id', 'contact__phone', 'error')
    readonly_fields = ('sent_at',)
