from rest_framework import serializers
from .models import Campaign

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'status', 'template_name', 'start_date', 'end_date',
            'sent', 'delivered', 'read', 'replied', 'target_type', 'contacts',
            'tags', 'owner', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sent', 'delivered', 'read', 'replied', 'owner', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user
        
        tags_data = validated_data.pop('tags', [])
        contacts_data = validated_data.pop('contacts', [])
        campaign = Campaign.objects.create(**validated_data)
        
        if tags_data:
            campaign.tags.set(tags_data)
        if contacts_data:
            campaign.contacts.set(contacts_data)
            
        return campaign

    def update(self, instance, validated_data):
        tags_data = validated_data.pop('tags', None)
        contacts_data = validated_data.pop('contacts', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags_data is not None:
            instance.tags.set(tags_data)
        if contacts_data is not None:
            instance.contacts.set(contacts_data)

        return instance
