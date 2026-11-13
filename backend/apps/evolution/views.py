import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.core.scoping import scope_by_owner
from apps.whatsapp.models import WhatsappInstance
from apps.whatsapp.serializers import WhatsappInstanceSerializer
from .services import (
    create_scanned_instance,
    get_instance_qr,
    sync_instance_status,
    sync_scanned_instance_chats,
    disconnect_scanned_instance,
    delete_scanned_instance,
)

logger = logging.getLogger(__name__)


class ScannedInstanceCreateView(APIView):
    """
    Creates a new Scanned Physical Device WhatsApp instance.
    Initializes session on Evolution API and returns initial QR code.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        display_name = str(request.data.get("display_name") or "").strip()
        if not display_name:
            return Response(
                {"error": "Display name is required (e.g. 'Support Phone 1')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            instance = create_scanned_instance(request.user, display_name)
            serializer = WhatsappInstanceSerializer(instance)
            return Response(
                {
                    "instance": serializer.data,
                    "qr_code": instance.evolution_qr_code,
                    "status": instance.evolution_status,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            logger.exception(f"Error creating scanned device instance: {exc}")
            return Response(
                {"error": f"Failed to initialize Evolution API instance: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ScannedInstanceQRView(APIView):
    """
    Fetches a refreshed QR code if the previous one expired or was cleared.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        instance = get_object_or_404(
            scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field="user"),
            id=id,
            instance_type="scanned_device",
        )

        try:
            qr_code = get_instance_qr(instance)
            return Response({
                "id": str(instance.id),
                "qr_code": qr_code,
                "status": instance.evolution_status,
                "is_active": instance.is_active,
            })
        except Exception as exc:
            logger.warning(f"Failed to fetch QR for instance {instance.id}: {exc}")
            return Response(
                {"error": "Unable to generate QR code from Evolution API."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ScannedInstanceStatusView(APIView):
    """
    Live status poll: returns 'open', 'close', or 'connecting'.
    Used by frontend polling loop during device scanning.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        instance = get_object_or_404(
            scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field="user"),
            id=id,
            instance_type="scanned_device",
        )

        current_status = sync_instance_status(instance)
        return Response({
            "id": str(instance.id),
            "status": current_status,
            "is_active": instance.is_active,
            "phone": instance.evolution_phone,
            "has_qr": bool(instance.evolution_qr_code),
        })


class ScannedInstanceDisconnectView(APIView):
    """
    Logs out the active physical phone session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        instance = get_object_or_404(
            scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field="user"),
            id=id,
            instance_type="scanned_device",
        )

        success = disconnect_scanned_instance(instance)
        return Response({
            "id": str(instance.id),
            "status": "disconnected",
            "is_active": False,
            "success": success,
        })


class ScannedInstanceSyncView(APIView):
    """
    Manually syncs / re-syncs chats and messages from Evolution API for this instance.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        instance = get_object_or_404(
            scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field="user"),
            id=id,
            instance_type="scanned_device",
        )

        imported = sync_scanned_instance_chats(instance)
        return Response({
            "id": str(instance.id),
            "imported_messages": imported,
            "status": instance.evolution_status,
        })


class ScannedInstanceRescanView(APIView):
    """
    Disconnects any active session and immediately generates a fresh QR code for re-linking.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        instance = get_object_or_404(
            scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field="user"),
            id=id,
            instance_type="scanned_device",
        )

        disconnect_scanned_instance(instance)
        qr_code = get_instance_qr(instance)
        instance.evolution_status = "connecting"
        instance.save(update_fields=["evolution_status", "updated_at"])

        return Response({
            "id": str(instance.id),
            "qr_code": qr_code,
            "status": "connecting",
            "is_active": False,
        })


