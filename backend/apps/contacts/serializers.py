from rest_framework import serializers
from .models import Contact, ContactTag


class ContactTagSerializer(serializers.ModelSerializer):
    contact_count = serializers.SerializerMethodField()

    class Meta:
        model = ContactTag
        fields = ['id', 'name', 'color', 'contact_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'contact_count']

    def get_contact_count(self, obj):
        return obj.contacts.count()


class ContactSerializer(serializers.ModelSerializer):
    tags = ContactTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=ContactTag.objects.all(),
        source='tags', required=False
    )

    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'phone', 'email', 'status', 'notes',
            'tags', 'tag_ids', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
