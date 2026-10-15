from __future__ import annotations

import logging

from django.utils import timezone

from .cache import (
    ShareCacheKey,
    save_session_context,
    set_last_share_time,
    get_active_queue,
    set_active_queue,
)
from .crm_client import fetch_room_by_uuid
from .media_dispatcher import schedule_room_media
from .media_keys import collect_sent_media_keys, collect_sent_room_uuids
from .text_builder import build_share_text, build_next_card_text
from .button_builder import build_action_buttons

logger = logging.getLogger(__name__)



#  Room resolution helpers ────────────────────────────────────────────────────

def resolve_room_data(room_uuid: str, user, ctx: dict) -> dict:
    """Fetch room from CRM, fall back to cached rooms_map or room_data."""
    if not room_uuid:
        return {}
    room = fetch_room_by_uuid(room_uuid, user=user, filters=ctx.get("filters") or {})
    if not room:
        room = ctx.get("rooms_map", {}).get(room_uuid) or ctx.get("room_data")
    return room or {}


def advance_to_next_room(
    target_uuid: str,
    queue: list,
    sent_uuids: set,
    user,
    filters: dict,
    rooms_map: dict,
) -> tuple[str, dict, list]:
    """
    Move to the next unvisited room from the queue.
    Returns (uuid, room_dict, remaining_queue).
    """
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


def filter_unsent_queue(queue: list, sent_uuids: set) -> list:
    return [u for u in queue if u and u not in sent_uuids]


# Initial share ──────────────────────────────────────────────────────────────

def execute_initial_share(
    conversation,
    rooms: list,
    filters: dict,
    share_options: dict,
    config,
    use_interactive: bool = True,
    available_room_uuids: list | None = None,
    sent_by=None,
):
    """
    Executes the initial property share for a conversation.

    Flow:
      1. Record session cutoff time.
      2. Persist share context to cache (batch write).
      3. For each room:
         a. Schedule all media sends (images + videos) via Celery countdown.
         b. Schedule the text/interactive card after the last media send
            using the cumulative countdown as its own countdown delay.
    """
    from apps.messaging.tasks import send_share_card_task  

    now = timezone.now()
    session_time_str = now.isoformat()
    conv_id = conversation.id

    #  1. Mark session cutoff ─────────────────────────────────────────────────
    set_last_share_time(conv_id, session_time_str)

    # 2. Build rooms map and queue ───────────────────────────────────────────
    rooms_map: dict = {}
    initial_uuids: set = set()
    for r in rooms:
        u = r.get("uuid")
        if u:
            initial_uuids.add(u)
            rooms_map[u] = r

    queue = [u for u in (available_room_uuids or []) if u and u not in initial_uuids]

    share_ctx = {
        "filters": filters or {},
        "share_options": share_options or {},
        "rooms_map": rooms_map,
        "queue": queue,
        "initial_share_time": session_time_str,
    }
    save_session_context(conv_id, rooms_map, share_ctx, queue)

    #  3. Pre-compute sent media keys ONCE for this session ───────────────────
    sent_media_keys: set = collect_sent_media_keys(conversation, since_time=now)

    #  4. Schedule sends per room ─────────────────────────────────────────────
    total_rooms = len(rooms)
    room_offset: float = 0.0  # global countdown accumulator across all rooms

    for idx, room in enumerate(rooms):
        room_uuid = room.get("uuid", "")
        is_last_room = idx == total_rooms - 1
        is_interactive = use_interactive and getattr(conversation, "interactive_active", True)

        # Schedule media (images + videos) — returns next free countdown
        next_countdown = schedule_room_media(
            conversation=conversation,
            room=room,
            room_uuid=room_uuid,
            config=config,
            share_options=share_options,
            sent_keys=sent_media_keys,
            is_initial=True,
            start_countdown=room_offset,
        )

        # Build the card/text payload
        body_text = build_share_text(room, share_options, filters=filters)
        if not body_text:
            body_text = build_next_card_text(room, share_options, filters)

        next_uuid_for_button = (queue[0] if queue else "") if is_last_room else ""
        options = (
            build_action_buttons(
                config,
                room_uuid,
                next_room_uuid=next_uuid_for_button,
                include_details=config.details_button_enabled,
                allow_exit=is_last_room,
            )
            if is_interactive
            else []
        )

        # Schedule the card/text task AFTER all media countdowns
        send_share_card_task.apply_async(
            kwargs={
                "conversation_id": conv_id,
                "body_text": body_text.strip()[:1024] or "Room details",
                "options": options,
                "room_uuid": room_uuid,
                "is_interactive": is_interactive,
                "is_initial": True,
                "session_time_str": session_time_str,
                "sent_by_id": getattr(sent_by, "id", None),
            },
            countdown=int(next_countdown),
        )

        # Each room's sends start after the previous room finishes + small buffer
        from .constants import PACING_BETWEEN_ROOMS_S
        room_offset = next_countdown + PACING_BETWEEN_ROOMS_S

    logger.info(
        "[share.session] Scheduled initial share for conv %s: %d room(s), "
        "total window ≈ %.1fs",
        conv_id, total_rooms, room_offset,
    )


# Async dispatch ─────────────────────────────────────────────────────────────

def dispatch_initial_share_async(
    conversation_ids: list,
    rooms: list,
    filters: dict,
    share_options: dict,
    use_interactive: bool = True,
    available_room_uuids: list | None = None,
    user=None,
):
    """
    Fan-out: spawn one Celery task per conversation (parallel, not sequential).
    Workers pick them up simultaneously instead of waiting for each other.
    """
    from apps.messaging.tasks import initial_share_task
    from celery import group

    user_id = getattr(user, "id", None)
    job = group(
        initial_share_task.s(
            conversation_id=conv_id,
            rooms=rooms,
            filters=filters,
            share_options=share_options,
            use_interactive=use_interactive,
            available_room_uuids=available_room_uuids,
            user_id=user_id,
        )
        for conv_id in conversation_ids
    )
    job.apply_async()
