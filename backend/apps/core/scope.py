# Re-export core scoping helpers
from apps.core.scoping import (
    is_superuser,
    get_tenant_owner,
    scope_by_owner,
    scope_by_location,
    scope_by_department,
)

__all__ = [
    'is_superuser',
    'get_tenant_owner',
    'scope_by_owner',
    'scope_by_location',
    'scope_by_department',
]

