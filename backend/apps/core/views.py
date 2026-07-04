from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
import urllib.request
import json
import time
import hashlib


class HotelsProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query_params = request.GET.urlencode()
        url = f"https://demo.click4trip.in/api/list-properties/?{query_params}" if query_params else "https://demo.click4trip.in/api/list-properties/?page=1&page_size=9&check_in=2026-07-04&check_out=2026-07-05&adults=2&children=0&rooms=1&hide_unavailable=false"
        
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
        query_params = request.GET.urlencode()
        if not query_params:
            return Response({"error": "property_uuid is required"}, status=400)
            
        url = f"https://demo.click4trip.in/api/list-rooms/?{query_params}"
        
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
                
                # Cache the response for 5 minutes (300 seconds)
                cache.set(cache_key, data, timeout=300)
                
                return Response(data)
        except Exception as e:
            print(f"RoomsProxyView (Click4Trip API) Failed after: {time.time() - start_time:.3f} seconds")
            return Response({"error": str(e)}, status=500)
