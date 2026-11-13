from rest_framework import serializers
from .models import WhatsappInstance, WhatsappTemplate


class WhatsappInstanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = WhatsappInstance
        fields = [
            "id",
            "display_name",
            "instance_type",
            "phone_number_id",
            "whatsapp_business_account_id",
            "app_id",
            "access_token",
            "webhook_verify_token",
            "is_active",
            "evolution_instance_name",
            "evolution_status",
            "evolution_phone",
            "evolution_qr_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "phone_number_id": {"required": False, "allow_blank": True},
            "whatsapp_business_account_id": {"required": False, "allow_blank": True},
            "access_token": {"required": False, "allow_blank": True, "write_only": False},
        }


class WhatsappInstanceListSerializer(serializers.ModelSerializer):

    class Meta:
        model = WhatsappInstance
        fields = [
            "id",
            "display_name",
            "instance_type",
            "phone_number_id",
            "whatsapp_business_account_id",
            "app_id",
            "webhook_verify_token",
            "is_active",
            "evolution_instance_name",
            "evolution_status",
            "evolution_phone",
            "evolution_qr_code",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WhatsappTemplateSerializer(serializers.ModelSerializer):
    instance_display_name = serializers.CharField(source='instance.display_name', read_only=True)

    class Meta:
        model = WhatsappTemplate
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "instance_display_name"]
