from django.urls import path
from .views import (
    ScannedInstanceCreateView,
    ScannedInstanceQRView,
    ScannedInstanceStatusView,
    ScannedInstanceDisconnectView,
    ScannedInstanceSyncView,
    ScannedInstanceRescanView,
)
from .webhook import EvolutionWebhookView

urlpatterns = [
    # Scanned Instance Management Endpoints
    path("instances/", ScannedInstanceCreateView.as_view(), name="evolution_instance_create"),
    path("instances/<uuid:id>/qr/", ScannedInstanceQRView.as_view(), name="evolution_instance_qr"),
    path("instances/<uuid:id>/status/", ScannedInstanceStatusView.as_view(), name="evolution_instance_status"),
    path("instances/<uuid:id>/sync/", ScannedInstanceSyncView.as_view(), name="evolution_instance_sync"),
    path("instances/<uuid:id>/rescan/", ScannedInstanceRescanView.as_view(), name="evolution_instance_rescan"),
    path("instances/<uuid:id>/disconnect/", ScannedInstanceDisconnectView.as_view(), name="evolution_instance_disconnect"),

    # Dedicated Isolated Inbound Webhook
    path("webhook/<str:instance_name>/", EvolutionWebhookView.as_view(), name="evolution_webhook_named"),
    path("webhook/", EvolutionWebhookView.as_view(), name="evolution_webhook_root"),
]

