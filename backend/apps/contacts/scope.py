from django.db.models import Q
from apps.core.scoping import scope_by_owner, scope_by_location


def scope_deals_qs(qs, user):
    """
    Scope pipeline deals for a user:
    - Superusers see all deals in the tenant.
    - Regular users see ONLY deals matching:
      1. In their assigned location
      2. Assigned directly to them (conversation assigned_agent == user or in assigned_agents)
      3. Assigned to their department or role within their department
    """
    qs = scope_by_owner(qs, user, owner_field='owner')
    if getattr(user, 'is_superuser', False):
        return qs

    criteria = Q()

    location_id = getattr(user, 'location_id', None)
    if location_id:
        criteria |= (
            Q(wa_contact__location_id=location_id) |
            Q(wa_contact__crm_contact__location_id=location_id)
        )

    criteria |= (
        Q(wa_contact__conversations__assigned_agent=user) |
        Q(wa_contact__conversations__assigned_agents=user)
    )

    department_id = getattr(user, 'department_id', None)
    if department_id:
        user_type = getattr(user, 'user_type', None)
        if user_type:
            criteria |= Q(
                wa_contact__conversations__assigned_agents__department_id=department_id,
                wa_contact__conversations__assigned_agents__user_type=user_type
            )
        criteria |= Q(wa_contact__conversations__assigned_agents__department_id=department_id)

    if not criteria:
        return qs.none()

    return qs.filter(criteria).distinct()


def scope_contacts_qs(qs, user):
    """
    Scope CRM contacts for a user:
    - Superusers see all contacts in their tenant.
    - Regular users see ONLY contacts that are:
      1. In their assigned location
      2. Assigned directly to them (via wa_contact conversation assigned_agent == user or in assigned_agents)
      3. Assigned to their department or role queue in their department
    """
    qs = scope_by_owner(qs, user, owner_field='owner')
    if getattr(user, 'is_superuser', False):
        return qs

    criteria = Q()

    location_id = getattr(user, 'location_id', None)
    if location_id:
        criteria |= (
            Q(location_id=location_id) |
            Q(wa_contact__location_id=location_id) |
            Q(wa_contact__conversations__assigned_agent__location_id=location_id) |
            Q(wa_contact__conversations__assigned_agents__location_id=location_id)
        )

    criteria |= (
        Q(wa_contact__conversations__assigned_agent=user) |
        Q(wa_contact__conversations__assigned_agents=user)
    )

    department_id = getattr(user, 'department_id', None)
    if department_id:
        user_type = getattr(user, 'user_type', None)
        if user_type:
            criteria |= Q(
                wa_contact__conversations__assigned_agents__department_id=department_id,
                wa_contact__conversations__assigned_agents__user_type=user_type
            )
        criteria |= Q(wa_contact__conversations__assigned_agents__department_id=department_id)

    if not criteria:
        return qs.none()

    return qs.filter(criteria).distinct()



def scope_confirmed_bookings_qs(qs, user):
    """
    Scope confirmed bookings for a user:
    - Superusers see all confirmed bookings in their tenant.
    - Regular users see ONLY confirmed bookings for contacts assigned to them:
      1. In their assigned location (via contact or deal's contact)
      2. Assigned directly to them (conversation assigned_agent == user or in assigned_agents)
      3. Assigned to their department or role queue within their department
    """
    qs = scope_by_owner(qs, user, owner_field='owner')
    if getattr(user, 'is_superuser', False):
        return qs

    criteria = Q()

    location_id = getattr(user, 'location_id', None)
    if location_id:
        criteria |= (
            Q(contact__location_id=location_id) |
            Q(contact__wa_contact__location_id=location_id) |
            Q(contact__wa_contact__conversations__assigned_agent__location_id=location_id) |
            Q(contact__wa_contact__conversations__assigned_agents__location_id=location_id) |
            Q(deal__wa_contact__location_id=location_id) |
            Q(deal__wa_contact__crm_contact__location_id=location_id) |
            Q(deal__wa_contact__conversations__assigned_agent__location_id=location_id) |
            Q(deal__wa_contact__conversations__assigned_agents__location_id=location_id)
        )

    criteria |= (
        Q(contact__wa_contact__conversations__assigned_agent=user) |
        Q(contact__wa_contact__conversations__assigned_agents=user) |
        Q(deal__wa_contact__conversations__assigned_agent=user) |
        Q(deal__wa_contact__conversations__assigned_agents=user)
    )

    department_id = getattr(user, 'department_id', None)
    if department_id:
        user_type = getattr(user, 'user_type', None)
        if user_type:
            criteria |= (
                Q(
                    contact__wa_contact__conversations__assigned_agents__department_id=department_id,
                    contact__wa_contact__conversations__assigned_agents__user_type=user_type,
                ) |
                Q(
                    deal__wa_contact__conversations__assigned_agents__department_id=department_id,
                    deal__wa_contact__conversations__assigned_agents__user_type=user_type,
                )
            )
        criteria |= (
            Q(contact__wa_contact__conversations__assigned_agents__department_id=department_id) |
            Q(deal__wa_contact__conversations__assigned_agents__department_id=department_id)
        )

    if not criteria:
        return qs.none()

    return qs.filter(criteria).distinct()
