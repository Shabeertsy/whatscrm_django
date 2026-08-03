from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Department, DepartmentRolePermission, Location
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ('id', 'name', 'description', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name', 'description', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_name(self, value):
        qs = Department.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'A department named "{value}" already exists. Please choose a different name.'
            )
        return value


class DepartmentRolePermissionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = DepartmentRolePermission
        fields = ('id', 'department', 'department_name', 'role', 'permissions', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        user = self.user
        
        permissions = {}
        if not getattr(user, 'is_superuser', False) and user.department_id:
            try:
                drp = DepartmentRolePermission.objects.get(
                    department_id=user.department_id,
                    role=user.user_type
                )
                permissions = drp.permissions
            except DepartmentRolePermission.DoesNotExist:
                permissions = {}

        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': 'Owner' if getattr(user, 'is_superuser', False) else 'User',
            'user_type': user.user_type,
            'department': str(user.department_id) if user.department_id else None,
            'location': str(user.location_id) if user.location_id else None,
            'owner': str(user.owner_id) if user.owner_id else None,
            'permissions': permissions,
        }
        
        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True, default=None)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'phone_number', 'user_type', 'department', 'department_name', 'location', 'location_name', 'owner', 'permissions', 'password', 'is_active', 'is_superuser', 'created_at', 'updated_at')
        read_only_fields = ('id', 'is_superuser', 'created_at', 'updated_at')

    def get_permissions(self, obj):
        if getattr(obj, 'is_superuser', False) or not obj.department_id:
            return {}
        try:
            drp = DepartmentRolePermission.objects.get(
                department_id=obj.department_id,
                role=obj.user_type
            )
            return drp.permissions
        except DepartmentRolePermission.DoesNotExist:
            return {}
