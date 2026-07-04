from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import WhatsappInstance
from .serializers import WhatsappInstanceSerializer, WhatsappInstanceListSerializer


class WhatsappInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WhatsappInstance.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        # Use the lean serializer for list so we don't leak tokens
        if self.action == "list":
            return WhatsappInstanceListSerializer
        return WhatsappInstanceSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """Quickly activate / deactivate an instance without a full PUT."""
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(
            {"id": str(instance.id), "is_active": instance.is_active},
            status=status.HTTP_200_OK,
        )
