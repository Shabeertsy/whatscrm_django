from __future__ import annotations

import json
import logging
import urllib.request
from urllib.parse import urlencode

from django.core.cache import cache

from .constants import CRM_FETCH_TIMEOUT_S, CRM_CACHE_TTL_S
from .cache import ShareCacheKey

logger = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "Mozilla/5.0"}




def _do_get(url: str) -> dict:
    """Raw HTTP GET → parsed JSON dict. Raises on any error."""
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=CRM_FETCH_TIMEOUT_S) as resp:
        return json.loads(resp.read().decode())


def _build_params(filters: dict) -> dict:
    """Map frontend filter keys → CRM query param names."""
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
    return params


def fetch_room_by_uuid(room_uuid: str, user=None, filters: dict | None = None) -> dict:
    """
    Fetch a single room payload from the CRM.

    Strategy:
      1. Return from cache if available (5-minute TTL, keyed by uuid + date params).
      2. Try primary fetch with date/rate params (CRM returns priced room).
      3. On failure, retry once without params (avoids 404 on date restrictions).
      4. On second failure, fall back to stale room_data cache if present.
      5. Return {} on complete failure.
    """
    if not room_uuid:
        return {}

    from apps.core.views import get_proxy_url

    filters = filters or {}
    params = _build_params(filters)
    qs = urlencode(params)
    cache_key = ShareCacheKey.crm_room(room_uuid, qs)

    cached = cache.get(cache_key)
    if cached:
        return cached

    base_url = get_proxy_url(user)
    primary_url = f"{base_url}/crm/rooms/{room_uuid}/" + (f"?{qs}" if qs else "")

    logger.info("[share.crm_client] Fetching room %s → %s", room_uuid, primary_url)
    try:
        data = _do_get(primary_url)
        cache.set(cache_key, data, timeout=CRM_CACHE_TTL_S)
        return data
    except Exception as exc:
        logger.warning("[share.crm_client] Primary fetch failed for %s: %s", room_uuid, exc)

    # Retry without date params
    if qs:
        fallback_url = f"{base_url}/crm/rooms/{room_uuid}/"
        logger.info("[share.crm_client] Retrying %s without params", room_uuid)
        try:
            data = _do_get(fallback_url)
            cache.set(cache_key, data, timeout=CRM_CACHE_TTL_S)
            return data
        except Exception as fb_exc:
            logger.error("[share.crm_client] Fallback also failed for %s: %s", room_uuid, fb_exc)

    # Stale cache fallback
    stale = cache.get(ShareCacheKey.room_data(room_uuid))
    if stale:
        logger.warning("[share.crm_client] Using stale cache for %s", room_uuid)
        return stale

    return {}
