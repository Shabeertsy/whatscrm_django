from rest_framework.permissions import BasePermission


class Permission:
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


ROLE_PERMISSIONS = {
    'admin': {
        Permission.INVITE_USERS,
        Permission.REMOVE_USERS,
        Permission.DELETE_TEAM,
        Permission.UPDATE_TEAM,
        Permission.CREATE_AGENT,
        Permission.VIEW_ANALYTICS,
        Permission.ACCESS_DASHBOARD,
        Permission.ACCESS_CHATS,
        Permission.ACCESS_PIPELINE,
        Permission.ACCESS_CONTACTS,
        Permission.ACCESS_HOTELS,
        Permission.ACCESS_TEMPLATES,
        Permission.ACCESS_CUSTOM_MESSAGES,
        Permission.ACCESS_MEDIA,
        Permission.ACCESS_AI_AGENT,
        Permission.ACCESS_AUTOMATIONS,
        Permission.ACCESS_SETTINGS,
        Permission.ACCESS_SETTINGS_WHATSAPP,
        Permission.ACCESS_SETTINGS_PROXIES,
        Permission.ACCESS_SETTINGS_AI,
        Permission.MANAGE_DEPARTMENTS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLE_PERMISSIONS,
    },
    'staff': {
        Permission.CREATE_AGENT,
        Permission.ACCESS_DASHBOARD,
        Permission.ACCESS_CONTACTS,
        Permission.ACCESS_HOTELS,
    },
    'agent': {
        Permission.CREATE_AGENT,
        Permission.ACCESS_DASHBOARD,
        Permission.ACCESS_CHATS,
        Permission.ACCESS_PIPELINE,
        Permission.ACCESS_CONTACTS,
        Permission.ACCESS_HOTELS,
    }
}


def has_permission(user, permission: str) -> bool:
    """
    Core business logic engine deciding if a user holds a granular
    RBAC capability.
    """
    if getattr(user, 'is_superuser', False):
        return True  # PLATFORM LAYER OVERRIDE

    if not getattr(user, 'user_type', None):
        return False

    # First check default role permissions
    allowed = ROLE_PERMISSIONS.get(user.user_type, set())
    if permission in allowed:
        return True

    # Check database DepartmentRolePermission if assigned to a department
    if getattr(user, 'department_id', None) and getattr(user, 'user_type', None):
        try:
            from apps.accounts.models import DepartmentRolePermission
            role_perm = DepartmentRolePermission.objects.filter(
                department_id=user.department_id,
                role=user.user_type
            ).first()
            if role_perm and isinstance(role_perm.permissions, dict):
                if role_perm.permissions.get(permission, False):
                    return True
        except Exception:
            pass

    return False


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

        return has_permission(
            request.user,
            required
        )
