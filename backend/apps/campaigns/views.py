from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Campaign
from .serializers import CampaignSerializer, CampaignDeliverySerializer


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Campaign.objects.filter(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Sum
        qs = self.get_queryset()
        
        total_campaigns = qs.count()
        active_campaigns = qs.filter(status='Running').count()
        
        totals = qs.aggregate(
            total_delivered=Sum('delivered'),
            total_read=Sum('read')
        )
        total_delivered = totals['total_delivered'] or 0
        total_read = totals['total_read'] or 0
        
        avg_read_rate = 0
        if total_delivered > 0:
            avg_read_rate = round((total_read / total_delivered) * 100)
            
        return Response({
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "total_delivered": total_delivered,
            "avg_read_rate": avg_read_rate,
        })

    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        campaign = self.get_object()
        deliveries = campaign.deliveries.select_related('contact').order_by('-sent_at', '-id')
        
        page = self.paginate_queryset(deliveries)
        if page is not None:
            serializer = CampaignDeliverySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CampaignDeliverySerializer(deliveries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def clear_deliveries(self, request, pk=None):
        campaign = self.get_object()
        campaign.deliveries.all().delete()
        
        # Reset campaign metrics
        campaign.sent = 0
        campaign.delivered = 0
        campaign.read = 0
        campaign.replied = 0
        campaign.save(update_fields=['sent', 'delivered', 'read', 'replied'])
        
        return Response({"message": "Delivery logs cleared successfully."})

    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        from django.conf import settings
        from .tasks import execute_campaign_run

        campaign = self.get_object()

        if campaign.status not in ['Draft', 'Paused']:
            return Response(
                {"error": "Only Draft or Paused campaigns can be launched."},
                status=status.HTTP_400_BAD_REQUEST
            )

        campaign.status = 'Running'
        campaign.save(update_fields=['status'])

        # Fire the first run immediately via Celery
        celery_enabled = getattr(settings, 'CELERY_ENABLED', False)
        if celery_enabled:
            execute_campaign_run.delay(str(campaign.id))
        else:
            execute_campaign_run(str(campaign.id))

        serializer = self.get_serializer(campaign)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        campaign = self.get_object()

        if campaign.status in ('Paused', 'Completed', 'Draft'):
            return Response(
                {"error": f"Campaign is already '{campaign.status}' and cannot be stopped."},
                status=status.HTTP_400_BAD_REQUEST
            )

        campaign.status = 'Paused'
        campaign.next_run_at = None  
        campaign.save(update_fields=['status', 'next_run_at'])

        serializer = self.get_serializer(campaign)
        return Response(serializer.data)
