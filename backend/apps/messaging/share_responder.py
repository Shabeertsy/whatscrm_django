import json
import logging
import os
import urllib.request
from urllib.parse import urlparse, unquote
from django.conf import settings
from django.core.cache import cache
from apps.core.views import get_proxy_url
from apps.messaging.models import PropertyShareConfig
from apps.messaging.utils import (
    send_and_save_message,
    send_and_save_interactive_buttons,
    process_external_media_url,
)

logger = logging.getLogger(__name__)


def _extract_media_keys(raw: str) -> set:
    """
    Extracts normalized matching keys (full url without query, relative path,
    filename, and stem) from any media URL or storage path string.
    """
    keys = set()
    if not raw or not isinstance(raw, str):
        return keys

    clean = raw.strip()
    if not clean:
        return keys

    # 1. Base URL without query parameters or hash fragments
    base_no_query = clean.split("?")[0].split("#")[0].rstrip("/").lower()
    if base_no_query:
        keys.add(base_no_query)

    # 2. Parsed URL path and filename
    try:
        parsed = urlparse(clean)
        path = unquote(parsed.path or "").strip("/").lower()
        if path:
            keys.add(path)
            fname = os.path.basename(path)
            if fname and len(fname) > 3:
                keys.add(fname)
                stem, _ = os.path.splitext(fname)
                if stem and len(stem) >= 4 and stem not in {
                    "image", "photo", "media", "video", "thumb", "thumbnail", "default", "file"
                }:
                    keys.add(stem)
    except Exception:
        pass

    # 3. Direct basename fallback
    fname = os.path.basename(base_no_query)
    if fname and len(fname) > 3:
        keys.add(fname)
        stem, _ = os.path.splitext(fname)
        if stem and len(stem) >= 4 and stem not in {
            "image", "photo", "media", "video", "thumb", "thumbnail", "default", "file"
        }:
            keys.add(stem)

    return keys


def _get_previously_sent_media_keys(conversation) -> set:
    """
    Collects normalized keys for all images and videos previously sent (outbound)
    to the contact in this conversation to prevent duplicate dispatches.
    Checks standalone images/videos, storage paths, and interactive card headers.
    """
    from apps.messaging.models import Message

    sent_keys = set()
    try:
        msgs = Message.objects.filter(
            conversation=conversation,
            direction="outbound",
            msg_type__in=["image", "video", "interactive"],
        ).only("msg_type", "media_url", "storage_path", "body", "raw_data")

        for msg in msgs:
            if msg.media_url:
                sent_keys.update(_extract_media_keys(msg.media_url))
            if msg.storage_path:
                sent_keys.update(_extract_media_keys(msg.storage_path))

            if msg.msg_type == "interactive" and msg.body:
                try:
                    body_data = (
                        json.loads(msg.body)
                        if isinstance(msg.body, str) and msg.body.startswith("{")
                        else {}
                    )
                    if isinstance(body_data, dict):
                        hdr_img = body_data.get("header_image_url") or ""
                        if hdr_img:
                            sent_keys.update(_extract_media_keys(hdr_img))
                        hdr_vid = body_data.get("header_video_url") or ""
                        if hdr_vid:
                            sent_keys.update(_extract_media_keys(hdr_vid))
                except Exception:
                    pass

            if msg.raw_data and isinstance(msg.raw_data, dict):
                for val in [
                    msg.raw_data.get("media_url"),
                    msg.raw_data.get("link"),
                    msg.raw_data.get("url"),
                ]:
                    if val and isinstance(val, str):
                        sent_keys.update(_extract_media_keys(val))
    except Exception as exc:
        logger.error("[share_responder] Error fetching previously sent media: %s", exc)

    return sent_keys



def fetch_room_by_uuid(room_uuid: str, user=None) -> dict:
    """Fetch room payload from proxy/CRM API with 5-minute cache."""
    if not room_uuid:
        return {}
    cache_key = f"share_responder_room_{room_uuid}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    base = get_proxy_url(user)
    url = f"{base}/crm/rooms/{room_uuid}/"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode())
            cache.set(cache_key, data, timeout=300)
            return data
    except Exception as exc:
        logger.error("[share_responder] Error fetching room %s: %s", room_uuid, exc)
        return {}


def handle_share_button_reply(conversation, button_id: str, button_title: str = "") -> bool:
    """
    Handles interactive button clicks generated by manual room sharing.
    Returns True if handled, False otherwise.
    Supported IDs:
      - share_details:<uuid>
      - share_next:<current_uuid>:<next_uuid>
      - share_book:<uuid>
      - share_exit:<uuid>
    """
    if not button_id or not button_id.startswith("share_"):
        return False

    config = PropertyShareConfig.get_effective_config(user=conversation.assigned_agent)
    parts = button_id.split(":")
    action = parts[0]
    room_uuid = parts[1] if len(parts) > 1 else ""

    logger.info(
        "[share_responder] Conv %s action=%s room_uuid=%s title=%s",
        conversation.id, action, room_uuid, button_title
    )

    if action == "share_details":
        _handle_details_action(conversation, room_uuid, config)
        return True

    elif action == "share_next":
        next_room_uuid = parts[2] if len(parts) > 2 else ""
        remaining_uuids = parts[3].split(",") if len(parts) > 3 and parts[3] else []
        _handle_next_action(conversation, room_uuid, next_room_uuid, remaining_uuids, config)
        return True

    elif action == "share_book":
        _handle_book_action(conversation, room_uuid, config)
        return True

    elif action == "share_exit":
        _handle_exit_action(conversation, config)
        return True

    return False


def dispatch_share_button_reply_async(conversation, button_id: str, button_title: str = ""):
    """
    Executes share button replies (More Details, Next, Book, Exit) in a background
    thread so Meta's webhook can respond with 200 OK immediately without timing out,
    allowing all images, videos, and interactive cards to send smoothly.
    """
    import threading
    from django.db import connection

    def _worker():
        try:
            connection.close()
            handle_share_button_reply(conversation, button_id, button_title)
        except Exception as exc:
            logger.error("[share_responder] Async error handling button %s: %s", button_id, exc)
        finally:
            connection.close()

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()



def _resolve_room_vars(room: dict, ctx: dict) -> dict:
    """
    Build a flat dict of all interpolation variables from the room payload and
    the stored share context (filters, selected options).
    Every key becomes a {{key}} template variable.
    """
    from apps.core.utils import flatten_dict  
    import itertools

    # Flat room fields
    def _flatten(data: dict, prefix: str = "") -> dict:
        result = {}
        for k, v in data.items():
            full_key = f"{prefix}{k}" if not prefix else f"{prefix}.{k}"
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

    # Flatten full room
    vars_map.update(_flatten(room))

    # Convenience aliases at top level (no nesting prefix)
    vars_map.setdefault("name", room.get("name", ""))
    vars_map.setdefault("room_name", room.get("name", ""))
    vars_map.setdefault("room_type", (room.get("room_type") or {}).get("name", ""))
    vars_map.setdefault("max_occupancy", str(room.get("max_occupancy", "")))
    vars_map.setdefault("occupancy", str(room.get("max_occupancy", "")))
    
    amenities_list = [a.get("name", "") for a in (room.get("amenities") or []) if isinstance(a, dict)]
    vars_map["amenities"] = ", ".join(amenities_list) if amenities_list else "Standard amenities included"
    price = room.get("price") or room.get("grand_total") or ""
    vars_map["price"] = f"₹{price:,}" if isinstance(price, (int, float)) else (f"₹{price}" if price else "")
    prop_loc = room.get("property_location") or {}
    
    vars_map.setdefault("location", ", ".join(filter(None, [prop_loc.get("name"), prop_loc.get("city"), prop_loc.get("state")])))
    vars_map.setdefault("city", prop_loc.get("city", ""))
    vars_map.setdefault("state", prop_loc.get("state", ""))
    vars_map.setdefault("property_name", room.get("owner_brand_name") or room.get("owner_username") or "")
    vars_map.setdefault("property_type", (room.get("property_type") or {}).get("name", ""))
    vars_map.setdefault("phone", room.get("owner_phone", ""))

    # Inject filters from saved share context
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
   
    nights = room.get("price_summary", {}).get("nights") or filters.get("nights", 1)
    vars_map["nights"] = str(nights)
    rooms_n = filters.get("rooms", 1)
    grand_total = room.get("price_summary", {}).get("grand_total") or room.get("grand_total") or ""
   
    if grand_total:
        vars_map["grand_total"] = f"₹{grand_total:,}" if isinstance(grand_total, (int, float)) else f"₹{grand_total}"
        vars_map["total_price"] = vars_map["grand_total"]

    return vars_map


def _interpolate_template(template: str, vars_map: dict) -> str:
    """Replace all {{key}} placeholders. Missing keys silently become empty."""
    import re
    def replacer(m):
        key = m.group(1).strip()
        return vars_map.get(key, vars_map.get(key.replace(".", "_"), ""))
    return re.sub(r"\{\{([^}]+)\}\}", replacer, template)


DEFAULT_DETAILS_FIELDS = {
    "basicDetails": True,
    "basicDetails_roomName": True,
    "basicDetails_roomType": True,
    "basicDetails_occupancy": True,
    "basicDetails_amenities": True,
    "searchFilters": True,
    "filters_dates": True,
    "filters_guests": True,
    "filters_rooms": True,
    "propertyDetails": True,
    "propertyDetails_name": True,
    "propertyDetails_type": True,
    "price": True,
    "price_amount": True,
    "price_meal_plans": True,
    "location": True,
    "location_name": True,
    "location_city": True,
    "location_state": True,
    "contactDetails": False,
    "contactDetails_phone": False,
}


def build_share_text(room: dict, options: dict, filters: dict = None) -> str:
    """
    Constructs message text based on selected category & sub-item checkboxes,
    matching generateShareText from frontend.
    """
    if not room:
        return ""
    if not options:
        options = DEFAULT_DETAILS_FIELDS
    filters = filters or {}
    text_blocks = []

    # 1. Basic Details
    if options.get("basicDetails", True):
        b_lines = []
        name = room.get("name")
        if options.get("basicDetails_roomName", True) and name:
            b_lines.append(f"*{name}*")

        room_type = (room.get("room_type") or {}).get("name")
        if options.get("basicDetails_roomType", True) and room_type:
            b_lines.append(f"*Room Type:* {room_type}")

        occupancy = room.get("max_occupancy")
        if options.get("basicDetails_occupancy", True) and occupancy:
            b_lines.append(f"*Max Occupancy:* {occupancy} Guests")

        amenities = room.get("amenities") or []
        if options.get("basicDetails_amenities", True) and amenities:
            a_names = ", ".join(a.get("name", "") for a in amenities if isinstance(a, dict) and a.get("name"))
            if a_names:
                b_lines.append(f"*Amenities:* {a_names}")

        if b_lines:
            text_blocks.append("\n".join(b_lines))

    # 2. Search Requirements
    if options.get("searchFilters", True) and filters:
        filter_parts = []
        cin = filters.get("checkIn")
        cout = filters.get("checkOut")
        if options.get("filters_dates", True) and (cin or cout):
            filter_parts.append(f"Dates: {cin or 'Any'} to {cout or 'Any'}")

        adults = filters.get("adults")
        children = filters.get("children")
        if options.get("filters_guests", True) and (adults or children):
            filter_parts.append(f"Guests: {adults or 1} Adults, {children or 0} Children")

        rooms_count = filters.get("rooms")
        if options.get("filters_rooms", True) and rooms_count:
            filter_parts.append(f"Rooms Needed: {rooms_count}")

        if filter_parts:
            text_blocks.append("*Requirements:*\n" + "\n".join(filter_parts))

    # 3. Property Details
    if options.get("propertyDetails", True):
        p_lines = []
        p_name = room.get("owner_brand_name") or room.get("owner_username")
        p_type = (room.get("property_type") or {}).get("name")
        if options.get("propertyDetails_name", True) and p_name:
            p_lines.append(f"*Property Name:* {p_name}")
        if options.get("propertyDetails_type", True) and p_type:
            p_lines.append(f"*Property Type:* {p_type}")
        if p_lines:
            text_blocks.append("\n".join(p_lines))

    # 4. Price & Rate Plans
    if options.get("price", True):
        price_lines = []
        nights = (room.get("price_summary") or {}).get("nights") or filters.get("nights", 1)
        rooms_count = filters.get("rooms", 1)
        price_val = (room.get("price_summary") or {}).get("grand_total") or room.get("grand_total") or room.get("price")
        if options.get("price_amount", True) and price_val is not None:
            formatted_price = f"₹{price_val:,}" if isinstance(price_val, (int, float)) else f"₹{price_val}"
            price_lines.append(f"*Price:* {formatted_price} (for {nights} night{'s' if nights != 1 else ''}, {rooms_count} room{'s' if rooms_count != 1 else ''})")

        rate_plans = room.get("rate_plans") or []
        if options.get("price_meal_plans", True) and rate_plans:
            plans = []
            for rp in rate_plans:
                mp_name = (rp.get("meal_plan") or {}).get("name") or (rp.get("meal_plan") or {}).get("code") or "Meal Plan"
                bp = rp.get("base_price", 0)
                plans.append(f"{mp_name}: ₹{bp:,} extra" if isinstance(bp, (int, float)) else f"{mp_name}: ₹{bp} extra")
            if plans:
                price_lines.append("*Meal Plans Available:*\n  • " + "\n  • ".join(plans))

        if price_lines:
            text_blocks.append("\n".join(price_lines))

    # 5. Location
    if options.get("location", True):
        loc = room.get("property_location") or {}
        loc_name = loc.get("name") if options.get("location_name", True) else ""
        city = loc.get("city") if options.get("location_city", True) else ""
        state = loc.get("state") if options.get("location_state", True) else ""
        loc_str = ", ".join(filter(None, [loc_name, city, state]))
        if loc_str:
            text_blocks.append(f"*Location:* {loc_str}")

    # 6. Contact Details
    if options.get("contactDetails", False):
        phone = room.get("owner_phone")
        if options.get("contactDetails_phone", True) and phone:
            text_blocks.append(f"*Phone:* {phone}")

    return "\n\n".join(text_blocks).strip()


def _handle_details_action(conversation, room_uuid: str, config: PropertyShareConfig):
    """Dispatches media album and extended details configured in Settings."""
    # Load share context saved when this card was originally sent
    from django.core.cache import cache as _cache
    ctx = _cache.get(f"share_ctx:{conversation.id}:{room_uuid}") or _cache.get(f"share_ctx:{conversation.id}:latest") or {}

    room = fetch_room_by_uuid(room_uuid, user=conversation.assigned_agent)
    if not room:
        send_and_save_message(
            conversation,
            msg_type="text",
            body="Could not retrieve extra room details at the moment.",
        )
        return

    # Collect previously sent media in this conversation to avoid duplicates
    sent_media_keys = _get_previously_sent_media_keys(conversation)

    # 1. Property Photos FIRST (Deduplicated)
    if config.details_send_property_images:
        prop_details = room.get("property_details") or room.get("property") or {}
        prop_images = prop_details.get("property_images") or prop_details.get("images") or []
        limit = max(1, config.details_property_image_limit)
        sent_prop_count = 0
        for img_obj in prop_images:
            if sent_prop_count >= limit:
                break
            img_url = img_obj.get("url") or img_obj.get("image") or ""
            if not img_url:
                continue

            cand_keys = _extract_media_keys(img_url)
            if cand_keys & sent_media_keys:
                logger.info("[share_responder] Skipping previously sent property image: %s", img_url)
                continue

            try:
                proc_url, proc_path = process_external_media_url(
                    img_url, "image", phone=conversation.contact.phone
                )
                send_and_save_message(
                    conversation,
                    msg_type="image",
                    media_url=proc_url,
                    storage_path=proc_path,
                    related_room_uuid=room_uuid,
                )
                sent_media_keys.update(cand_keys)
                sent_media_keys.update(_extract_media_keys(proc_url))
                if proc_path:
                    sent_media_keys.update(_extract_media_keys(proc_path))
                sent_prop_count += 1
            except Exception as e:
                logger.error("[share_responder] Fail sending prop image: %s", e)

    # 2. Room Photos SECOND (Deduplicated against hero cover photo & earlier shares)
    if config.details_send_room_images:
        images = room.get("room_images") or []
        limit = max(1, config.details_room_image_limit)
        sent_room_count = 0
        for img_obj in images:
            if sent_room_count >= limit:
                break
            img_url = img_obj.get("url") or img_obj.get("image") or ""
            if not img_url:
                continue

            cand_keys = _extract_media_keys(img_url)
            if cand_keys & sent_media_keys:
                logger.info("[share_responder] Skipping previously sent room image: %s", img_url)
                continue

            try:
                proc_url, proc_path = process_external_media_url(
                    img_url, "image", phone=conversation.contact.phone
                )
                send_and_save_message(
                    conversation,
                    msg_type="image",
                    media_url=proc_url,
                    storage_path=proc_path,
                    related_room_uuid=room_uuid,
                )
                sent_media_keys.update(cand_keys)
                sent_media_keys.update(_extract_media_keys(proc_url))
                if proc_path:
                    sent_media_keys.update(_extract_media_keys(proc_path))
                sent_room_count += 1
            except Exception as e:
                logger.error("[share_responder] Fail sending room image: %s", e)

    # 3. Property Video THIRD (Deduplicated)
    if config.details_send_videos:
        prop_details = room.get("property_details") or room.get("property") or {}
        prop_videos = (
            prop_details.get("property_videos")
            or prop_details.get("videos")
            or room.get("room_videos")
            or room.get("videos")
            or []
        )
        limit = max(1, getattr(config, "details_video_limit", 1) or 1)
        sent_vid_count = 0
        for vid_obj in prop_videos:
            if sent_vid_count >= limit:
                break
            vid_url = vid_obj.get("url") or vid_obj.get("video") or ""
            if not vid_url:
                continue

            cand_keys = _extract_media_keys(vid_url)
            if cand_keys & sent_media_keys:
                logger.info("[share_responder] Skipping previously sent video: %s", vid_url)
                continue

            try:
                proc_url, proc_path = process_external_media_url(
                    vid_url, "video", phone=conversation.contact.phone
                )
                send_and_save_message(
                    conversation,
                    msg_type="video",
                    media_url=proc_url,
                    storage_path=proc_path,
                    related_room_uuid=room_uuid,
                )
                sent_media_keys.update(cand_keys)
                sent_media_keys.update(_extract_media_keys(proc_url))
                if proc_path:
                    sent_media_keys.update(_extract_media_keys(proc_path))
                sent_vid_count += 1
            except Exception as e:
                logger.error("[share_responder] Fail sending prop video: %s", e)

    # 4. Details Text
    if config.details_text_template:
        vars_map = _resolve_room_vars(room, ctx)
        details_body = _interpolate_template(config.details_text_template, vars_map)
    else:
        fields = config.details_selected_fields or DEFAULT_DETAILS_FIELDS
        details_body = build_share_text(room, fields, filters=ctx.get("filters"))
        if not details_body:
            vars_map = _resolve_room_vars(room, ctx)
            room_name = vars_map.get("name") or "Room Details"
            details_body = f"🏨 *{room_name}*"

    details_body += "\n\nTap *Book Now* below to reserve this room."

    # 5. Send with Book / Next / Exit buttons
    options = []
    if config.book_button_enabled:
        options.append({"id": f"share_book:{room_uuid}", "label": config.book_button_label[:20]})

    cached_queue = _cache.get(f"share_ctx:{conversation.id}:queue")
    if cached_queue is not None:
        queue = list(cached_queue)
    else:
        queue = list(ctx.get("queue") or [])

    remaining_queue = [u for u in queue if u != room_uuid]
    next_room_uuid = remaining_queue[0] if remaining_queue else ""

    if next_room_uuid and config.next_button_enabled and len(options) < 3:
        options.append({
            "id": f"share_next:{room_uuid}:{next_room_uuid}",
            "label": config.next_button_label[:20],
        })
    elif config.next_button_enabled and len(options) < 3 and cached_queue is None:
        options.append({
            "id": f"share_next:{room_uuid}:",
            "label": config.next_button_label[:20],
        })

    if config.exit_button_enabled and len(options) < 3:
        options.append({"id": f"share_exit:{room_uuid}", "label": config.exit_button_label[:20]})

    if options:
        send_and_save_interactive_buttons(
            conversation,
            body_text=details_body[:1024],
            options=options,
            related_room_uuid=room_uuid,
        )
    else:
        send_and_save_message(
            conversation,
            msg_type="text",
            body=details_body[:1024],
            related_room_uuid=room_uuid,
        )


def _handle_next_action(conversation, current_room_uuid: str, next_room_uuid: str, remaining_uuids: list, config: PropertyShareConfig):
    """Sends the next room card with hero image and buttons, advancing the filtered room queue."""
    from django.core.cache import cache as _cache

    # 1. Resolve queue of remaining filtered rooms for this conversation
    cached_queue = _cache.get(f"share_ctx:{conversation.id}:queue")
    if cached_queue is not None:
        queue = list(cached_queue)
    else:
        queue = list(remaining_uuids)

    # Resolve target next room
    if not next_room_uuid:
        if queue:
            next_room_uuid = queue.pop(0)
        else:
            send_and_save_message(
                conversation,
                msg_type="text",
                body=config.no_more_results_text,
            )
            return
    else:
        if next_room_uuid in queue:
            queue.remove(next_room_uuid)

    # The subsequent room after this one
    subsequent_room_uuid = queue[0] if queue else ""
    # Update active queue in cache
    _cache.set(f"share_ctx:{conversation.id}:queue", queue, timeout=86400)

    # 2. Forward search filters and share options
    ctx = _cache.get(f"share_ctx:{conversation.id}:{current_room_uuid}") or _cache.get(f"share_ctx:{conversation.id}:latest") or {}
    if ctx:
        _cache.set(f"share_ctx:{conversation.id}:{next_room_uuid}", ctx, timeout=86400)
        _cache.set(f"share_ctx:{conversation.id}:latest", ctx, timeout=86400)

    room = fetch_room_by_uuid(next_room_uuid, user=conversation.assigned_agent)
    if not room:
        send_and_save_message(conversation, msg_type="text", body=config.no_more_results_text)
        return

    # 3. Build next card text matching initial share selection & search filters
    filters = ctx.get("filters") or {}
    share_options = ctx.get("share_options") or {}

    body_text = build_share_text(room, share_options, filters=filters) if share_options else ""
    if not body_text:
        name = room.get("name") or "Room Option"
        prop_name = room.get("owner_brand_name") or room.get("owner_username") or "Property"
        price = room.get("price") or room.get("grand_total") or ""
        price_str = f"₹{price:,}" if isinstance(price, (int, float)) else (f"₹{price}" if price else "")
        city = (room.get("property_location") or {}).get("city", "")

        body_text = f"🏨 *{name}* ({prop_name})\n"
        if city:
            body_text += f"📍 Location: {city}\n"
        if price_str:
            body_text += f"💰 Price: {price_str}\n"

        cin = filters.get("checkIn")
        cout = filters.get("checkOut")
        if cin or cout:
            body_text += f"📅 Dates: {cin or 'Any'} – {cout or 'Any'}\n"
        if filters.get("adults"):
            body_text += f"👤 Guests: {filters.get('adults', 1)} Adults\n"

    # Header image
    header_url = ""
    if config.next_include_hero_image:
        images = room.get("room_images") or []
        if not images:
            prop_details = room.get("property_details") or room.get("property") or {}
            images = prop_details.get("property_images") or prop_details.get("images") or []
        if images:
            header_url = images[0].get("url") or images[0].get("image") or ""
            if header_url:
                header_url, _ = process_external_media_url(
                    header_url, "image", phone=conversation.contact.phone
                )

    # 4. Send media matching Initial Share settings for the next room
    # (Hotel/Property photos first, Room photos second, Videos third; deduplicated)
    sent_keys = _get_previously_sent_media_keys(conversation)
    if header_url:
        sent_keys.update(_extract_media_keys(header_url))

    # Check whether to send property photos, room photos, and videos
    send_prop_imgs = (
        config.initial_send_property_images or config.next_send_extra_album
    )
    if share_options and "images_property" in share_options:
        send_prop_imgs = bool(share_options.get("images_property"))

    send_room_imgs = (
        config.initial_send_room_images or config.next_send_extra_album
    )
    if share_options and "images_room" in share_options:
        send_room_imgs = bool(share_options.get("images_room"))

    send_videos = config.initial_send_videos
    if share_options and "videos_property" in share_options:
        send_videos = bool(share_options.get("videos_property"))

    prop_limit = max(1, config.initial_property_image_limit)
    room_limit = max(1, config.initial_room_image_limit)
    video_limit = max(1, getattr(config, "initial_video_limit", 1) or 1)

    # 1. First send property images
    if send_prop_imgs:
        prop_details = room.get("property_details") or room.get("property") or {}
        prop_images = prop_details.get("property_images") or prop_details.get("images") or []
        sent_prop_count = 0
        for img_obj in prop_images:
            if sent_prop_count >= prop_limit:
                break
            img_url = img_obj.get("url") or img_obj.get("image") or ""
            if not img_url:
                continue
            cand_keys = _extract_media_keys(img_url)
            if cand_keys & sent_keys:
                continue
            try:
                proc_url, proc_path = process_external_media_url(
                    img_url, "image", phone=conversation.contact.phone
                )
                send_and_save_message(
                    conversation,
                    msg_type="image",
                    media_url=proc_url,
                    storage_path=proc_path,
                    related_room_uuid=next_room_uuid,
                )
                sent_keys.update(cand_keys)
                sent_keys.update(_extract_media_keys(proc_url))
                if proc_path:
                    sent_keys.update(_extract_media_keys(proc_path))
                sent_prop_count += 1
            except Exception as e:
                logger.error("[share_responder] Fail sending next property image: %s", e)

    # 2. Then send room images
    if send_room_imgs:
        room_images = room.get("room_images") or []
        sent_room_count = 0
        for img_obj in room_images:
            if sent_room_count >= room_limit:
                break
            img_url = img_obj.get("url") or img_obj.get("image") or ""
            if not img_url:
                continue
            cand_keys = _extract_media_keys(img_url)
            if cand_keys & sent_keys:
                continue
            try:
                proc_url, proc_path = process_external_media_url(
                    img_url, "image", phone=conversation.contact.phone
                )
                send_and_save_message(
                    conversation,
                    msg_type="image",
                    media_url=proc_url,
                    storage_path=proc_path,
                    related_room_uuid=next_room_uuid,
                )
                sent_keys.update(cand_keys)
                sent_keys.update(_extract_media_keys(proc_url))
                if proc_path:
                    sent_keys.update(_extract_media_keys(proc_path))
                sent_room_count += 1
            except Exception as e:
                logger.error("[share_responder] Fail sending next room image: %s", e)

    # 3. Then send video walkthrough if enabled
    if send_videos:
        prop_details = room.get("property_details") or room.get("property") or {}
        prop_videos = (
            prop_details.get("property_videos")
            or prop_details.get("videos")
            or room.get("room_videos")
            or room.get("videos")
            or []
        )
        sent_vid_count = 0
        for vid_obj in prop_videos:
            if sent_vid_count >= video_limit:
                break
            vid_url = vid_obj.get("url") or vid_obj.get("video") or ""
            if not vid_url:
                continue
            cand_keys = _extract_media_keys(vid_url)
            if cand_keys & sent_keys:
                continue
            try:
                proc_url, proc_path = process_external_media_url(
                    vid_url, "video", phone=conversation.contact.phone
                )
                send_and_save_message(
                    conversation,
                    msg_type="video",
                    media_url=proc_url,
                    storage_path=proc_path,
                    related_room_uuid=next_room_uuid,
                )
                sent_keys.update(cand_keys)
                sent_keys.update(_extract_media_keys(proc_url))
                if proc_path:
                    sent_keys.update(_extract_media_keys(proc_path))
                sent_vid_count += 1
            except Exception as e:
                logger.error("[share_responder] Fail sending next video: %s", e)

    options = []
    if config.book_button_enabled:
        options.append({"id": f"share_book:{next_room_uuid}", "label": config.book_button_label[:20]})
    if config.details_button_enabled:
        options.append({"id": f"share_details:{next_room_uuid}", "label": config.details_button_label[:20]})

    if subsequent_room_uuid and config.next_button_enabled and len(options) < 3:
        options.append({
            "id": f"share_next:{next_room_uuid}:{subsequent_room_uuid}",
            "label": config.next_button_label[:20],
        })
    elif config.exit_button_enabled and len(options) < 3:
        options.append({"id": f"share_exit:{next_room_uuid}", "label": config.exit_button_label[:20]})

    send_and_save_interactive_buttons(
        conversation,
        body_text=body_text[:1024],
        options=options,
        header_image_url=header_url,
        related_room_uuid=next_room_uuid,
    )


def _handle_book_action(conversation, room_uuid: str, config: PropertyShareConfig):
    """Acknowledges booking and notifies agent or starts flow."""
    room = fetch_room_by_uuid(room_uuid, user=conversation.assigned_agent)
    room_name = room.get("name") if room else "Room"

    reply_text = f"✅ Thank you! Your booking interest for *{room_name}* has been received. Our team will contact you right away with confirmation details."
    send_and_save_message(
        conversation,
        msg_type="text",
        body=reply_text,
        related_room_uuid=room_uuid,
    )


def _handle_exit_action(conversation, config: PropertyShareConfig):
    """Sends polite exit message."""
    send_and_save_message(
        conversation,
        msg_type="text",
        body=config.exit_message_text,
    )
