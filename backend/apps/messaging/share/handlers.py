
from __future__ import annotations

import logging

from .cache import get_session_context, get_active_queue, set_active_queue, ShareCacheKey
from .constants import PACING_DETAILS_PRE_CARD_S, SESSION_TTL_S
from .media_dispatcher import schedule_details_media, register_initial_sent_media
from .media_keys import collect_sent_media_keys, collect_sent_room_uuids
from .session import resolve_room_data, advance_to_next_room, filter_unsent_queue
from .text_builder import build_details_body, build_next_card_text
from .button_builder import build_action_buttons

logger = logging.getLogger(__name__)



#  Public router ──────────────────────────────────────────────────────────────

def handle_share_button_reply(conversation, button_id: str, button_title: str = "") -> bool:
    """
    Route a WhatsApp interactive button click to the correct handler.
    Returns True if handled, False if not a share button.

    Supported IDs:
      share_details:<uuid>
      share_next:<current>:<next>[:<remaining_csv>]
      share_book:<uuid>
      share_exit:<uuid>
    """
    if not button_id or not button_id.startswith("share_"):
        return False

    if not getattr(conversation, "interactive_active", True):
        logger.info(
            "[share.handlers] Interactive paused for conv %s, ignoring %s",
            conversation.id, button_id,
        )
        return True

    from apps.messaging.models import PropertyShareConfig

    config = PropertyShareConfig.get_effective_config(user=conversation.assigned_agent)
    parts = button_id.split(":")
    action = parts[0]
    room_uuid = parts[1] if len(parts) > 1 else ""

    logger.info(
        "[share.handlers] Conv %s action=%s room=%s title=%s",
        conversation.id, action, room_uuid, button_title,
    )

    if action == "share_details":
        _handle_details_action(conversation, room_uuid, config)

    elif action == "share_next":
        next_uuid = parts[2] if len(parts) > 2 else ""
        remaining = parts[3].split(",") if len(parts) > 3 and parts[3] else []
        _handle_next_action(conversation, room_uuid, next_uuid, remaining, config)

    elif action == "share_book":
        _handle_book_action(conversation, room_uuid, config)

    elif action == "share_exit":
        _handle_exit_action(conversation, config)

    else:
        return False

    return True


def dispatch_share_button_reply_async(conversation, button_id: str, button_title: str = ""):
    """Offload share button handling to Celery."""
    from apps.messaging.tasks import share_button_reply_task

    share_button_reply_task.delay(
        conversation_id=conversation.id,
        button_id=button_id,
        button_title=button_title,
    )


# Action handlers ────────────────────────────────────────────────────────────

def _handle_details_action(conversation, room_uuid: str, config):
    ctx = get_session_context(conversation.id, room_uuid)
    room = resolve_room_data(room_uuid, conversation.assigned_agent, ctx)
    if not room:
        from apps.messaging.utils import send_and_save_message
        send_and_save_message(
            conversation,
            msg_type="text",
            body="Could not retrieve extra room details at the moment.",
        )
        return

    # Collect sent keys once
    sent_keys = collect_sent_media_keys(conversation)
    register_initial_sent_media(room, ctx.get("share_options") or {}, config, conversation, sent_keys)

    # Schedule detail media sends; get countdown for when they'll finish
    next_countdown = schedule_details_media(conversation, room, room_uuid, config, sent_keys)

    # Determine next available room for "Next" button
    sent_uuids = collect_sent_room_uuids(conversation, current_uuid=room_uuid)
    remaining = filter_unsent_queue(get_active_queue(conversation.id), sent_uuids)
    next_room_uuid = remaining[0] if remaining else ""

    options = build_action_buttons(config, room_uuid, next_room_uuid=next_room_uuid, include_details=False)
    details_body = build_details_body(room, ctx, config)

    # Schedule card after all detail media
    from apps.messaging.tasks import send_share_card_task
    send_share_card_task.apply_async(
        kwargs={
            "conversation_id": conversation.id,
            "body_text": details_body.strip()[:1024] or "Room details",
            "options": options,
            "room_uuid": room_uuid,
            "is_interactive": True,
            "is_initial": False,
            "session_time_str": None,
            "sent_by_id": None,
        },
        countdown=int(max(next_countdown, PACING_DETAILS_PRE_CARD_S)),
    )


def _handle_next_action(
    conversation,
    current_room_uuid: str,
    next_room_uuid: str,
    remaining_uuids: list,
    config,
):
    ctx = get_session_context(conversation.id, current_room_uuid)
    filters = ctx.get("filters") or {}
    share_options = ctx.get("share_options") or {}
    rooms_map = ctx.get("rooms_map") or {}

    sent_uuids = collect_sent_room_uuids(conversation, current_uuid=current_room_uuid)
    queue = filter_unsent_queue(
        get_active_queue(conversation.id, fallback_uuids=remaining_uuids),
        sent_uuids,
    )

    next_room_uuid, room, queue = advance_to_next_room(
        next_room_uuid, queue, sent_uuids,
        conversation.assigned_agent, filters, rooms_map,
    )

    if not room or not next_room_uuid:
        from apps.messaging.utils import send_and_save_message
        send_and_save_message(conversation, msg_type="text", body=config.no_more_results_text)
        return

    subsequent_uuid = queue[0] if queue else ""

    # Persist updated queue and context
    set_active_queue(conversation.id, queue)
    if ctx:
        from django.core.cache import cache
        cache.set_many({
            ShareCacheKey.room(conversation.id, next_room_uuid): ctx,
            ShareCacheKey.session(conversation.id): ctx,
        }, timeout=SESSION_TTL_S)  # SESSION_TTL_S imported from .constants at top

    # Schedule media sends
    sent_keys = collect_sent_media_keys(conversation)
    from .media_dispatcher import schedule_room_media
    next_countdown = schedule_room_media(
        conversation, room, next_room_uuid, config, share_options, sent_keys,
    )

    # Schedule card after all media
    body_text = build_next_card_text(room, share_options, filters)
    options = build_action_buttons(
        config, next_room_uuid, next_room_uuid=subsequent_uuid, include_details=True
    )
    from apps.messaging.tasks import send_share_card_task
    send_share_card_task.apply_async(
        kwargs={
            "conversation_id": conversation.id,
            "body_text": body_text.strip()[:1024] or "Room details",
            "options": options,
            "room_uuid": next_room_uuid,
            "is_interactive": True,
            "is_initial": False,
            "session_time_str": None,
            "sent_by_id": None,
        },
        countdown=int(max(next_countdown, 1)),
    )


def _handle_book_action(conversation, room_uuid: str, config):
    ctx = get_session_context(conversation.id, room_uuid)
    room = resolve_room_data(room_uuid, conversation.assigned_agent, ctx)
    room_name = room.get("name") if room else "Room"
    from apps.messaging.utils import send_and_save_message
    send_and_save_message(
        conversation,
        msg_type="text",
        body=(
            f"Thank you! Your booking interest for *{room_name}* has been received. "
            "Our team will contact you right away with confirmation details."
        ),
        related_room_uuid=room_uuid,
    )


def _handle_exit_action(conversation, config):
    from apps.messaging.utils import send_and_save_message
    send_and_save_message(conversation, msg_type="text", body=config.exit_message_text)
