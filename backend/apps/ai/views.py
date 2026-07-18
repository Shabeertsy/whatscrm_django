from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIAgentSettings, AIProviderSettings
from .serializers import AIAgentSettingsSerializer, AIProviderSettingsSerializer


class AIProviderSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AIProviderSettingsSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIProviderSettings.objects.all()


class AIAgentSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AIAgentSettingsSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIAgentSettings.objects.all()

    def create(self, request, *args, **kwargs):
        existing_instance = AIAgentSettings.objects.first()
        if existing_instance:
            serializer = self.get_serializer(existing_instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)
