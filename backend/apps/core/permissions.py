import logging
from enum import Enum
from django.core.cache import cache
from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)

class Permission(str, Enum):
    # User Management
    INVITE_USERS = "invite_users"
    REMOVE_USERS = "remove_users"

    # Team Management
    DELETE_TEAM = "delete_team"
    UPDATE_TEAM = "update_team"

    # Product Features
    CREATE_AGENT = "create_agent"
    VIEW_ANALYTICS = "view_analytics"

    # Core & Marketing Modules
    ACCESS_DASHBOARD = "canAccessDashboard"
    ACCESS_CHATS = "canAccessChats"
    ACCESS_PIPELINE = "canAccessPipeline"
    ACCESS_CONTACTS = "canAccessContacts"
    ACCESS_HOTELS = "canAccessHotels"
    ACCESS_TEMPLATES = "canAccessTemplates"
    ACCESS_CUSTOM_MESSAGES = "canAccessCustomMessages"
    ACCESS_MEDIA = "canAccessMedia"
    ACCESS_AI_AGENT = "canAccessAiAgent"
    ACCESS_AUTOMATIONS = "canAccessAutomations"

    # Settings & Admin
    ACCESS_SETTINGS = "canAccessSettings"
    ACCESS_SETTINGS_WHATSAPP = "canAccessSettingsWhatsapp"
    ACCESS_SETTINGS_PROXIES = "canAccessSettingsProxies"
    ACCESS_SETTINGS_AI = "canAccessSettingsAi"
    MANAGE_DEPARTMENTS = "canManageDepartments"
    MANAGE_USERS = "canManageUsers"
    MANAGE_ROLE_PERMISSIONS = "canManageRolePermissions"


def user_has_permission(user, permission: str) -> bool:
    """
    Core business logic engine deciding if a user holds a granular
    RBAC capability, dynamically fetched from DepartmentRolePermission with caching.
    """
    if getattr(user, 'is_superuser', False):
        return True

    department_id = getattr(user, 'department_id', None)
    user_type = getattr(user, 'user_type', None)

    if not department_id or not user_type:
        return False

    cache_key = f"rbac_{department_id}_{user_type}"
    cached_permissions = cache.get(cache_key)

    if cached_permissions is None:
        try:
            from apps.accounts.models import DepartmentRolePermission
            role_perm = (
                DepartmentRolePermission.objects
                .filter(department_id=department_id, role=user_type)
                .only("permissions")
                .first()
            )
            
            if role_perm and isinstance(role_perm.permissions, dict):
                cached_permissions = role_perm.permissions
                cache.set(cache_key, cached_permissions, timeout=300) # Cache for 5 mins
            else:
                cached_permissions = {}
                cache.set(cache_key, cached_permissions, timeout=300)
                
        except Exception:
            logger.exception("Permission lookup failed")
            return False

    return bool(cached_permissions.get(permission, False))


class RequirePermission(BasePermission):
    """
    DRF BasePermission class enforcing RBAC feature constraints
    at the API View level.
    """
    required_permission = None

    def has_permission(self, request, view):
        if getattr(request.user, 'is_superuser', False):
            return True

        # If a required_permission is defined explicitly on the class or view instance
        required = getattr(view, 'required_permission', self.required_permission)
        
        if not required:
            return True

        return user_has_permission(request.user, required)
