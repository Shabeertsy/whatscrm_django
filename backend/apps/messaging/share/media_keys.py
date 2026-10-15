from __future__ import annotations

import os
import logging
import json
from urllib.parse import urlparse, unquote

from .constants import SKIP_MEDIA_STEMS

logger = logging.getLogger(__name__)


def extract_media_keys(raw: str) -> set[str]:
    """
    Returns a set of normalised match-keys (url-without-query, relative path,
    filename, stem) for any media URL or storage path.
    Used for deduplication — if any key overlaps with sent_keys we skip.
    """
    keys: set[str] = set()
    if not raw or not isinstance(raw, str):
        return keys

    clean = raw.strip()
    if not clean:
        return keys

    # 1. Full URL without query/hash
    base_no_query = clean.split("?")[0].split("#")[0].rstrip("/").lower()
    if base_no_query:
        keys.add(base_no_query)

    # 2. Parsed URL path parts
    try:
        parsed = urlparse(clean)
        path = unquote(parsed.path or "").strip("/").lower()
        if path:
            keys.add(path)
            fname = os.path.basename(path)
            if fname and len(fname) > 3:
                keys.add(fname)
                stem, _ = os.path.splitext(fname)
                if stem and len(stem) >= 4 and stem not in SKIP_MEDIA_STEMS:
                    keys.add(stem)
    except Exception:
        pass

    # 3. Direct basename fallback (handles plain storage paths)
    fname = os.path.basename(base_no_query)
    if fname and len(fname) > 3:
        keys.add(fname)
        stem, _ = os.path.splitext(fname)
        if stem and len(stem) >= 4 and stem not in SKIP_MEDIA_STEMS:
            keys.add(stem)

    return keys


def collect_sent_media_keys(conversation, since_time=None) -> set[str]:
    """
    Returns all normalised media keys for outbound image/video/interactive
    messages in this conversation, scoped to `since_time` if provided.

    Single DB query — fields fetched with .only() for minimal data transfer.
    """
    from apps.messaging.models import Message

    sent_keys: set[str] = set()
    try:
        qs = Message.objects.filter(
            conversation=conversation,
            direction="outbound",
            msg_type__in=["image", "video", "interactive"],
        )
        if since_time:
            qs = qs.filter(timestamp__gte=since_time)

        for msg in qs.only("msg_type", "media_url", "storage_path", "body", "raw_data"):
            if msg.media_url:
                sent_keys.update(extract_media_keys(msg.media_url))
            if msg.storage_path:
                sent_keys.update(extract_media_keys(msg.storage_path))

            # Interactive message header images/videos
            if msg.msg_type == "interactive" and msg.body:
                try:
                    body_data = (
                        json.loads(msg.body)
                        if isinstance(msg.body, str) and msg.body.startswith("{")
                        else {}
                    )
                    if isinstance(body_data, dict):
                        for hdr_key in ("header_image_url", "header_video_url"):
                            url = body_data.get(hdr_key) or ""
                            if url:
                                sent_keys.update(extract_media_keys(url))
                except Exception:
                    pass

            # raw_data auxiliary URLs
            if msg.raw_data and isinstance(msg.raw_data, dict):
                for field in ("media_url", "link", "url", "original_url", "source_url", "image_url"):
                    val = msg.raw_data.get(field)
                    if val and isinstance(val, str):
                        sent_keys.update(extract_media_keys(val))

    except Exception as exc:
        logger.error("[share.media_keys] Error collecting sent keys: %s", exc)

    return sent_keys


def collect_sent_room_uuids(conversation, current_uuid: str = "") -> set[str]:
    """
    Returns UUIDs of rooms already sent in this share session (since last
    initial share cutoff). Falls back to DB if cache has no cutoff.
    Single DB query.
    """
    from apps.messaging.models import Message
    from .cache import get_last_share_time

    cutoff_dt = get_last_share_time(conversation.id)

    if not cutoff_dt:
        last_initial = (
            Message.objects.filter(
                conversation=conversation,
                direction="outbound",
                raw_data__is_initial_share=True,
            )
            .order_by("-timestamp")
            .values_list("timestamp", flat=True)
            .first()
        )
        cutoff_dt = last_initial

    if cutoff_dt:
        sent = set(
            Message.objects.filter(
                conversation=conversation,
                direction="outbound",
                timestamp__gte=cutoff_dt,
                related_room_uuid__isnull=False,
            )
            .exclude(related_room_uuid="")
            .values_list("related_room_uuid", flat=True)
        )
    else:
        sent = set()

    if current_uuid:
        sent.add(current_uuid)
    return sent
