
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from .constants import (
    PACING_IMAGE_S,
    PACING_VIDEO_S,
    PACING_POST_IMAGE_BATCH_S,
    PACING_POST_VIDEO_BATCH_S,
)
from .media_keys import extract_media_keys

if TYPE_CHECKING:
    from apps.messaging.models import PropertyShareConfig

logger = logging.getLogger(__name__)


# ── Media selection ────────────────────────────────────────────────────────────

def filter_selected_media(
    media_items: list,
    prefix: str,
    is_enabled: bool,
    default_limit: int,
    share_options: dict,
) -> list:
    """
    Return the subset of media_items that should be sent according to
    share_options checkboxes or the config limit.
    """
    if not is_enabled or not media_items:
        return []

    has_specific = any(
        k.startswith(f"{prefix}_") and isinstance(v, bool)
        for k, v in share_options.items()
    )
    if has_specific:
        selected = [
            item for i, item in enumerate(media_items)
            if share_options.get(f"{prefix}_{i}", False)
        ]
        return selected 

    # No per-image selection: use the config limit directly (no floor of 1 —
    # if admin sets limit=5, we send up to 5, not capped at 1).
    limit = max(0, default_limit or 0)
    if limit == 0:
        return []  # explicitly disabled
    return media_items[:limit]


# ── Countdown-based pacing (no sleep) ─────────────────────────────────────────

def schedule_media_sends(
    conversation_id: int,
    media_list: list,
    msg_type: str,          # "image" or "video"
    sent_keys: set,
    room_uuid: str,
    is_initial: bool,
    start_countdown: float = 0.0,
    batch_keys: set | None = None,
) -> tuple[int, float]:
    """
    Schedule individual send_media_item_task Celery tasks with increasing
    countdowns so they are delivered in order without blocking any worker.

    Returns (number_scheduled, next_available_countdown_s).

    sent_keys  — cross-session dedup (media sent in earlier actions).
    batch_keys — within-call dedup (media already scheduled earlier in
                 THIS call — prevents true URL duplicates across sections
                 without contaminating the next section's sent_keys check).
    """
    from apps.messaging.tasks import send_media_item_task

    if batch_keys is None:
        batch_keys = set()

    pacing = PACING_VIDEO_S if msg_type == "video" else PACING_IMAGE_S
    countdown = start_countdown
    scheduled = 0

    for item in media_list:
        raw_url = item.get("url") or item.get("image") or item.get("video") or ""
        if not raw_url:
            continue

        cand_keys = extract_media_keys(raw_url)

        # Skip if sent in a previous session/action OR already in this batch
        if cand_keys & sent_keys or cand_keys & batch_keys:
            continue

        send_media_item_task.apply_async(
            kwargs={
                "conversation_id": conversation_id,
                "raw_url": raw_url,
                "msg_type": msg_type,
                "room_uuid": room_uuid,
                "is_initial": is_initial,
            },
            countdown=int(countdown),
        )

        # Track in batch_keys only (not sent_keys) so the next section
        # in the same call doesn't falsely skip its own images.
        batch_keys.update(cand_keys)
        countdown += pacing
        scheduled += 1

    return scheduled, countdown


def schedule_room_media(
    conversation,
    room: dict,
    room_uuid: str,
    config,
    share_options: dict,
    sent_keys: set,
    is_initial: bool = False,
    start_countdown: float = 0.0,
) -> float:
    """
    Schedule all property images, room images, and videos with Celery countdowns.
    Returns the next free countdown (seconds from now) so callers can chain
    the text/card task immediately after the last media send.
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

    # Shared batch_keys set — tracks what we schedule IN THIS CALL.
    # Prevents true URL duplicates across prop/room/video sections.
    # Does NOT contaminate sent_keys (cross-session dedup stays clean).
    batch_keys: set = set()

    countdown = start_countdown

    # Read limits directly from config — no forced floor so admin-set values take effect
    prop_img_limit = config.initial_property_image_limit or 0
    room_img_limit = config.initial_room_image_limit or 0
    video_limit    = getattr(config, "initial_video_limit", 1) or 0

    logger.info(
        "[share.media_dispatcher] conv=%s room=%s | config limits: prop_img=%d room_img=%d video=%d "
        "| CRM data available: prop_imgs=%d room_imgs=%d videos=%d",
        conversation.id, room_uuid,
        prop_img_limit, room_img_limit, video_limit,
        len(prop_images), len(room_images), len(prop_videos),
    )

    # 1. Property images
    send_prop_imgs = share_options.get("images_property", config.initial_send_property_images)
    selected_prop = filter_selected_media(prop_images, "images_property", send_prop_imgs, prop_img_limit, share_options)
    if selected_prop:
        n, countdown = schedule_media_sends(
            conversation.id, selected_prop, "image", sent_keys, room_uuid, is_initial, countdown, batch_keys
        )
        if n:
            countdown += PACING_POST_IMAGE_BATCH_S

    # 2. Room images — uses same batch_keys but NOT contaminated by prop keys
    send_room_imgs = share_options.get("images_room", config.initial_send_room_images)
    fallback_room_imgs = room_images or (prop_images if not send_prop_imgs else [])
    selected_room = filter_selected_media(fallback_room_imgs, "images_room", send_room_imgs, room_img_limit, share_options)
    if selected_room:
        n, countdown = schedule_media_sends(
            conversation.id, selected_room, "image", sent_keys, room_uuid, is_initial, countdown, batch_keys
        )
        if n:
            countdown += PACING_POST_IMAGE_BATCH_S

    # 3. Property videos
    send_videos = share_options.get("videos_property", config.initial_send_videos)
    selected_vids = filter_selected_media(prop_videos, "videos_property", send_videos, video_limit, share_options)
    if selected_vids:
        n, countdown = schedule_media_sends(
            conversation.id, selected_vids, "video", sent_keys, room_uuid, is_initial, countdown, batch_keys
        )
        if n:
            countdown += PACING_POST_VIDEO_BATCH_S

    return countdown


def schedule_details_media(
    conversation,
    room: dict,
    room_uuid: str,
    config,
    sent_keys: set,
    start_countdown: float = 0.0,
) -> float:
    """Schedule 'More Details' media sends. Returns next free countdown."""
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

    countdown = start_countdown

    if config.details_send_property_images and prop_images:
        n, countdown = schedule_media_sends(
            conversation.id,
            prop_images[: max(1, config.details_property_image_limit)],
            "image", sent_keys, room_uuid, False, countdown,
        )
        if n:
            countdown += PACING_POST_IMAGE_BATCH_S

    if config.details_send_room_images and room_images:
        n, countdown = schedule_media_sends(
            conversation.id,
            room_images[: max(1, config.details_room_image_limit)],
            "image", sent_keys, room_uuid, False, countdown,
        )
        if n:
            countdown += PACING_POST_IMAGE_BATCH_S

    if config.details_send_videos and prop_videos:
        video_limit = max(1, getattr(config, "details_video_limit", 1) or 1)
        n, countdown = schedule_media_sends(
            conversation.id,
            prop_videos[:video_limit],
            "video", sent_keys, room_uuid, False, countdown,
        )
        if n:
            countdown += PACING_POST_VIDEO_BATCH_S

    return countdown


def register_initial_sent_media(
    room: dict,
    share_options: dict,
    config,
    conversation,
    sent_keys: set,
):
    """
    Pre-populate sent_keys with media that has already been dispatched
    as part of the initial share, so subsequent actions (e.g. More Details)
    don't re-send the same images.
    Reads DB once (existence check only).
    """
    from apps.messaging.models import Message

    prop_details = room.get("property_details") or room.get("property") or {}
    prop_images = prop_details.get("property_images") or prop_details.get("images") or []

    prop_initial_count = sum(
        1 for k, v in share_options.items()
        if k.startswith("images_property_") and v is True
    )
    if prop_initial_count == 0 and (
        share_options.get("images_property") or config.initial_send_property_images
    ):
        prop_initial_count = max(1, config.initial_property_image_limit or 1)

    for i, img_obj in enumerate(prop_images):
        if share_options.get(f"images_property_{i}") or i < prop_initial_count:
            u = img_obj.get("url") or img_obj.get("image") or ""
            if u:
                sent_keys.update(extract_media_keys(u))

    has_prior = Message.objects.filter(
        conversation=conversation, direction="outbound", msg_type="image"
    ).exists()
    if (has_prior or config.initial_send_property_images or share_options.get("images_property")) and prop_images:
        u0 = prop_images[0].get("url") or prop_images[0].get("image") or ""
        if u0:
            sent_keys.update(extract_media_keys(u0))

    room_images = room.get("room_images") or []
    room_initial_count = sum(
        1 for k, v in share_options.items()
        if k.startswith("images_room_") and v is True
    )
    if room_initial_count == 0:
        room_initial_count = 1

    for i, img_obj in enumerate(room_images):
        if share_options.get(f"images_room_{i}") or i < room_initial_count:
            u = img_obj.get("url") or img_obj.get("image") or ""
            if u:
                sent_keys.update(extract_media_keys(u))

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
            sent_keys.update(extract_media_keys(v_url))
