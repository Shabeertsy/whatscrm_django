
# Celery countdown pacing (seconds) ─────────────────────────────────────────
# Used instead of time.sleep() so workers are NOT blocked.

PACING_IMAGE_S: float = 1.0      # between consecutive image sends
PACING_VIDEO_S: float = 2.0      # between consecutive video sends
PACING_POST_IMAGE_BATCH_S: float = 1.2   # after all images, before text card
PACING_POST_VIDEO_BATCH_S: float = 2.5   # after videos, before text card
PACING_BETWEEN_ROOMS_S: float = 0.5      # between rooms in initial share
PACING_DETAILS_PRE_CARD_S: float = 0.5  # after details media, before card


# CRM HTTP timeouts ──────────────────────────────────────────────────────────
CRM_FETCH_TIMEOUT_S: int = 8     # primary fetch timeout
CRM_CACHE_TTL_S: int = 300       # 5-minute room data cache

# Session cache TTLs ────────────────────────────────────────────────────────
SESSION_TTL_S: int = 86_400          # 24 h — share context
SESSION_LONG_TTL_S: int = 86_400 * 7  # 7 d — last share timestamp

# Media deduplication stems to skip ─────────────────────────────────────────
SKIP_MEDIA_STEMS: frozenset = frozenset(
    {"image", "photo", "media", "video", "thumb", "thumbnail", "default", "file"}
)

# Default field visibility for build_share_text ─────────────────────────────
DEFAULT_DETAILS_FIELDS: dict = {
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
    "propertyDetails_area": True,
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
