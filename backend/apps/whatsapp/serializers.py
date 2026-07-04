from rest_framework import serializers
from .models import WhatsappInstance


class WhatsappInstanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = WhatsappInstance
        fields = [
            "id",
            "display_name",
            "phone_number_id",
            "whatsapp_business_account_id",
            "access_token",
            "webhook_verify_token",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            # Never expose the raw token in list responses
            "access_token": {"write_only": False},
        }


class WhatsappInstanceListSerializer(serializers.ModelSerializer):

    class Meta:
        model = WhatsappInstance
        fields = [
            "id",
            "display_name",
            "phone_number_id",
            "whatsapp_business_account_id",
            "webhook_verify_token",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
