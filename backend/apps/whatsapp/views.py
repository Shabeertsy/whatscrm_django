from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import WhatsappInstance, WhatsappTemplate
from .serializers import WhatsappInstanceSerializer, WhatsappInstanceListSerializer, WhatsappTemplateSerializer
import requests
import logging
from django.utils import timezone
from rest_framework.views import APIView
from .utils import get_meta_template_url



class WhatsappInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WhatsappInstance.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return WhatsappInstanceListSerializer
        return WhatsappInstanceSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = not instance.is_active
        instance.save(update_fields=["is_active", "updated_at"])
        return Response(
            {"id": str(instance.id), "is_active": instance.is_active},
            status=status.HTTP_200_OK,
        )


class WhatsappTemplateSyncAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        try:
            instance = WhatsappInstance.objects.get(id=instance_id, user=request.user)
        except WhatsappInstance.DoesNotExist:
            return Response({"error": "Instance not found"}, status=status.HTTP_404_NOT_FOUND)

        if not instance.whatsapp_business_account_id or not instance.access_token:
            return Response({"error": "WABA ID or Access Token missing"}, status=status.HTTP_400_BAD_REQUEST)

        url = get_meta_template_url(waba_id=instance.whatsapp_business_account_id)
        headers = {"Authorization": f"Bearer {instance.access_token}"}
        
        try:
            res = requests.get(url, headers=headers, params={"limit": 1000})
            res.raise_for_status()
            data = res.json().get("data", [])
            
            # Sync to DB
            synced = 0
            for tmpl in data:
                # Meta returns quality_score as an object, e.g. {"score": "GREEN"}
                q_score = tmpl.get("quality_score", {})
                score_val = q_score.get("score", "") if isinstance(q_score, dict) else ""
                
                obj, created = WhatsappTemplate.objects.update_or_create(
                    instance=instance,
                    name=tmpl.get("name"),
                    language=tmpl.get("language"),
                    defaults={
                        "meta_id": tmpl.get("id"),
                        "category": tmpl.get("category", ""),
                        "components": tmpl.get("components", []),
                        "status": tmpl.get("status", ""),
                        "rejection_reason": tmpl.get("rejected_reason", ""),
                        "quality_score": score_val,
                        "last_synced_at": timezone.now(),
                    }
                )
                if created: synced += 1
                
            return Response({"status": "ok", "synced": synced, "total": len(data)})
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to sync templates: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WhatsappTemplateListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = WhatsappTemplate.objects.filter(instance__user=request.user)
        serializer = WhatsappTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Forward creation to Meta API
        instance_id = request.data.get("instance")
        try:
            instance = WhatsappInstance.objects.get(id=instance_id, user=request.user)
        except WhatsappInstance.DoesNotExist:
            return Response({"error": "Instance not found"}, status=status.HTTP_404_NOT_FOUND)

        if not instance.whatsapp_business_account_id or not instance.access_token:
            return Response({"error": "Instance missing WABA ID or Access Token"}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "name": request.data.get("name"),
            "language": request.data.get("language"),
            "category": request.data.get("category"),
            "components": request.data.get("components", []),
        }

        url = get_meta_template_url(waba_id=instance.whatsapp_business_account_id)
        headers = {"Authorization": f"Bearer {instance.access_token}", "Content-Type": "application/json"}
        
        res = requests.post(url, json=payload, headers=headers)
        if res.status_code != 200 and res.status_code != 201:
            return Response({"error": "Meta API Error", "details": res.json()}, status=res.status_code)

        meta_data = res.json()
        
        # Save to DB
        serializer = WhatsappTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            meta_id=meta_data.get("id"),
            status=meta_data.get("status", "PENDING"),
            last_synced_at=timezone.now()
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WhatsappTemplateDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return WhatsappTemplate.objects.get(pk=pk, instance__user=user)
        except WhatsappTemplate.DoesNotExist:
            return None

    def get(self, request, pk):
        template = self.get_object(pk, request.user)
        if not template:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = WhatsappTemplateSerializer(template)
        return Response(serializer.data)

    def put(self, request, pk):
        template = self.get_object(pk, request.user)
        if not template:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        if template.status == "APPROVED":
            return Response(
                {"error": "Approved templates cannot be edited directly. Please duplicate and submit a new template."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        instance = template.instance

        if not instance.whatsapp_business_account_id or not instance.access_token:
            return Response({"error": "Instance missing WABA ID or Access Token"}, status=status.HTTP_400_BAD_REQUEST)
            
        payload = {
            "components": request.data.get("components", template.components),
        }
        
        url = get_meta_template_url(template_id=template.meta_id)
        headers = {"Authorization": f"Bearer {instance.access_token}", "Content-Type": "application/json"}
        
        res = requests.post(url, json=payload, headers=headers)
        if res.status_code != 200:
            return Response({"error": "Meta API Error", "details": res.json()}, status=res.status_code)
            
        serializer = WhatsappTemplateSerializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Status goes back to pending on edit
        serializer.save(status="PENDING", rejection_reason="")
        return Response(serializer.data)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        template = self.get_object(pk, request.user)
        if not template:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        instance = template.instance

        if instance.whatsapp_business_account_id and instance.access_token:
            url = get_meta_template_url(waba_id=instance.whatsapp_business_account_id)
            headers = {"Authorization": f"Bearer {instance.access_token}"}
            params = {
                "name": template.name,
                "language": template.language
            }
            
            try:
                requests.delete(url, headers=headers, params=params)
            except:
                pass
                
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

