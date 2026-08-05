from django.urls import path, include

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CurrentUserAPIView,
    CustomTokenObtainPairView,
    UserViewSet,
    DepartmentViewSet,
    DepartmentRolePermissionViewSet,
    LocationViewSet,
)

app_name = 'accounts'


router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'department-role-permissions', DepartmentRolePermissionViewSet, basename='department-role-permission')

urlpatterns = [
    # Authentication (JWT)
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile
    path('me/', CurrentUserAPIView.as_view(), name='current_user'),
    
    # CRM Users, Departments, Permissions
    path('', include(router.urls)),
]
