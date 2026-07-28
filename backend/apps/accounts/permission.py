from rest_framework import permissions
from apps.core.permissions import has_permission, Permission

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if getattr(request.user, 'is_superuser', False) or getattr(request.user, 'is_staff', False):
            return True
        # if request.user.user_type == 'admin':
        #     return True
        # Allow if the user has been granted granular settings or management permissions in their department
        return (
            has_permission(request.user, Permission.ACCESS_SETTINGS) or
            has_permission(request.user, Permission.MANAGE_USERS) or
            has_permission(request.user, Permission.MANAGE_DEPARTMENTS) or
            has_permission(request.user, Permission.MANAGE_ROLE_PERMISSIONS)
        )

