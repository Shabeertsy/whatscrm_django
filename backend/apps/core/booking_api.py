"""
Token is cached in Redis per base-URL for (expires_in - 60) seconds.

Usage:
    from apps.core.booking_api import get_crm_rooms, get_crm_room_detail

    rooms = get_crm_rooms(user=request.user, check_in='2026-12-01', check_out='2026-12-03', adults=2)
    room  = get_crm_room_detail(room_uuid='uuid', user=request.user, check_in='...', check_out='...')
"""


import hashlib
import logging

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Redis key prefix — suffixed with a short hash of the base URL so each
# Project A server gets its own cached token.
_TOKEN_KEY_PREFIX = 'project_a_crm_oauth2_token'


# ─── URL resolution (dynamic, from DB) ───────────────────────────────────────

def _get_base_url(user=None) -> str:
    """
    Resolve Project A's base URL the same way the rest of the project does:
      1. User's active proxy  (UserActiveProxy row for this user)
      2. Any active proxy     (first UserActiveProxy in the DB)
      3. PROXY_API_BASE_URL   (settings / .env fallback)

    Trailing slash is stripped for consistent URL building.
    """
    # Deferred import to avoid circular imports at module load time.
    from apps.core.views import get_proxy_url
    return get_proxy_url(user)


def _token_cache_key(base_url: str) -> str:
    """Unique Redis key per Project A server (hashed from the base URL)."""
    url_hash = hashlib.md5(base_url.encode()).hexdigest()[:12]
    return f'{_TOKEN_KEY_PREFIX}_{url_hash}'


#  Token management 

def _fetch_new_token(base_url: str) -> str | None:
    """
    POST /o/token/ on Project A and return the raw access_token string.
    Caches the token in Redis/memory with a 60-second safety margin.

    The token endpoint lives at the domain root (not under /api), so we
    strip any trailing /api path segment from the base_url before building
    the token URL.
    e.g. base_url = "https://demo.click4trip.in/api"
         token URL = "https://demo.click4trip.in/o/token/"

    If the proxy server does not implement OAuth2 (/o/token/ returns 404),
    we gracefully fallback to direct access (no Bearer token).
    """
    if not getattr(settings, 'PROJECT_A_CLIENT_ID', None) or not getattr(settings, 'PROJECT_A_CLIENT_SECRET', None):
        return None

    # Strip the /api suffix so we hit the domain root for OAuth2
    token_root = base_url.rstrip('/')
    if token_root.endswith('/api'):
        token_root = token_root[:-4]  # remove trailing /api

    try:
        response = requests.post(
            f'{token_root}/o/token/',
            data={
                'grant_type': 'client_credentials',
                'scope': 'crm:read',
            },
            auth=(
                settings.PROJECT_A_CLIENT_ID,
                settings.PROJECT_A_CLIENT_SECRET,
            ),
            timeout=10,
        )

        # Server does not have an OAuth2 token endpoint (404) -> Fallback to direct access
        if response.status_code == 404:
            logger.info('[BookingAPI] Server %s has no /o/token/ endpoint (404). Falling back to direct access.', token_root)
            cache.set(_token_cache_key(base_url), 'NO_OAUTH', timeout=600)
            return None

        response.raise_for_status()
        result = response.json()

        token = result.get('access_token')
        if token:
            granted_scope = result.get('scope', '')
            ttl = max(1, int(result.get('expires_in', 900)) - 60)
            cache.set(_token_cache_key(base_url), token, timeout=ttl)
            logger.info('[BookingAPI] New OAuth2 token fetched for %s — granted scope: "%s" — cached %ds', base_url, granted_scope, ttl)
            return token
        return None

    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            logger.info('[BookingAPI] Server %s has no /o/token/ (404). Falling back to direct access.', token_root)
            cache.set(_token_cache_key(base_url), 'NO_OAUTH', timeout=600)
            return None
        raise


def _get_token(base_url: str) -> str | None:
    """Return cached token for this base URL, or fetch a fresh one."""
    cached = cache.get(_token_cache_key(base_url))
    if cached == 'NO_OAUTH':
        return None
    if cached:
        return cached
    return _fetch_new_token(base_url)


def _auth_headers(base_url: str) -> dict:
    headers = {'User-Agent': 'Mozilla/5.0'}
    token = _get_token(base_url)
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return headers


# ─── Internal HTTP helper ─────────────────────────────────────────────────────

def _get(base_url: str, path: str, params: dict = None) -> dict:
    """
    GET against Project A (with OAuth2 Bearer token if supported, else direct).
    On a 401, clears the token cache and retries once with a fresh token.
    Raises requests.HTTPError for any non-2xx response after the retry.
    """
    url = f'{base_url}{path}'

    response = requests.get(url, headers=_auth_headers(base_url), params=params, timeout=15)

    if response.status_code in (401, 403):
        # Only retry if we were using a token
        if _get_token(base_url):
            logger.warning('[BookingAPI] %s on %s — clearing token cache and retrying once', response.status_code, path)
            cache.delete(_token_cache_key(base_url))
            response = requests.get(url, headers=_auth_headers(base_url), params=params, timeout=15)

    response.raise_for_status()
    return response.json()


# ─── Public API functions ─────────────────────────────────────────────────────

def get_crm_rooms(
    user=None,
    check_in: str = None,
    check_out: str = None,
    adults: int = 1,
    children: int = 0,
    rooms_needed: int = 1,
    page: int = 1,
    page_size: int = 10,
    search: str = None,
    property_type: str = None,
    room_type: str = None,
    bedroom_type: str = None,
    amenities: str = None,
    tags: str = None,
    room_views: str = None,
    areas: str = None,
    districts: str = None,
    meal_plans: str = None,
    min_price: float = None,
    max_price: float = None,
    sort: str = 'price_asc',
    hide_unavailable: bool = False,
    **extra_filters,
) -> dict:
    """
    GET /api/crm/rooms/

    Parameters
    ----------
    user            : Django User instance — resolves Project A URL from the DB
    check_in        : 'YYYY-MM-DD'  — first night of stay
    check_out       : 'YYYY-MM-DD'  — day after last night
    adults          : number of adults (default 1)
    children        : number of children (default 0)
    rooms_needed    : number of rooms required (default 1)
    page            : page number (default 1)
    page_size       : results per page, max 50 (default 10)
    search          : free-text search on room/property name or location
    property_type   : UUID — filter by property type
    room_type       : UUID — filter by room type
    bedroom_type    : UUID — filter by bedroom type
    amenities       : comma-separated UUIDs
    tags            : comma-separated UUIDs
    room_views      : comma-separated UUIDs
    areas           : comma-separated UUIDs
    districts       : comma-separated UUIDs
    meal_plans      : comma-separated keys e.g. 'includes_breakfast'
    min_price       : minimum grand total (float)
    max_price       : maximum grand total (float)
    sort            : 'price_asc' | 'price_desc' | 'newest' | 'oldest'
    hide_unavailable: True to exclude unavailable rooms

    Returns
    -------
    dict with keys: rooms, result_count, page, total_pages, has_more, filters_applied
    """
    base_url = _get_base_url(user)

    params = {
        'adults':           adults,
        'children':         children,
        'rooms_needed':     rooms_needed,
        'page':             page,
        'page_size':        page_size,
        'sort':             sort,
        'hide_unavailable': 'true' if hide_unavailable else 'false',
    }

    if check_in:        params['check_in']       = check_in
    if check_out:       params['check_out']      = check_out
    if search:          params['search']         = search
    if property_type:   params['property_type']  = property_type
    if room_type:       params['room_type']      = room_type
    if bedroom_type:    params['bedroom_type']   = bedroom_type
    if amenities:       params['amenities']      = amenities
    if tags:            params['tags']           = tags
    if room_views:      params['room_views']     = room_views
    if areas:           params['areas']          = areas
    if districts:       params['districts']      = districts
    if meal_plans:      params['meal_plans']     = meal_plans
    if min_price:       params['min_price']      = min_price
    if max_price:       params['max_price']      = max_price

    params.update(extra_filters)

    return _get(base_url, '/crm/rooms/', params=params)


def get_crm_room_detail(
    room_uuid: str,
    user=None,
    check_in: str = None,
    check_out: str = None,
    adults: int = 1,
    children: int = 0,
    rooms_needed: int = 1,
) -> dict:
    """
    GET /api/crm/rooms/<uuid>/

    Parameters
    ----------
    room_uuid    : UUID string of the room (required)
    user         : Django User instance — resolves Project A URL from the DB
    check_in     : 'YYYY-MM-DD'
    check_out    : 'YYYY-MM-DD'
    adults       : number of adults (default 1)
    children     : number of children (default 0)
    rooms_needed : number of rooms required (default 1)

    Returns
    -------
    dict — single room object
    """
    base_url = _get_base_url(user)

    params = {
        'adults':       adults,
        'children':     children,
        'rooms_needed': rooms_needed,
    }
    if check_in:  params['check_in']  = check_in
    if check_out: params['check_out'] = check_out

    return _get(base_url, f'/crm/rooms/{room_uuid}/', params=params)
