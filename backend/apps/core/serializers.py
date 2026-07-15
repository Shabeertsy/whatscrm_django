from rest_framework import serializers
from apps.whatsapp.models import WhatsappInstance
from .models import ProxyURL, UserActiveProxy

class WhatsappInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappInstance
        fields = ['id', 'name', 'phone_number_id', 'whatsapp_business_account_id', 'access_token', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProxyURLSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = ProxyURL
        fields = ['id', 'name', 'url', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_active']

    def get_is_active(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserActiveProxy.objects.filter(user=request.user, proxy=obj).exists()
