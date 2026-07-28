from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Department, DepartmentRolePermission
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name', 'description', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


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
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': 'Owner' if getattr(user, 'is_superuser', False) else 'User',
            'user_type': user.user_type,
            'department': str(user.department_id) if user.department_id else None,
        }
        
        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'phone_number', 'user_type', 'department', 'department_name', 'password', 'is_active', 'is_superuser', 'created_at', 'updated_at')
        read_only_fields = ('id', 'is_superuser', 'created_at', 'updated_at')
