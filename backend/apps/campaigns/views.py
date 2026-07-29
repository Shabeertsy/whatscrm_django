from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Campaign
from .serializers import CampaignSerializer



class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users should only see their own campaigns
        return Campaign.objects.filter(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        campaign = self.get_object()
        
        if campaign.status not in ['Draft', 'Paused']:
            return Response(
                {"error": "Only Draft or Paused campaigns can be launched."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        campaign.status = 'Running'
        campaign.save(update_fields=['status'])
        
        serializer = self.get_serializer(campaign)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        campaign = self.get_object()
        
        if campaign.status != 'Running':
            return Response(
                {"error": "Only Running campaigns can be stopped."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        campaign.status = 'Paused'
        campaign.save(update_fields=['status'])
        
        serializer = self.get_serializer(campaign)
        return Response(serializer.data)

