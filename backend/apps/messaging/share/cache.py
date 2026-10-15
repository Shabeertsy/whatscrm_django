from __future__ import annotations

from django.core.cache import cache
from django.utils.dateparse import parse_datetime

from .constants import SESSION_TTL_S, SESSION_LONG_TTL_S, CRM_CACHE_TTL_S




# ── Key builders ──────────────────────────────────────────────────────────────
class ShareCacheKey:
    """Typed cache-key factory — no more string typos."""

    @staticmethod
    def session(conv_id: int) -> str:
        return f"share_ctx:{conv_id}:latest"

    @staticmethod
    def room(conv_id: int, room_uuid: str) -> str:
        return f"share_ctx:{conv_id}:{room_uuid}"

    @staticmethod
    def queue(conv_id: int) -> str:
        return f"share_ctx:{conv_id}:queue"

    @staticmethod
    def last_share_time(conv_id: int) -> str:
        return f"share_ctx:{conv_id}:last_initial_share_time"

    @staticmethod
    def room_data(room_uuid: str) -> str:
        return f"share_ctx_room_{room_uuid}"

    @staticmethod
    def crm_room(room_uuid: str, qs: str = "") -> str:
        return f"share_responder_room_{room_uuid}" + (f"_{qs}" if qs else "")



# ── Session helpers ────────────────────────────────────────────────────────────
def get_session_context(conv_id: int, room_uuid: str = "") -> dict:
    """
    Return share context for a specific room first, then fallback to latest.
    Uses cache.get_many() for a single round-trip when room_uuid is given.
    """
    if room_uuid:
        results = cache.get_many([
            ShareCacheKey.room(conv_id, room_uuid),
            ShareCacheKey.session(conv_id),
        ])
        return (
            results.get(ShareCacheKey.room(conv_id, room_uuid))
            or results.get(ShareCacheKey.session(conv_id))
            or {}
        )
    return cache.get(ShareCacheKey.session(conv_id)) or {}


def save_session_context(conv_id: int, rooms_map: dict, share_ctx: dict, queue: list):
    """Persist share context for all rooms and the latest pointer in one shot."""
    mapping = {}
    for uuid, room_data in rooms_map.items():
        mapping[ShareCacheKey.room(conv_id, uuid)] = {
            **share_ctx,
            "room_uuid": uuid,
            "room_data": room_data,
        }
        mapping[ShareCacheKey.room_data(uuid)] = room_data
    mapping[ShareCacheKey.session(conv_id)] = share_ctx
    mapping[ShareCacheKey.queue(conv_id)] = queue
    cache.set_many(mapping, timeout=SESSION_TTL_S)


def get_last_share_time(conv_id: int):
    """Return datetime or None for the last initial share cutoff."""
    raw = cache.get(ShareCacheKey.last_share_time(conv_id))
    if not raw:
        return None
    if isinstance(raw, str):
        return parse_datetime(raw)
    return raw


def set_last_share_time(conv_id: int, iso_str: str):
    cache.set(ShareCacheKey.last_share_time(conv_id), iso_str, timeout=SESSION_LONG_TTL_S)


def get_active_queue(conv_id: int, fallback_uuids: list | None = None) -> list:
    cached = cache.get(ShareCacheKey.queue(conv_id))
    return list(cached) if cached is not None else list(fallback_uuids or [])


def set_active_queue(conv_id: int, queue: list):
    cache.set(ShareCacheKey.queue(conv_id), queue, timeout=SESSION_TTL_S)
