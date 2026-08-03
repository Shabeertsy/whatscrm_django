def is_superuser(user) -> bool:
    return getattr(user, 'is_superuser', False)


def get_tenant_owner(user):
    """
    - Superusers are their own owner.
    - Regular users return their assigned owner.
    """
    if is_superuser(user):
        return user
    return getattr(user, 'owner', None)


def scope_by_owner(qs, user, owner_field: str = 'owner'):
    """
    - Superusers → no filtering (see everything).
    - Non-superusers → filter by their owner.
    - No owner assigned → empty queryset.
    """
    if is_superuser(user):
        return qs

    owner = getattr(user, 'owner', None)
    if owner is None:
        return qs.none()
    return qs.filter(**{owner_field: owner})


def scope_by_location(qs, user, location_field: str = 'location'):
    """
    - Superusers → no filtering (see everything).
    - Users with a location → filtered to their location.
    - Users without a location → empty queryset (they have no data scope).
    """
    if is_superuser(user):
        return qs

    location_id = getattr(user, 'location_id', None)
    if not location_id:
        return qs.none()

    return qs.filter(**{location_field: location_id})


def scope_by_department(qs, user, department_field: str = 'department'):
    """
    - Superusers → no filtering.
    - Users with a department → filtered to their department.
    - Users without a department → empty queryset.
    """
    if is_superuser(user):
        return qs

    department_id = getattr(user, 'department_id', None)
    if not department_id:
        return qs.none()

    return qs.filter(**{department_field: department_id})
