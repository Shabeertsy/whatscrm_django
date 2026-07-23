from rest_framework import serializers
from django.db import transaction
from .models import AutomationFlow, FlowNode, FlowEdge, FlowStatus


class FlowNodeSerializer(serializers.ModelSerializer):
    # Map React Flow's 'id' to 'node_id' in our model
    id = serializers.CharField(source='node_id')
    # Map React Flow's 'position' to 'pos_x' and 'pos_y'
    position = serializers.SerializerMethodField()
    # Map React Flow's 'type' to 'node_type'
    type = serializers.CharField(source='node_type')
    # Map React Flow's 'data' to 'config' and 'title'/'description'
    data = serializers.SerializerMethodField()

    class Meta:
        model = FlowNode
        exclude = ["flow", "created_at", "updated_at", "node_id", "node_type", "pos_x", "pos_y", "config", "title", "description"]

    def get_position(self, obj):
        return {"x": obj.pos_x, "y": obj.pos_y}

    def get_data(self, obj):
        # Merge config with title and description
        return {
            "title": obj.title,
            "description": obj.description,
            **obj.config
        }


class FlowEdgeSerializer(serializers.ModelSerializer):
    # Map React Flow's 'id' to 'edge_id'
    id = serializers.CharField(source='edge_id')
    # Map React Flow's 'source' to 'source_node.node_id'
    source = serializers.CharField(source='source_node.node_id', read_only=True)
    target = serializers.CharField(source='target_node.node_id', read_only=True)
    sourceHandle = serializers.CharField(source='source_handle', required=False, allow_blank=True)
    targetHandle = serializers.CharField(source='target_handle', required=False, allow_blank=True)

    class Meta:
        model = FlowEdge
        fields = ["id", "source", "target", "sourceHandle", "targetHandle", "label"]


class AutomationFlowSerializer(serializers.ModelSerializer):
    nodes = FlowNodeSerializer(many=True, read_only=True)
    edges = FlowEdgeSerializer(many=True, read_only=True)
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = AutomationFlow
        fields = [
            "id", "name", "description", "status", "instance", "owner",
            "viewport", "total_executions", "active_executions",
            "created_at", "updated_at", "nodes", "edges"
        ]
        read_only_fields = [
            "id", "status", "total_executions", "active_executions",
            "created_at", "updated_at"
        ]

    @transaction.atomic
    def update_graph(self, instance, nodes_data, edges_data):
        """
        Custom method to handle saving the graph structure from the frontend
        since the frontend sends a specific React Flow JSON structure.
        """
        # Delete existing nodes and edges (cascade handles edges)
        instance.nodes.all().delete()

        node_map = {}
        for node_payload in nodes_data:
            node_id = node_payload.get('id')
            pos = node_payload.get('position', {'x': 0, 'y': 0})
            data = node_payload.get('data', {})
            
            title = data.pop('title', '')
            description = data.pop('description', '')
            
            node = FlowNode.objects.create(
                flow=instance,
                node_id=node_id,
                node_type=node_payload.get('type', 'trigger'),
                pos_x=pos.get('x', 0),
                pos_y=pos.get('y', 0),
                width=node_payload.get('width', 220),
                height=node_payload.get('height', 100),
                title=title,
                description=description,
                config=data
            )
            node_map[node_id] = node

        for edge_payload in edges_data:
            source_id = edge_payload.get('source')
            target_id = edge_payload.get('target')
            
            if source_id in node_map and target_id in node_map:
                FlowEdge.objects.create(
                    flow=instance,
                    edge_id=edge_payload.get('id'),
                    source_node=node_map[source_id],
                    target_node=node_map[target_id],
                    source_handle=edge_payload.get('sourceHandle', ''),
                    target_handle=edge_payload.get('targetHandle', ''),
                    label=edge_payload.get('label', '')
                )

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user
            
        return super().create(validated_data)
