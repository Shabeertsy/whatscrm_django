## Rest imports 
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


## Django imports
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.utils.timesince import timesince

## models and sericalizers
from .models import ProxyURL, UserActiveProxy
from .serializers import ProxyURLSerializer


## Other apps
from apps.core.scoping import scope_by_owner
from apps.core.scoping import get_tenant_owner
from apps.whatsapp.models import WhatsappInstance
from apps.automation.models import AutomationFlow, FlowExecution, ExecutionStatus
from apps.contacts.models import Pipeline
from apps.messaging.models import Message
from apps.campaigns.models import Campaign
from apps.core.permissions import RequirePermission, Permission


## common
import urllib.request
import json
import time
import hashlib




def get_proxy_url(user):
    active = UserActiveProxy.objects.filter(user=user).first()
    if active:
        return active.proxy.url.rstrip('/')
    return settings.PROXY_API_BASE_URL.rstrip('/')

class ProxyURLViewSet(viewsets.ModelViewSet):
    serializer_class = ProxyURLSerializer
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_SETTINGS_PROXIES
    def get_queryset(self):
        return scope_by_owner(ProxyURL.objects.all(), self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=get_tenant_owner(self.request.user))

    def update(self, request, *args, **kwargs):
        is_active = request.data.get('is_active')
        if is_active is not None:
            proxy = self.get_object()
            if is_active:
                UserActiveProxy.objects.update_or_create(user=request.user, defaults={'proxy': proxy})
            else:
                UserActiveProxy.objects.filter(user=request.user, proxy=proxy).delete()
            return Response(self.get_serializer(proxy).data)
        return super().update(request, *args, **kwargs)



class HotelsProxyView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_HOTELS

    def get(self, request):
        query_params = request.GET.urlencode()
        base = get_proxy_url(request.user)
        url = f"{base}/list-properties/?{query_params}" if query_params else f"{base}/list-properties/?page=1&page_size=9&check_in=2026-07-04&check_out=2026-07-05&adults=2&children=0&rooms=1&hide_unavailable=false"
        
        # Create a unique cache key based on the URL
        cache_key = 'hotels_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)

        start_time = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                # Cache the response for 5 minutes (300 seconds)
                cache.set(cache_key, data, timeout=300)
                
                return Response(data)
        except Exception as e:
            print(f"HotelsProxyView (Click4Trip API) Failed after: {time.time() - start_time:.3f} seconds")
            return Response({"error": str(e)}, status=500)


class RoomsProxyView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_HOTELS

    def get(self, request):
        uuid = request.query_params.get('uuid')
        query_params_dict = request.GET.copy()
        
        # if user has a location assigned, default to it
        if 'location' not in query_params_dict and request.user.location:
            query_params_dict['location'] = request.user.location.name
            
        query_params = query_params_dict.urlencode()
        base = get_proxy_url(request.user)
        if uuid:
            url = f"{base}/crm/rooms/{uuid}/?{query_params}"
        else:
            url = f"{base}/list-rooms/?{query_params}"
            
        # Create a unique cache key based on the URL
        cache_key = 'rooms_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
      
        if cached_data:
            return Response(cached_data)
        
        start_time = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                cache.set(cache_key, data, timeout=300)
                return Response(data)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class RoomConfigProxyView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_HOTELS

    def get(self, request):
        base = get_proxy_url(request.user)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_HOTELS

    def get(self, request):
        base = get_proxy_url(request.user)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_HOTELS

    def get(self, request, uuid=None):
        query_params = request.GET.urlencode()
        base = get_proxy_url(request.user)
        
        if uuid:
            url = f"{base}/crm/rooms/{uuid}/"
            if query_params:
                url += f"?{query_params}"
        else:
            url = f"{base}/crm/rooms/"
            if query_params:
                url += f"?{query_params}"
        
        cache_key = 'crm_rooms_api_' + hashlib.md5(url.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)

        start_time = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
                cache.set(cache_key, data, timeout=60)
                return Response(data)
                
        except urllib.error.HTTPError as e:
            try:
                error_body = json.loads(e.read().decode())
                return Response(error_body, status=e.code)
            except:
                return Response({"error": str(e)}, status=e.code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Active Automations
        active_automations = AutomationFlow.objects.filter(owner=user, status='active').count()
        automations_metric = {
            "label": "Active Automations",
            "val": str(active_automations),
            "desc": "Currently running automations",
            "success": True
        }
        
        # Active Campaigns
        active_campaigns = Campaign.objects.filter(owner=user, status='Running').count()
        campaigns_metric = {
            "label": "Active Campaigns",
            "val": str(active_campaigns),
            "desc": "Marketing campaigns active",
            "success": True
        }
        
        # Total Messages Sent 
        thirty_days_ago = timezone.now() - timedelta(days=30)
        messages_sent = Message.objects.filter(
            conversation__instance__user=user, 
            direction='outbound', 
            timestamp__gte=thirty_days_ago
        ).count()
        messages_metric = {
            "label": "Messages Sent (30d)",
            "val": f"{messages_sent:,}",
            "desc": "Total outbound messages",
            "success": True
        }
        
        #  Automation Success Rate
        executions_30d = FlowExecution.objects.filter(
            flow__owner=user,
            started_at__gte=thirty_days_ago
        )
        total_executions = executions_30d.count()
        successful_executions = executions_30d.filter(status=ExecutionStatus.COMPLETED).count()
        
        success_rate = 0
        if total_executions > 0:
            success_rate = (successful_executions / total_executions) * 100
            
        success_rate_metric = {
            "label": "Automation Success Rate",
            "val": f"{success_rate:.1f}%",
            "desc": f"Based on {total_executions} executions",
            "success": success_rate >= 90
        }
        
        return Response([
            automations_metric,
            campaigns_metric,
            messages_metric,
            success_rate_metric
        ])


class DashboardLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        executions = FlowExecution.objects.filter(flow__owner=user).select_related('flow', 'contact').order_by('-created_at')[:10]
        logs = []
       
        for ex in executions:
            time_str = timesince(ex.created_at).split(',')[0] + " ago"
            if time_str == "0 minutes ago" or "0 minutes" in time_str:
                time_str = "Just now"
                
            status = 'warning'
            if ex.status == ExecutionStatus.COMPLETED:
                status = 'success'
            elif ex.status in (ExecutionStatus.RUNNING, ExecutionStatus.WAITING):
                status = 'info'
            
            contact_name = ex.contact.name or ex.contact.phone
            if status == 'success':
                text = f"Flow '{ex.flow.name}' ran successfully for {contact_name}"
            elif status == 'info':
                text = f"Flow '{ex.flow.name}' is running for {contact_name}"
            else:
                text = f"Flow '{ex.flow.name}' failed or cancelled for {contact_name}"
                
            logs.append({
                "time": time_str,
                "type": status,
                "text": text,
                "timestamp": ex.created_at.isoformat()
            })
            
        return Response(logs)
