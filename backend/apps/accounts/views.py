
## Rest imports
from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView


## Django imports
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.core.cache import cache


## Model imports
from .models import Department, DepartmentRolePermission, Location

## Serializer imports
from .serializers import (
    UserSerializer,
    CustomTokenObtainPairSerializer,
    DepartmentSerializer,
    DepartmentRolePermissionSerializer,
    LocationSerializer,
)

## Permission imports
from apps.core.permissions import RequirePermission, Permission

## Scoping imports
from apps.core.scoping import scope_by_owner
from apps.core.scoping import get_tenant_owner



User = get_user_model()


## Location ViewSet
class LocationViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return scope_by_owner(Location.objects.all(), self.request.user).order_by('-created_at')
        return Location.objects.all().order_by('-created_at')
    
    serializer_class = LocationSerializer
    
    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(owner=get_tenant_owner(self.request.user))
        else:
            serializer.save()
            
    permission_classes = [permissions.AllowAny]


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

    @action(detail=True, methods=['get'], url_path='analytics')
    def analytics(self, request, pk=None):
        user = self.get_object()
        from apps.messaging.models import Conversation, Message
        from apps.contacts.models import PipelineDeal
        from django.utils import timezone
        from datetime import timedelta

        user_convs = Conversation.objects.filter(assigned_agent=user)
        total_assigned = user_convs.count()
        open_chats = user_convs.filter(status='open').count()
        pending_chats = user_convs.filter(status='pending').count()
        resolved_chats = user_convs.filter(status='resolved').count()
        unread_messages = sum(user_convs.values_list('unread_count', flat=True) or [0])

        total_messages_sent = Message.objects.filter(sent_by=user).count()

        latest_msg = Message.objects.filter(sent_by=user).order_by('-timestamp').first()
        last_active = latest_msg.timestamp.isoformat() if latest_msg else (user.last_login.isoformat() if user.last_login else None)

        now = timezone.now()
        status_trend = []
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            daily_open = user_convs.filter(status='open', messages__timestamp__gte=day_start, messages__timestamp__lt=day_end).distinct().count()
            daily_pending = user_convs.filter(status='pending', messages__timestamp__gte=day_start, messages__timestamp__lt=day_end).distinct().count()
            daily_resolved = user_convs.filter(status='resolved', messages__timestamp__gte=day_start, messages__timestamp__lt=day_end).distinct().count()
            status_trend.append({
                'date': day_start.strftime('%d %b'),
                'day': day_start.strftime('%a'),
                'open': daily_open,
                'pending': daily_pending,
                'resolved': daily_resolved,
            })

        user_deals = PipelineDeal.objects.filter(wa_contact__conversations__assigned_agent=user).distinct()
        deal_count = user_deals.count()
        total_deal_value = float(sum(user_deals.values_list('value', flat=True) or [0]))

        return Response({
            'total_assigned': total_assigned,
            'open_chats': open_chats,
            'pending_chats': pending_chats,
            'resolved_chats': resolved_chats,
            'unread_messages': unread_messages,
            'total_messages_sent': total_messages_sent,
            'last_active': last_active,
            'deal_count': deal_count,
            'total_deal_value': total_deal_value,
            'status_trend': status_trend,
        })
