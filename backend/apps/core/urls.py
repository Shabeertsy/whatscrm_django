from django.urls import path
from .views import (
    HotelsProxyView, RoomsProxyView, 
    RoomConfigProxyView, PropertyConfigProxyView,
    CRMRoomsProxyView
)

urlpatterns = [
    path('hotels/', HotelsProxyView.as_view(), name='hotels_proxy'),
    path('rooms/', RoomsProxyView.as_view(), name='rooms_proxy'),
    path('room-config/', RoomConfigProxyView.as_view(), name='room_config_proxy'),
    path('property-config/', PropertyConfigProxyView.as_view(), name='property_config_proxy'),
    path('crm-rooms/', CRMRoomsProxyView.as_view(), name='crm_rooms_proxy'),
    path('crm-rooms/<str:uuid>/', CRMRoomsProxyView.as_view(), name='crm_rooms_proxy_detail'),
]
