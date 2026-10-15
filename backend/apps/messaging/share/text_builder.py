
from __future__ import annotations

from .constants import DEFAULT_DETAILS_FIELDS
from .template import resolve_room_vars, interpolate_template



def build_share_text(room: dict, options: dict, filters: dict | None = None) -> str:
    """
    Constructs message text from selected category & sub-item checkboxes.
    Identical output to the previous implementation; just cleaner structure.
    """
    if not room:
        return ""
    if not options:
        options = DEFAULT_DETAILS_FIELDS
    filters = filters or {}
    text_blocks: list[str] = []

    # Basic Details 
    if options.get("basicDetails"):
        b_lines: list[str] = []
        name = room.get("name")
        if options.get("basicDetails_roomName") and name:
            b_lines.append(f"*{name}*")

        room_type_obj = room.get("room_type")
        room_type = (
            room_type_obj.get("name")
            if isinstance(room_type_obj, dict)
            else room_type_obj
        )
        if options.get("basicDetails_roomType") and room_type:
            b_lines.append(f"*Room Type:* {room_type}")

        occupancy = room.get("max_occupancy")
        if options.get("basicDetails_occupancy") and occupancy:
            b_lines.append(f"*Max Occupancy:* {occupancy} Guests")

        amenities = room.get("amenities") or []
        if options.get("basicDetails_amenities") and amenities:
            a_names = ", ".join(
                a.get("name", "") if isinstance(a, dict) else str(a)
                for a in amenities
                if (isinstance(a, dict) and a.get("name")) or isinstance(a, str)
            )
            if a_names:
                b_lines.append(f"*Amenities:* {a_names}")

        if b_lines:
            text_blocks.append("\n".join(b_lines))

    #  Search Filters ─────────────────────────────────────────────────────────
    if options.get("searchFilters") and filters:
        filter_parts: list[str] = []
        cin = filters.get("checkIn")
        cout = filters.get("checkOut")
        if options.get("filters_dates") and (cin or cout):
            filter_parts.append(f"Dates: {cin or 'Any'} to {cout or 'Any'}")

        adults = filters.get("adults")
        children = filters.get("children")
        if options.get("filters_guests") and (adults or children):
            filter_parts.append(f"Guests: {adults or 1} Adults, {children or 0} Children")

        rooms_count = filters.get("rooms")
        if options.get("filters_rooms") and rooms_count:
            filter_parts.append(f"Rooms Needed: {rooms_count}")

        if filter_parts:
            text_blocks.append("*Requirements:*\n" + "\n".join(filter_parts))

    #  Resolve area name ──────────────────────────────────────────────────────
    area_name = _resolve_area_name(room)

    #  Property Details ──────────────
    if options.get("propertyDetails"):
        p_lines: list[str] = []
        prop_details = room.get("property_details") or {}
        p_name = (
            (prop_details.get("property_name") if isinstance(prop_details, dict) else "")
            or room.get("owner_brand_name")
            or room.get("owner_username")
        )
        prop_type_obj = room.get("property_type")
        p_type = (
            prop_type_obj.get("name")
            if isinstance(prop_type_obj, dict)
            else prop_type_obj
        )
        if options.get("propertyDetails_name") and p_name:
            p_lines.append(f"*Property Name:* {p_name}")
        if options.get("propertyDetails_type") and p_type:
            p_lines.append(f"*Property Type:* {p_type}")
        if options.get("propertyDetails_area") and area_name:
            p_lines.append(f"*Area:* {area_name}")
        if p_lines:
            text_blocks.append("\n".join(p_lines))

    # Price & Rate Plans ────────────────────────────────
    if options.get("price") and options.get("price_amount"):
        price_lines: list[str] = []
        nights = (room.get("price_summary") or {}).get("nights") or filters.get("nights", 1)
        rooms_count = filters.get("rooms", 1)
        price_val = (
            (room.get("price_summary") or {}).get("grand_total")
            or room.get("grand_total")
            or room.get("price")
        )
        if price_val is not None:
            fp = (
                f"₹{price_val:,}" if isinstance(price_val, (int, float)) else f"₹{price_val}"
            )
            price_lines.append(
                f"*Price:* {fp} (for {nights} night{'s' if nights != 1 else ''}, "
                f"{rooms_count} room{'s' if rooms_count != 1 else ''})"
            )

        rate_plans = room.get("rate_plans") or []
        if options.get("price_meal_plans") and rate_plans:
            plans = []
            for rp in rate_plans:
                mp = rp.get("meal_plan") or {}
                mp_name = mp.get("name") if isinstance(mp, dict) else str(mp) or "Meal Plan"
                bp = rp.get("base_price", 0)
                plans.append(
                    f"{mp_name}: ₹{bp:,} extra"
                    if isinstance(bp, (int, float))
                    else f"{mp_name}: ₹{bp} extra"
                )
            if plans:
                price_lines.append("*Meal Plans Available:*\n  • " + "\n  • ".join(plans))

        if price_lines:
            text_blocks.append("\n".join(price_lines))

    #  Location ────────────────────────────────────
    if options.get("location"):
        prop_details = room.get("property_details") or {}
        loc = room.get("property_location") or {}
        district = (prop_details.get("district") or {}) if isinstance(prop_details, dict) else {}

        loc_name = (
            ((loc.get("name") if isinstance(loc, dict) else "") or area_name)
            if options.get("location_name")
            else ""
        )
        city = (
            (loc.get("city") if isinstance(loc, dict) else "")
            or (district.get("name", "") if isinstance(district, dict) else "")
        ) if options.get("location_city") else ""
        state = (
            (loc.get("state") if isinstance(loc, dict) else "")
            or (district.get("state", "") if isinstance(district, dict) else "")
        ) if options.get("location_state") else ""

        loc_str = ", ".join(filter(None, [loc_name, city, state]))
        if loc_str:
            text_blocks.append(f"*Location:* {loc_str}")

    #  Contact Details ────────────────────────────────────────────────────────
    if options.get("contactDetails"):
        phone = room.get("owner_phone")
        if options.get("contactDetails_phone") and phone:
            text_blocks.append(f"*Phone:* {phone}")

    return "\n\n".join(text_blocks).strip()


def build_next_card_text(room: dict, share_options: dict, filters: dict) -> str:
    """
    Compact text for 'Next room' navigation cards.

    Always shows ONLY the initial/basic fields (name, type, occupancy,
    price, location, dates). Extra detail fields are reserved for
    build_details_body() which is only called by the 'More Details' button.
    """
    # Use a stripped-down field set — only what belongs in a navigation card
    _NEXT_CARD_FIELDS = {
        "basicDetails": True,
        "basicDetails_roomName": True,
        "basicDetails_roomType": True,
        "basicDetails_occupancy": True,
        "basicDetails_amenities": share_options.get("basicDetails_amenities", False),
        "searchFilters": share_options.get("searchFilters", True),
        "filters_dates": share_options.get("filters_dates", True),
        "filters_guests": share_options.get("filters_guests", True),
        "filters_rooms": share_options.get("filters_rooms", False),
        "propertyDetails": True,
        "propertyDetails_name": True,
        "propertyDetails_type": share_options.get("propertyDetails_type", False),
        "propertyDetails_area": True,
        "price": True,
        "price_amount": True,
        "price_meal_plans": False,   # meal plans only in 'More Details'
        "location": share_options.get("location", True),
        "location_name": True,
        "location_city": True,
        "location_state": False,
        "contactDetails": False,     # contact only in 'More Details'
        "contactDetails_phone": False,
    }
    body = build_share_text(room, _NEXT_CARD_FIELDS, filters=filters)
    if body:
        return body

    # Ultimate fallback — bare minimum one-liner
    name = room.get("name") or "Room Option"
    prop_name = room.get("owner_brand_name") or room.get("owner_username") or "Property"
    price = room.get("price") or room.get("grand_total") or ""
    price_str = (
        f"₹{price:,}" if isinstance(price, (int, float)) else (f"₹{price}" if price else "")
    )
    city = (room.get("property_location") or {}).get("city", "")

    lines = [f"*{name}* — {prop_name}"]
    if city:
        lines.append(f"📍 {city}")
    if price_str:
        lines.append(f"💰 {price_str}")
    cin = filters.get("checkIn")
    cout = filters.get("checkOut")
    if cin or cout:
        lines.append(f"📅 {cin or 'Any'} – {cout or 'Any'}")

    return "\n".join(lines)



def build_details_body(
    room: dict,
    ctx: dict,
    config,          
) -> str:
    """Build the 'More Details' card body text."""
    if config.details_text_template:
        vars_map = resolve_room_vars(room, ctx)
        body = interpolate_template(config.details_text_template, vars_map)
    else:
        fields = config.details_selected_fields or DEFAULT_DETAILS_FIELDS
        body = build_share_text(room, fields, filters=ctx.get("filters"))
        if not body:
            vars_map = resolve_room_vars(room, ctx)
            room_name = vars_map.get("name") or "Room Details"
            body = f"🏨 *{room_name}*"

    return f"{body}\n\nTap *Book Now* below to reserve this room."



#  Internal helpers ───────────────────────────────────────────────────────────

def _resolve_area_name(room: dict) -> str:
    """Walk the property payload hierarchy to find the best area name string."""
    prop_details = room.get("property_details") or {}
    area_obj = prop_details.get("area") if isinstance(prop_details, dict) else {}
    if isinstance(area_obj, dict):
        area_name = area_obj.get("name", "")
    elif isinstance(area_obj, str):
        area_name = area_obj
    else:
        area_name = ""

    if not area_name:
        area_direct = room.get("area") or {}
        if isinstance(area_direct, dict):
            area_name = area_direct.get("name", "")
        elif isinstance(area_direct, str):
            area_name = area_direct

    if not area_name:
        loc = room.get("property_location") or {}
        area_name = loc.get("name", "") if isinstance(loc, dict) else ""

    return area_name
