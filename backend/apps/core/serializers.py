from rest_framework import serializers
from .models import WhatsappInstance

class WhatsappInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappInstance
        fields = ['id', 'name', 'phone_number_id', 'whatsapp_business_account_id', 'access_token', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
