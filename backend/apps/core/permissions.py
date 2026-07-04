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

    # Billing
    MANAGE_BILLING = "manage_billing"


ROLE_PERMISSIONS = {
    'admin': {
        Permission.INVITE_USERS,
        Permission.REMOVE_USERS,
        Permission.DELETE_TEAM,
        Permission.UPDATE_TEAM,
        Permission.CREATE_AGENT,
        Permission.VIEW_ANALYTICS,
        Permission.MANAGE_BILLING,
    },
    'marketer': {
        Permission.INVITE_USERS,
        Permission.REMOVE_USERS,
        Permission.CREATE_AGENT,
        Permission.VIEW_ANALYTICS,
    },
    'staff': {
        Permission.CREATE_AGENT,
    },
    'agent': {
        Permission.CREATE_AGENT,
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

    allowed = ROLE_PERMISSIONS.get(user.user_type, set())
    return permission in allowed


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
