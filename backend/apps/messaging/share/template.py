from __future__ import annotations

import re


def resolve_room_vars(room: dict, ctx: dict) -> dict:
    """
    Build a flat dict of all {{key}} substitution variables from
    the room payload and the stored share context (filters, selected options).
    """

    def _flatten(data: dict, prefix: str = "") -> dict:
        result = {}
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                result.update(_flatten(v, full_key))
            elif isinstance(v, list):
                if all(isinstance(i, dict) and "name" in i for i in v):
                    result[full_key] = ", ".join(i["name"] for i in v)
                else:
                    result[full_key] = str(v)
            elif v is not None:
                result[full_key] = str(v)
        return result

    vars_map: dict = {}
    vars_map.update(_flatten(room))

    # Convenience top-level aliases
    vars_map.setdefault("name", room.get("name", ""))
    vars_map.setdefault("room_name", room.get("name", ""))
    vars_map.setdefault("room_type", (room.get("room_type") or {}).get("name", ""))
    vars_map.setdefault("max_occupancy", str(room.get("max_occupancy", "")))
    vars_map.setdefault("occupancy", str(room.get("max_occupancy", "")))

    amenities_list = [
        a.get("name", "") for a in (room.get("amenities") or []) if isinstance(a, dict)
    ]
    vars_map["amenities"] = (
        ", ".join(amenities_list) if amenities_list else "Standard amenities included"
    )

    price = room.get("price") or room.get("grand_total") or ""
    vars_map["price"] = (
        f"₹{price:,}" if isinstance(price, (int, float)) else (f"₹{price}" if price else "")
    )

    prop_loc = room.get("property_location") or {}
    vars_map.setdefault(
        "location",
        ", ".join(filter(None, [prop_loc.get("name"), prop_loc.get("city"), prop_loc.get("state")])),
    )
    vars_map.setdefault("city", prop_loc.get("city", ""))
    vars_map.setdefault("state", prop_loc.get("state", ""))
    vars_map.setdefault(
        "property_name", room.get("owner_brand_name") or room.get("owner_username") or ""
    )
    vars_map.setdefault(
        "property_type", (room.get("property_type") or {}).get("name", "")
    )
    vars_map.setdefault("phone", room.get("owner_phone", ""))

    # Filter values from share context
    filters = ctx.get("filters") or {}
    if filters.get("checkIn"):
        vars_map["check_in"] = vars_map["checkIn"] = filters["checkIn"]
    if filters.get("checkOut"):
        vars_map["check_out"] = vars_map["checkOut"] = filters["checkOut"]
    if filters.get("adults"):
        vars_map["adults"] = str(filters["adults"])
    if filters.get("children"):
        vars_map["children"] = str(filters["children"])
    if filters.get("rooms"):
        vars_map["rooms_count"] = vars_map["rooms"] = str(filters["rooms"])

    nights = (room.get("price_summary") or {}).get("nights") or filters.get("nights", 1)
    vars_map["nights"] = str(nights)

    grand_total = (
        (room.get("price_summary") or {}).get("grand_total")
        or room.get("grand_total")
        or ""
    )
    if grand_total:
        vars_map["grand_total"] = (
            f"₹{grand_total:,}" if isinstance(grand_total, (int, float)) else f"₹{grand_total}"
        )
        vars_map["total_price"] = vars_map["grand_total"]

    return vars_map


_TEMPLATE_RE = re.compile(r"\{\{([^}]+)\}\}")


def interpolate_template(template: str, vars_map: dict) -> str:
    """Replace all {{key}} placeholders. Missing keys become empty string."""

    def replacer(m: re.Match) -> str:
        key = m.group(1).strip()
        return vars_map.get(key, vars_map.get(key.replace(".", "_"), ""))

    return _TEMPLATE_RE.sub(replacer, template)
