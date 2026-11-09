from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from apps.core.permissions import RequirePermission, Permission
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.core.scoping import scope_by_owner, get_tenant_owner
from .utils import get_meta_template_url, upload_media_to_meta_for_template

from .models import WhatsappInstance, WhatsappTemplate
from .serializers import WhatsappInstanceSerializer, WhatsappInstanceListSerializer, WhatsappTemplateSerializer
import requests
import logging
from django.utils import timezone



class WhatsappInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_SETTINGS_WHATSAPP

    def get_queryset(self):
        return scope_by_owner(WhatsappInstance.objects.all(), self.request.user, owner_field='user')

    def get_serializer_class(self):
        if self.action == "list":
            return WhatsappInstanceListSerializer
        return WhatsappInstanceSerializer

    def perform_create(self, serializer):
        serializer.save(user=get_tenant_owner(self.request.user))

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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_TEMPLATES

    def post(self, request, instance_id):
        try:
            instance = scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field='user').get(id=instance_id)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_TEMPLATES

    def get(self, request):
        templates = scope_by_owner(WhatsappTemplate.objects.all(), request.user, owner_field='instance__user')
        serializer = WhatsappTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    def post(self, request):
        
        instance_ids = request.data.get("instances")
        if not instance_ids:
            single = request.data.get("instance")
            instance_ids = [single] if single else []

        if not instance_ids:
            return Response({"error": "Please select at least one WhatsApp instance"}, status=status.HTTP_400_BAD_REQUEST)

        instances = scope_by_owner(
            WhatsappInstance.objects.filter(id__in=instance_ids, is_active=True),
            request.user,
            owner_field='user'
        )
        if not instances.exists():
            return Response({"error": "No valid active WhatsApp instances found"}, status=status.HTTP_404_NOT_FOUND)

        payload_base = {
            "name": request.data.get("name"),
            "language": request.data.get("language"),
            "category": request.data.get("category"),
            "components": request.data.get("components", []),
        }

        created_templates = []
        errors = []

        for instance in instances:
            if not instance.whatsapp_business_account_id or not instance.access_token:
                errors.append(f"{instance.display_name}: Missing WABA ID or Access Token")
                continue

            url = get_meta_template_url(waba_id=instance.whatsapp_business_account_id)
            headers = {"Authorization": f"Bearer {instance.access_token}", "Content-Type": "application/json"}

            try:
                res = requests.post(url, json=payload_base, headers=headers)
                if res.status_code not in (200, 201):
                    err_json = res.json()
                    meta_msg = err_json.get("error", {}).get("message") or err_json.get("error", {}).get("error_user_msg") or str(err_json)
                    errors.append(f"{instance.display_name}: {meta_msg}")
                    continue

                meta_data = res.json()

                tmpl_data = request.data.copy()
                tmpl_data["instance"] = instance.id
                serializer = WhatsappTemplateSerializer(data=tmpl_data)
                serializer.is_valid(raise_exception=True)
                obj = serializer.save(
                    meta_id=meta_data.get("id"),
                    status=meta_data.get("status", "PENDING"),
                    last_synced_at=timezone.now()
                )
                created_templates.append(WhatsappTemplateSerializer(obj).data)
            except Exception as e:
                errors.append(f"{instance.display_name}: {str(e)}")

        if not created_templates and errors:
            return Response({"error": "Meta API Error", "details": errors}, status=status.HTTP_400_BAD_REQUEST)

        if len(created_templates) == 1 and not request.data.get("instances"):
            return Response(created_templates[0], status=status.HTTP_201_CREATED)

        return Response({
            "created": created_templates,
            "errors": errors
        }, status=status.HTTP_201_CREATED)


class WhatsappTemplateDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_TEMPLATES

    def get_object(self, pk, user):
        try:
            return scope_by_owner(WhatsappTemplate.objects.all(), user, owner_field='instance__user').get(pk=pk)
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

class TemplateMediaUploadAPIView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_TEMPLATES
    parser_classes = [MultiPartParser]

    def post(self, request, instance_id):
        try:
            instance = scope_by_owner(WhatsappInstance.objects.all(), request.user, owner_field='user').get(id=instance_id)
        except WhatsappInstance.DoesNotExist:
            return Response({"error": "Instance not found"}, status=status.HTTP_404_NOT_FOUND)

        if not instance.app_id:
            return Response({"error": "Meta App ID is required on the Instance to upload media."}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            header_handle = upload_media_to_meta_for_template(
                app_id=instance.app_id,
                access_token=instance.access_token,
                file_obj=file_obj
            )
            return Response({"header_handle": header_handle}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
