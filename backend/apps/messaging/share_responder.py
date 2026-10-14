import json
import logging
import os
import time
import urllib.request
from urllib.parse import urlparse, unquote
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
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

    # Base URL without query parameters or hash fragments
    base_no_query = clean.split("?")[0].split("#")[0].rstrip("/").lower()
    if base_no_query:
        keys.add(base_no_query)

    # Parsed URL path and filename
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

    # Direct basename fallback
    fname = os.path.basename(base_no_query)
    if fname and len(fname) > 3:
        keys.add(fname)
        stem, _ = os.path.splitext(fname)
        if stem and len(stem) >= 4 and stem not in {
            "image", "photo", "media", "video", "thumb", "thumbnail", "default", "file"
        }:
            keys.add(stem)

    return keys


def _get_previously_sent_media_keys(conversation, since_time=None) -> set:
    """
    Collects normalized keys for all images and videos previously sent (outbound)
    to the contact in this conversation to prevent duplicate dispatches.
    Checks standalone images/videos, storage paths, and interactive card headers.
    Optionally scoped to messages sent on or after `since_time` (e.g. latest initial share).
    """
    from apps.messaging.models import Message

    if since_time is None:
        cached_time = cache.get(f"share_ctx:{conversation.id}:last_initial_share_time")
        if cached_time:
            since_time = parse_datetime(cached_time) if isinstance(cached_time, str) else cached_time

    sent_keys = set()
    try:
        msgs = Message.objects.filter(
            conversation=conversation,
            direction="outbound",
            msg_type__in=["image", "video", "interactive"],
        )
        if since_time:
            msgs = msgs.filter(timestamp__gte=since_time)

        msgs = msgs.only("msg_type", "media_url", "storage_path", "body", "raw_data")

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
                    msg.raw_data.get("original_url"),
                    msg.raw_data.get("source_url"),
                    msg.raw_data.get("image_url"),
                ]:
                    if val and isinstance(val, str):
                        sent_keys.update(_extract_media_keys(val))
    except Exception as exc:
        logger.error("[share_responder] Error fetching previously sent media: %s", exc)

    return sent_keys



def fetch_room_by_uuid(room_uuid: str, user=None, filters: dict = None) -> dict:
    """
    Fetch room payload from proxy/CRM API with 5-minute cache.
    Pass `filters` (checkIn, checkOut, adults, children, rooms) so the CRM
    can return the room with correct availability and pricing — without date
    params many CRM endpoints return 404.
    """
    if not room_uuid:
        return {}

    # Build query string from filters so the CRM can price the room
    filters = filters or {}
    params = {}
    if filters.get("checkIn"):
        params["check_in"] = filters["checkIn"]
    if filters.get("checkOut"):
        params["check_out"] = filters["checkOut"]
    if filters.get("adults"):
        params["adults"] = str(filters["adults"])
    if filters.get("children") is not None:
        params["children"] = str(filters["children"])
    if filters.get("rooms"):
        params["rooms"] = str(filters["rooms"])

    # Include params in cache key so different date ranges cache separately
    from urllib.parse import urlencode
    qs = urlencode(params)
    cache_key = f"share_responder_room_{room_uuid}" + (f"_{qs}" if qs else "")
    cached = cache.get(cache_key)
    if cached:
        return cached

    base = get_proxy_url(user)
    url = f"{base}/crm/rooms/{room_uuid}/"
    if qs:
        url = f"{url}?{qs}"

    logger.info("[share_responder] Fetching room %s from %s", room_uuid, url)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode())
            cache.set(cache_key, data, timeout=300)
            return data
    except Exception as exc:
        logger.error("[share_responder] Error fetching room %s from %s: %s", room_uuid, url, exc)
        # If querying with query params failed (e.g. 404 due to date/rate restrictions),
        # retry once without query params
        if qs:
            fallback_url = f"{base}/crm/rooms/{room_uuid}/"
            logger.info("[share_responder] Retrying room %s without params from %s", room_uuid, fallback_url)
            try:
                fallback_req = urllib.request.Request(fallback_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(fallback_req, timeout=8) as fb_resp:
                    data = json.loads(fb_resp.read().decode())
                    cache.set(cache_key, data, timeout=300)
                    return data
            except Exception as fb_exc:
                logger.error("[share_responder] Fallback fetch failed for room %s: %s", room_uuid, fb_exc)

        cached_room = cache.get(f"share_ctx_room_{room_uuid}")
        if cached_room:
            return cached_room
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
    Executes share button replies (More Details, Next, Book, Exit) in background via Celery.
    """
    from apps.messaging.tasks import share_button_reply_task
    share_button_reply_task.delay(
        conversation_id=conversation.id,
        button_id=button_id,
        button_title=button_title,
    )



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

    # Basic Details
    if options.get("basicDetails"):
        b_lines = []
        name = room.get("name")
        if options.get("basicDetails_roomName") and name:
            b_lines.append(f"*{name}*")

        room_type = (room.get("room_type") or {}).get("name") if isinstance(room.get("room_type"), dict) else room.get("room_type")
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

    # Search Requirements
    if options.get("searchFilters") and filters:
        filter_parts = []
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

    # Property Details
    if options.get("propertyDetails"):
        p_lines = []
        p_name = room.get("owner_brand_name") or room.get("owner_username")
        p_type = (room.get("property_type") or {}).get("name") if isinstance(room.get("property_type"), dict) else room.get("property_type")
        if options.get("propertyDetails_name") and p_name:
            p_lines.append(f"*Property Name:* {p_name}")
        if options.get("propertyDetails_type") and p_type:
            p_lines.append(f"*Property Type:* {p_type}")
        if p_lines:
            text_blocks.append("\n".join(p_lines))

    # Price & Rate Plans
    if options.get("price") and options.get("price_amount"):
        price_lines = []
        nights = (room.get("price_summary") or {}).get("nights") or filters.get("nights", 1)
        rooms_count = filters.get("rooms", 1)
        price_val = (room.get("price_summary") or {}).get("grand_total") or room.get("grand_total") or room.get("price")
        if price_val is not None:
            formatted_price = f"₹{price_val:,}" if isinstance(price_val, (int, float)) else f"₹{price_val}"
            price_lines.append(f"*Price:* {formatted_price} (for {nights} night{'s' if nights != 1 else ''}, {rooms_count} room{'s' if rooms_count != 1 else ''})")

        rate_plans = room.get("rate_plans") or []
        if options.get("price_meal_plans") and rate_plans:
            plans = []
            for rp in rate_plans:
                mp = rp.get("meal_plan") or {}
                mp_name = mp.get("name") if isinstance(mp, dict) else str(mp) or "Meal Plan"
                bp = rp.get("base_price", 0)
                plans.append(f"{mp_name}: ₹{bp:,} extra" if isinstance(bp, (int, float)) else f"{mp_name}: ₹{bp} extra")
            if plans:
                price_lines.append("*Meal Plans Available:*\n  • " + "\n  • ".join(plans))

        if price_lines:
            text_blocks.append("\n".join(price_lines))

    # Location
    if options.get("location"):
        loc = room.get("property_location") or {}
        loc_name = loc.get("name") if options.get("location_name") else ""
        city = loc.get("city") if options.get("location_city") else ""
        state = loc.get("state") if options.get("location_state") else ""
        loc_str = ", ".join(filter(None, [loc_name, city, state]))
        if loc_str:
            text_blocks.append(f"*Location:* {loc_str}")

    # Contact Details
    if options.get("contactDetails"):
        phone = room.get("owner_phone")
        if options.get("contactDetails_phone") and phone:
            text_blocks.append(f"*Phone:* {phone}")

    return "\n\n".join(text_blocks).strip()


def _get_sent_room_uuids(conversation, current_uuid: str = "") -> set:
    from apps.messaging.models import Message

    cutoff_dt = None
    cached_time = cache.get(f"share_ctx:{conversation.id}:last_initial_share_time")
    if cached_time:
        cutoff_dt = parse_datetime(cached_time) if isinstance(cached_time, str) else cached_time

    if not cutoff_dt:
        # Fallback: check DB for the last initial share message in this conversation
        last_initial_msg = (
            Message.objects.filter(
                conversation=conversation,
                direction="outbound",
                raw_data__is_initial_share=True,
            )
            .order_by("-timestamp")
            .first()
        )
        if last_initial_msg:
            cutoff_dt = last_initial_msg.timestamp

    if cutoff_dt:
        qs = Message.objects.filter(
            conversation=conversation,
            direction="outbound",
            timestamp__gte=cutoff_dt,
            related_room_uuid__isnull=False,
        ).exclude(related_room_uuid="")
        sent = set(qs.values_list("related_room_uuid", flat=True))
    else:
        sent = set()

    if current_uuid:
        sent.add(current_uuid)
    return sent


def _get_active_queue(conversation_id, fallback_uuids: list = None) -> list:
    cached = cache.get(f"share_ctx:{conversation_id}:queue")
    return list(cached) if cached is not None else list(fallback_uuids or [])


def _filter_unsent_queue(queue: list, sent_uuids: set) -> list:
    return [u for u in queue if u and u not in sent_uuids]


def _resolve_room_data(room_uuid: str, user, ctx: dict) -> dict:
    if not room_uuid:
        return {}
    room = fetch_room_by_uuid(room_uuid, user=user, filters=ctx.get("filters") or {})
    if not room and ctx.get("rooms_map", {}).get(room_uuid):
        room = ctx["rooms_map"][room_uuid]
    if not room and ctx.get("room_data"):
        room = ctx.get("room_data")
    return room or {}


def _advance_to_next_room(
    target_uuid: str,
    queue: list,
    sent_uuids: set,
    user,
    filters: dict,
    rooms_map: dict,
) -> tuple:
    if not target_uuid or target_uuid in sent_uuids:
        target_uuid = queue.pop(0) if queue else ""
    elif target_uuid in queue:
        queue.remove(target_uuid)

    room = None
    while target_uuid:
        room = fetch_room_by_uuid(target_uuid, user=user, filters=filters) or rooms_map.get(target_uuid)
        if room:
            break
        target_uuid = queue.pop(0) if queue else ""

    return target_uuid, room or {}, queue


def _send_media_batch(
    conversation,
    media_list: list,
    msg_type: str,
    limit: int,
    sent_keys: set,
    room_uuid: str,
    is_initial: bool = False,
) -> int:
    if not media_list or limit <= 0:
        return 0

    sent_count = 0
    phone = conversation.contact.phone if conversation.contact else ""

    for item in media_list:
        if sent_count >= limit:
            break
        raw_url = item.get("url") or item.get("image") or item.get("video") or ""
        if not raw_url:
            continue

        cand_keys = _extract_media_keys(raw_url)
        if cand_keys & sent_keys:
            continue

        try:
            proc_url, proc_path = process_external_media_url(raw_url, msg_type, phone=phone)
            raw_meta = {"original_url": raw_url}
            if is_initial:
                raw_meta["is_initial_share"] = True

            send_and_save_message(
                conversation,
                msg_type=msg_type,
                media_url=proc_url,
                storage_path=proc_path,
                related_room_uuid=room_uuid,
                raw_data=raw_meta,
            )
            sent_keys.update(cand_keys)
            sent_keys.update(_extract_media_keys(proc_url))
            if proc_path:
                sent_keys.update(_extract_media_keys(proc_path))
            sent_count += 1
            # Brief delay so WhatsApp ingests media in proper sequence
            time.sleep(0.4)
        except Exception as e:
            logger.error("[share_responder] Failed sending %s: %s", msg_type, e)

    return sent_count


def _filter_selected_media(
    media_items: list,
    prefix: str,
    is_enabled: bool,
    default_limit: int,
    share_options: dict,
) -> list:
    if not is_enabled or not media_items:
        return []

    has_specific = any(k.startswith(f"{prefix}_") and isinstance(v, bool) for k, v in share_options.items())
    if has_specific:
        selected = []
        for i, item in enumerate(media_items):
            if share_options.get(f"{prefix}_{i}", False):
                selected.append(item)
        return selected[:default_limit] if default_limit > 0 else selected
    else:
        limit = max(1, default_limit or 1)
        return media_items[:limit]


def _dispatch_room_media(
    conversation,
    room: dict,
    room_uuid: str,
    config: PropertyShareConfig,
    share_options: dict,
    sent_keys: set,
    is_initial: bool = False,
) -> int:
    """
    Sends property images, room images, and videos in that exact order,
    honoring user selections or config limits.
    """
    prop_details = room.get("property_details") or room.get("property") or {}
    prop_images = prop_details.get("property_images") or prop_details.get("images") or []
    room_images = room.get("room_images") or []
    prop_videos = (
        prop_details.get("property_videos")
        or prop_details.get("videos")
        or room.get("room_videos")
        or room.get("videos")
        or []
    )

    total_sent = 0

    #  Property Images
    send_prop_imgs = share_options.get("images_property", config.initial_send_property_images)
    prop_limit = max(1, config.initial_property_image_limit or 1)
    selected_prop = _filter_selected_media(prop_images, "images_property", send_prop_imgs, prop_limit, share_options)
    if selected_prop:
        total_sent += _send_media_batch(conversation, selected_prop, "image", len(selected_prop), sent_keys, room_uuid, is_initial=is_initial)

    #  Room Images
    send_room_imgs = share_options.get("images_room", config.initial_send_room_images)
    room_limit = max(1, config.initial_room_image_limit or 1)
    fallback_room_imgs = room_images or (prop_images if not send_prop_imgs else [])
    selected_room = _filter_selected_media(fallback_room_imgs, "images_room", send_room_imgs, room_limit, share_options)
    if selected_room:
        total_sent += _send_media_batch(conversation, selected_room, "image", len(selected_room), sent_keys, room_uuid, is_initial=is_initial)

    #  Property Videos
    send_videos = share_options.get("videos_property", config.initial_send_videos)
    video_limit = max(1, getattr(config, "initial_video_limit", 1) or 1)
    selected_vids = _filter_selected_media(prop_videos, "videos_property", send_videos, video_limit, share_options)
    if selected_vids:
        total_sent += _send_media_batch(conversation, selected_vids, "video", len(selected_vids), sent_keys, room_uuid, is_initial=is_initial)

    return total_sent


def _register_initial_sent_media(
    room: dict,
    share_options: dict,
    config: PropertyShareConfig,
    conversation,
    sent_keys: set,
):
    prop_details = room.get("property_details") or room.get("property") or {}
    prop_images = prop_details.get("property_images") or prop_details.get("images") or []
    prop_initial_count = sum(1 for k, v in share_options.items() if k.startswith("images_property_") and v is True)
    if prop_initial_count == 0 and (share_options.get("images_property") or config.initial_send_property_images):
        prop_initial_count = max(1, config.initial_property_image_limit or 1)

    for i, img_obj in enumerate(prop_images):
        if (share_options and share_options.get(f"images_property_{i}")) or (i < prop_initial_count):
            u = img_obj.get("url") or img_obj.get("image") or ""
            if u:
                sent_keys.update(_extract_media_keys(u))

    from apps.messaging.models import Message
    has_prior_image_msgs = Message.objects.filter(
        conversation=conversation, direction="outbound", msg_type="image"
    ).exists()
    if (has_prior_image_msgs or config.initial_send_property_images or share_options.get("images_property")) and prop_images:
        u0 = prop_images[0].get("url") or prop_images[0].get("image") or ""
        if u0:
            sent_keys.update(_extract_media_keys(u0))

    images = room.get("room_images") or []
    room_initial_count = sum(1 for k, v in share_options.items() if k.startswith("images_room_") and v is True)
    if room_initial_count == 0 and (share_options.get("images_room") or config.initial_send_room_images or True):
        room_initial_count = 1

    for i, img_obj in enumerate(images):
        if (share_options and share_options.get(f"images_room_{i}")) or (i < room_initial_count):
            u = img_obj.get("url") or img_obj.get("image") or ""
            if u:
                sent_keys.update(_extract_media_keys(u))

    prop_videos = (
        prop_details.get("property_videos")
        or prop_details.get("videos")
        or room.get("room_videos")
        or room.get("videos")
        or []
    )
    if prop_videos and (share_options.get("videos_property") or config.initial_send_videos):
        v_url = prop_videos[0].get("url") or prop_videos[0].get("video") or ""
        if v_url:
            sent_keys.update(_extract_media_keys(v_url))


def _dispatch_details_media(conversation, room: dict, room_uuid: str, config: PropertyShareConfig, sent_keys: set):
    prop_details = room.get("property_details") or room.get("property") or {}
    prop_images = prop_details.get("property_images") or prop_details.get("images") or []
    room_images = room.get("room_images") or []
    prop_videos = (
        prop_details.get("property_videos")
        or prop_details.get("videos")
        or room.get("room_videos")
        or room.get("videos")
        or []
    )

    if config.details_send_property_images and prop_images:
        _send_media_batch(conversation, prop_images, "image", max(1, config.details_property_image_limit), sent_keys, room_uuid)

    if config.details_send_room_images and room_images:
        _send_media_batch(conversation, room_images, "image", max(1, config.details_room_image_limit), sent_keys, room_uuid)

    if config.details_send_videos and prop_videos:
        video_limit = max(1, getattr(config, "details_video_limit", 1) or 1)
        _send_media_batch(conversation, prop_videos, "video", video_limit, sent_keys, room_uuid)


def execute_initial_share(
    conversation,
    rooms: list,
    filters: dict,
    share_options: dict,
    config: PropertyShareConfig,
    use_interactive: bool = True,
    available_room_uuids: list = None,
    sent_by = None,
):
    """
    Executes initial property share for a conversation:
    1. Records the session cutoff so subsequent 'Next' clicks only filter rooms from this session.
    2. Sends images and videos FIRST.
    3. Sends room details with interactive buttons AFTER all images and videos are completely sent.
    """
    now = timezone.now()
    session_time_str = now.isoformat()
    conversation_id = conversation.id

    # 1. Mark cutoff time in cache for "last initial share"
    cache.set(f"share_ctx:{conversation_id}:last_initial_share_time", session_time_str, timeout=86400 * 7)

    # 2. Build rooms map and identify initial room UUIDs
    rooms_map = {}
    initial_room_uuids = set()
    for r in rooms:
        u = r.get("uuid")
        if u:
            initial_room_uuids.add(u)
            rooms_map[u] = r

    # 3. Queue calculation: available_room_uuids excluding the initially shared rooms
    queue = [u for u in (available_room_uuids or []) if u and u not in initial_room_uuids]
    cache.set(f"share_ctx:{conversation_id}:queue", queue, timeout=86400)

    # 4. Save share_context in cache for each initial room
    share_ctx = {
        "filters": filters or {},
        "share_options": share_options or {},
        "rooms_map": rooms_map,
        "queue": queue,
        "initial_share_time": session_time_str,
    }
    for u, r_data in rooms_map.items():
        cache.set(f"share_ctx:{conversation_id}:{u}", {**share_ctx, "room_uuid": u, "room_data": r_data}, timeout=86400)
        cache.set(f"share_ctx_room_{u}", r_data, timeout=86400)
    cache.set(f"share_ctx:{conversation_id}:latest", share_ctx, timeout=86400)

    # 5. Media keys tracker (scoped to this session)
    sent_media_keys = _get_previously_sent_media_keys(conversation, since_time=now)

    # 6. Loop over rooms and send
    total_rooms = len(rooms)
    for idx, room in enumerate(rooms):
        room_uuid = room.get("uuid", "")
        is_last_room = (idx == total_rooms - 1)
        is_interactive = use_interactive and is_last_room

        # Step A: Send all images and videos FIRST
        _dispatch_room_media(conversation, room, room_uuid, config, share_options, sent_media_keys, is_initial=True)

        # Pause slightly so WhatsApp processes all media before the text/interactive message
        time.sleep(0.5)

        # Step B: Build room details text
        body_text = build_share_text(room, share_options, filters=filters)
        if not body_text:
            body_text = _build_next_card_text(room, share_options, filters)

        # Step C: Send Room Details with interactive buttons (if last room and interactive enabled) or text
        raw_meta = {
            "is_initial_share": True,
            "share_session_time": session_time_str,
            "room_uuid": room_uuid,
        }

        if is_interactive:
            next_room_uuid = queue[0] if queue else ""
            options = _build_action_buttons(
                config,
                room_uuid,
                next_room_uuid=next_room_uuid,
                include_details=config.details_button_enabled,
            )
            safe_body = body_text.strip()[:1024] or "Room details"
            if options:
                send_and_save_interactive_buttons(
                    conversation,
                    body_text=safe_body,
                    options=options,
                    sent_by=sent_by,
                    related_room_uuid=room_uuid,
                    raw_data=raw_meta,
                )
            else:
                send_and_save_message(
                    conversation,
                    msg_type="text",
                    body=safe_body,
                    sent_by=sent_by,
                    related_room_uuid=room_uuid,
                    raw_data=raw_meta,
                )
        else:
            send_and_save_message(
                conversation,
                msg_type="text",
                body=body_text.strip() or "Room details",
                sent_by=sent_by,
                related_room_uuid=room_uuid,
                raw_data=raw_meta,
            )

        # Pause between multiple rooms
        if not is_last_room:
            time.sleep(0.5)


def dispatch_initial_share_async(
    conversation_ids: list,
    rooms: list,
    filters: dict,
    share_options: dict,
    use_interactive: bool = True,
    available_room_uuids: list = None,
    user = None,
):
    """
    Spawns Celery task to execute initial property share across selected conversations.
    """
    from apps.messaging.tasks import initial_share_task
    user_id = getattr(user, "id", None)
    initial_share_task.delay(
        conversation_ids=conversation_ids,
        rooms=rooms,
        filters=filters,
        share_options=share_options,
        use_interactive=use_interactive,
        available_room_uuids=available_room_uuids,
        user_id=user_id,
    )


def _build_details_body(room: dict, ctx: dict, config: PropertyShareConfig) -> str:
    if config.details_text_template:
        vars_map = _resolve_room_vars(room, ctx)
        body = _interpolate_template(config.details_text_template, vars_map)
    else:
        fields = config.details_selected_fields or DEFAULT_DETAILS_FIELDS
        body = build_share_text(room, fields, filters=ctx.get("filters"))
        if not body:
            vars_map = _resolve_room_vars(room, ctx)
            room_name = vars_map.get("name") or "Room Details"
            body = f"🏨 *{room_name}*"

    return f"{body}\n\nTap *Book Now* below to reserve this room."


def _build_next_card_text(room: dict, share_options: dict, filters: dict) -> str:
    body = build_share_text(room, share_options, filters=filters) if share_options else ""
    if body:
        return body

    name = room.get("name") or "Room Option"
    prop_name = room.get("owner_brand_name") or room.get("owner_username") or "Property"
    price = room.get("price") or room.get("grand_total") or ""
    price_str = f"₹{price:,}" if isinstance(price, (int, float)) else (f"₹{price}" if price else "")
    city = (room.get("property_location") or {}).get("city", "")

    lines = [f" *{name}* ({prop_name})"]
    if city:
        lines.append(f" Location: {city}")
    if price_str:
        lines.append(f" Price: {price_str}")

    cin = filters.get("checkIn")
    cout = filters.get("checkOut")
    if cin or cout:
        lines.append(f" Dates: {cin or 'Any'} – {cout or 'Any'}")
    if filters.get("adults"):
        lines.append(f" Guests: {filters.get('adults', 1)} Adults")

    return "\n".join(lines)


def _build_action_buttons(
    config: PropertyShareConfig,
    room_uuid: str,
    *,
    next_room_uuid: str = "",
    include_details: bool = False,
) -> list:
    buttons = []
    if config.book_button_enabled:
        buttons.append({"id": f"share_book:{room_uuid}", "label": config.book_button_label[:20]})

    if include_details and config.details_button_enabled and len(buttons) < 3:
        buttons.append({"id": f"share_details:{room_uuid}", "label": config.details_button_label[:20]})

    if next_room_uuid and config.next_button_enabled and len(buttons) < 3:
        buttons.append({
            "id": f"share_next:{room_uuid}:{next_room_uuid}",
            "label": config.next_button_label[:20],
        })
    elif config.exit_button_enabled and len(buttons) < 3:
        buttons.append({"id": f"share_exit:{room_uuid}", "label": config.exit_button_label[:20]})

    return buttons


def _dispatch_card_or_text(conversation, body: str, options: list, room_uuid: str, raw_data: dict = None):
    # Meta WhatsApp rejects body_text starting with newlines or exceeding 1024 characters
    safe_body = body.strip()[:1024] or "Room details"
    if options:
        send_and_save_interactive_buttons(
            conversation,
            body_text=safe_body,
            options=options,
            related_room_uuid=room_uuid,
            raw_data=raw_data or {},
        )
    else:
        send_and_save_message(
            conversation,
            msg_type="text",
            body=safe_body,
            related_room_uuid=room_uuid,
            raw_data=raw_data or {},
        )


def _handle_details_action(conversation, room_uuid: str, config: PropertyShareConfig):
    ctx = (
        cache.get(f"share_ctx:{conversation.id}:{room_uuid}")
        or cache.get(f"share_ctx:{conversation.id}:latest")
        or {}
    )
    room = _resolve_room_data(room_uuid, conversation.assigned_agent, ctx)
    if not room:
        send_and_save_message(
            conversation,
            msg_type="text",
            body="Could not retrieve extra room details at the moment.",
        )
        return

    sent_media_keys = _get_previously_sent_media_keys(conversation)
    _register_initial_sent_media(room, ctx.get("share_options") or {}, config, conversation, sent_media_keys)
    _dispatch_details_media(conversation, room, room_uuid, config, sent_media_keys)
    time.sleep(0.5)

    details_body = _build_details_body(room, ctx, config)

    sent_room_uuids = _get_sent_room_uuids(conversation, current_uuid=room_uuid)
    remaining_queue = _filter_unsent_queue(_get_active_queue(conversation.id), sent_room_uuids)
    next_room_uuid = remaining_queue[0] if remaining_queue else ""

    options = _build_action_buttons(config, room_uuid, next_room_uuid=next_room_uuid, include_details=False)
    _dispatch_card_or_text(conversation, details_body, options, room_uuid)


def _handle_next_action(
    conversation,
    current_room_uuid: str,
    next_room_uuid: str,
    remaining_uuids: list,
    config: PropertyShareConfig,
):
    ctx = (
        cache.get(f"share_ctx:{conversation.id}:{current_room_uuid}")
        or cache.get(f"share_ctx:{conversation.id}:latest")
        or {}
    )
    filters = ctx.get("filters") or {}
    share_options = ctx.get("share_options") or {}
    rooms_map = ctx.get("rooms_map") or {}

    sent_room_uuids = _get_sent_room_uuids(conversation, current_uuid=current_room_uuid)
    queue = _filter_unsent_queue(
        _get_active_queue(conversation.id, fallback_uuids=remaining_uuids),
        sent_room_uuids,
    )

    next_room_uuid, room, queue = _advance_to_next_room(
        next_room_uuid, queue, sent_room_uuids, conversation.assigned_agent, filters, rooms_map
    )

    if not room or not next_room_uuid:
        send_and_save_message(conversation, msg_type="text", body=config.no_more_results_text)
        return

    subsequent_room_uuid = queue[0] if queue else ""
    cache.set(f"share_ctx:{conversation.id}:queue", queue, timeout=86400)
    if ctx:
        cache.set(f"share_ctx:{conversation.id}:{next_room_uuid}", ctx, timeout=86400)
        cache.set(f"share_ctx:{conversation.id}:latest", ctx, timeout=86400)

    # Dispatch media first (images & videos)
    batch_sent_keys = _get_previously_sent_media_keys(conversation)
    _dispatch_room_media(conversation, room, next_room_uuid, config, share_options, batch_sent_keys)
    time.sleep(0.5)

    # Dispatch room details with interactive action buttons AFTER all images and videos
    body_text = _build_next_card_text(room, share_options, filters)
    options = _build_action_buttons(
        config, next_room_uuid, next_room_uuid=subsequent_room_uuid, include_details=True
    )
    _dispatch_card_or_text(
        conversation,
        body_text,
        options,
        next_room_uuid,
        raw_data={"is_next_share": True, "room_uuid": next_room_uuid},
    )


def _handle_book_action(conversation, room_uuid: str, config: PropertyShareConfig):
    ctx = (
        cache.get(f"share_ctx:{conversation.id}:{room_uuid}")
        or cache.get(f"share_ctx:{conversation.id}:latest")
        or {}
    )
    room = _resolve_room_data(room_uuid, conversation.assigned_agent, ctx)
    room_name = room.get("name") if room else "Room"

    reply_text = (
        f"Thank you! Your booking interest for *{room_name}* has been received. "
        "Our team will contact you right away with confirmation details."
    )
    send_and_save_message(
        conversation,
        msg_type="text",
        body=reply_text,
        related_room_uuid=room_uuid,
    )


def _handle_exit_action(conversation, config: PropertyShareConfig):
    send_and_save_message(
        conversation,
        msg_type="text",
        body=config.exit_message_text,
    )
