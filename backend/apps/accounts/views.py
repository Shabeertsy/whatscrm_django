from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from .models import Department, DepartmentRolePermission, Location
from .serializers import (
    UserSerializer,
    CustomTokenObtainPairSerializer,
    DepartmentSerializer,
    DepartmentRolePermissionSerializer,
    LocationSerializer,
)
from apps.core.permissions import RequirePermission, Permission
from django.core.cache import cache
from apps.core.scoping import scope_by_owner
from apps.core.scoping import get_tenant_owner



User = get_user_model()


## Location ViewSet
class LocationViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return scope_by_owner(Location.objects.all(), self.request.user).order_by('-created_at')
    serializer_class = LocationSerializer
    
    def perform_create(self, serializer):
        serializer.save(owner=get_tenant_owner(self.request.user))
    permission_classes = [permissions.IsAuthenticated, RequirePermission]
    required_permission = Permission.MANAGE_DEPARTMENTS


## Department ViewSet
class DepartmentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return scope_by_owner(Department.objects.all(), self.request.user).order_by('-created_at')
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermission]
    required_permission = Permission.MANAGE_DEPARTMENTS

    def perform_create(self, serializer):
        instance = serializer.save(owner=get_tenant_owner(self.request.user))
        try:
            instance.validate_unique()
        except Exception as e:
            instance.delete()
            raise e

    def perform_update(self, serializer):
        instance = serializer.save()
        try:
            instance.validate_unique()
        except Exception as e:
            raise e


class DepartmentRolePermissionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return scope_by_owner(DepartmentRolePermission.objects.select_related('department').all(), self.request.user)
    serializer_class = DepartmentRolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermission]
    required_permission = Permission.MANAGE_ROLE_PERMISSIONS

    def get_queryset(self):
        qs = scope_by_owner(DepartmentRolePermission.objects.select_related('department').all(), self.request.user)
        department = self.request.query_params.get('department')
        role = self.request.query_params.get('role')
        if department:
            qs = qs.filter(department_id=department)
        if role:
            qs = qs.filter(role=role)
        return qs

    @action(detail=False, methods=['post'], url_path='upsert')
    def upsert(self, request):
        """
        Create or update a DepartmentRolePermission record
        """
        department_id = request.data.get('department')
        role = request.data.get('role')
        perm_data = request.data.get('permissions', {})

        if not department_id or not role:
            return Response(
                {'detail': 'department and role are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        obj, created = DepartmentRolePermission.objects.update_or_create(
            department_id=department_id,
            role=role,
            defaults={
                'permissions': perm_data,
                'owner': get_tenant_owner(request.user)
            }
        )
        
        # Clear the RBAC cache for this department and role
        cache.delete(f"rbac_{department_id}_{role}")

        serializer = self.get_serializer(obj)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=code)


## Login Views
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserAPIView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user)
        data = serializer.data
        return Response(data)


## User ViewSet
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermission]
    required_permission = Permission.MANAGE_USERS

    def get_queryset(self):
        queryset = scope_by_owner(User.objects.filter(is_superuser=False), self.request.user).order_by('-created_at')

        department = self.request.query_params.get('department')
        if department:
            if department in ['null', 'none', 'None', '']:
                queryset = queryset.filter(department__isnull=True)
            else:
                queryset = queryset.filter(department_id=department)
        user_type = self.request.query_params.get('user_type')
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        return queryset

    def perform_create(self, serializer):
        if 'username' not in serializer.validated_data:
            serializer.validated_data['username'] = serializer.validated_data.get('email')

        owner = get_tenant_owner(self.request.user)
        password = serializer.validated_data.pop('password', 'password123')
        user = serializer.save(owner=owner)
        if password:
            user.set_password(password)
            user.save()

    def perform_update(self, serializer):
        password = serializer.validated_data.pop('password', None)
        user = serializer.save()
        if password and len(password.strip()) > 0:
            user.set_password(password)
            user.save()
