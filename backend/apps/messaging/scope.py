from django.db.models import Q
from apps.core.scoping import scope_by_owner


def scope_conversations_qs(qs, user):
    """
    Scope conversations for a user:
    - Superusers / Tenant owners see all conversations in their tenant.
    - Regular users (non-superusers) see ONLY conversations that are:
      1. In their assigned location (contact's location matches user's location)
      2. Assigned directly to them (assigned_agent == user or user in assigned_agents)
      3. Assigned to their department or role within their department
    """
    qs = scope_by_owner(qs, user, owner_field='instance__user')
    if getattr(user, 'is_superuser', False):
        return qs

    criteria = Q()

    # 1. Location match: chats assigned to their location
    location_id = getattr(user, 'location_id', None)
    if location_id:
        criteria |= (
            Q(contact__location_id=location_id) |
            Q(contact__crm_contact__location_id=location_id) |
            Q(assigned_agent__location_id=location_id) |
            Q(assigned_agents__location_id=location_id)
        )

    # 2. Directly assigned to them
    criteria |= Q(assigned_agent=user)
    criteria |= Q(assigned_agents=user)

    # 3. Assigned to their department or role within their department
    department_id = getattr(user, 'department_id', None)
    if department_id:
        user_type = getattr(user, 'user_type', None)
        if user_type:
            # Matches chats assigned to their role in their department
            criteria |= Q(
                assigned_agents__department_id=department_id,
                assigned_agents__user_type=user_type
            )
        # Matches chats assigned to their department
        criteria |= Q(assigned_agents__department_id=department_id)

    if not criteria:
        return qs.none()

    return qs.filter(criteria).distinct()


def scope_contacts_qs(qs, user):
    """
    Scope WhatsApp contacts for a user:
    - Superusers / Tenant owners see all contacts in their tenant.
    - Regular users see ONLY contacts that are:
      1. In their assigned location
      2. Assigned directly to them (via conversation assigned_agent == user or user in assigned_agents)
      3. Assigned to their department or role within their department
    """
    if getattr(user, 'is_superuser', False):
        owner = user
        return qs.filter(
            Q(conversations__instance__user=owner) |
            Q(crm_contact__owner=owner) |
            Q(location__owner=owner) |
            Q(conversations__isnull=True, location__isnull=True, crm_contact__isnull=True)
        ).distinct()

    owner = getattr(user, 'owner', None)
    if owner is None:
        return qs.none()

    # Tenant isolation first
    qs = qs.filter(
        Q(conversations__instance__user=owner) |
        Q(crm_contact__owner=owner) |
        Q(location__owner=owner)
    )

    criteria = Q()

    # 1. Location match (if user has a location assigned)
    location_id = getattr(user, 'location_id', None)
    if location_id:
        criteria |= (
            Q(location_id=location_id) |
            Q(crm_contact__location_id=location_id) |
            Q(conversations__assigned_agent__location_id=location_id) |
            Q(conversations__assigned_agents__location_id=location_id)
        )

    # 2. Directly assigned to user
    criteria |= (
        Q(conversations__assigned_agent=user) |
        Q(conversations__assigned_agents=user)
    )

    # 3. Assigned to their department or role in their department
    department_id = getattr(user, 'department_id', None)
    if department_id:
        user_type = getattr(user, 'user_type', None)
        if user_type:
            criteria |= Q(
                conversations__assigned_agents__department_id=department_id,
                conversations__assigned_agents__user_type=user_type
            )
        criteria |= Q(conversations__assigned_agents__department_id=department_id)

    if not criteria:
        return qs.none()

    return qs.filter(criteria).distinct()


