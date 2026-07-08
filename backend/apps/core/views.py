from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.conf import settings
import urllib.request
import json
import time
import hashlib


class HotelsProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query_params = request.GET.urlencode()
        base = settings.PROXY_API_BASE_URL.rstrip('/')
        url = f"{base}/list-properties/?{query_params}" if query_params else f"{base}/list-properties/?page=1&page_size=9&check_in=2026-07-04&check_out=2026-07-05&adults=2&children=0&rooms=1&hide_unavailable=false"
        
        # Create a unique cache key based on the URL
        cache_key = 'hotels_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            print("HotelsProxyView: Returned from Cache instantly!")
            return Response(cached_data)

        start_time = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                print(f"HotelsProxyView (Click4Trip API) Response Time: {time.time() - start_time:.3f} seconds")
                
                # Cache the response for 5 minutes (300 seconds)
                cache.set(cache_key, data, timeout=300)
                
                return Response(data)
        except Exception as e:
            print(f"HotelsProxyView (Click4Trip API) Failed after: {time.time() - start_time:.3f} seconds")
            return Response({"error": str(e)}, status=500)


class RoomsProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uuid = request.query_params.get('uuid')
        query_params = request.GET.urlencode()
        
        base = settings.PROXY_API_BASE_URL.rstrip('/')
        if uuid:
            url = f"{base}/crm/rooms/{uuid}/?{query_params}"
        else:
            url = f"{base}/list-rooms/?{query_params}"
            
        # Create a unique cache key based on the URL
        cache_key = 'rooms_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            print("RoomsProxyView: Returned from Cache instantly!")
            return Response(cached_data)
        
        start_time = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                print(f"RoomsProxyView (Click4Trip API) Response Time: {time.time() - start_time:.3f} seconds")
                
                cache.set(cache_key, data, timeout=300)
                return Response(data)
        except Exception as e:
            print(f"RoomsProxyView (Click4Trip API) Failed after: {time.time() - start_time:.3f} seconds")
            return Response({"error": str(e)}, status=500)


class RoomConfigProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        base = settings.PROXY_API_BASE_URL.rstrip('/')
        url = f"{base}/crm/room-config/"
        
        cache_key = 'room_config_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                cache.set(cache_key, data, timeout=3600)
                return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class PropertyConfigProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        base = settings.PROXY_API_BASE_URL.rstrip('/')
        url = f"{base}/crm/property-config/"
        
        cache_key = 'property_config_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                cache.set(cache_key, data, timeout=3600)
                return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class CRMRoomsProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, uuid=None):
        # We always fetch from the list endpoint because the upstream API lacks a detail endpoint.
        # We'll pass page_size=500 to ensure we get all rooms, then filter in memory if uuid is given.
        
        # Clone request GET params to modify them safely
        params = request.GET.copy()
        if 'page_size' not in params:
            params['page_size'] = 500
        query_params = params.urlencode()
        
        base = settings.PROXY_API_BASE_URL.rstrip('/')
        url = f"{base}/crm/rooms/?{query_params}"
        
        cache_key = 'crm_rooms_api_' + hashlib.md5((url + str(uuid)).encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)

        start_time = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
                # If uuid is provided, filter the results and simulate a detail response
                if uuid:
                    rooms = data.get('rooms', [])
                    found_room = next((r for r in rooms if r.get('uuid') == uuid), None)
                    if found_room:
                        cache.set(cache_key, found_room, timeout=60)
                        return Response(found_room)
                    else:
                        return Response({"error": "Room not found"}, status=404)
                else:
                    cache.set(cache_key, data, timeout=60)
                    return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

