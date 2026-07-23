from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AutomationFlow, FlowStatus
from .serializers import AutomationFlowSerializer



class AutomationFlowViewSet(viewsets.ModelViewSet):
    serializer_class = AutomationFlowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AutomationFlow.objects.filter(owner=self.request.user)


    def update(self, request, *args, **kwargs):
        """
        Custom update method to handle syncing the graph data (nodes/edges).
        The frontend sends `nodes` and `edges` alongside the flow data.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Serialize the normal fields (name, description, viewport, etc)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Handle the graph structure if provided
        nodes_data = request.data.get('nodes', None)
        edges_data = request.data.get('edges', None)
        
        if nodes_data is not None and edges_data is not None:
            serializer.update_graph(instance, nodes_data, edges_data)

        # Re-fetch instance to get updated nodes and edges for the response
        instance.refresh_from_db()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        flow = self.get_object()
        flow.activate()
        return Response({'status': 'activated', 'flow_status': flow.status})

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        flow = self.get_object()
        flow.pause()
        return Response({'status': 'paused', 'flow_status': flow.status})
