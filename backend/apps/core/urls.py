from django.urls import path
from .views import HotelsProxyView, RoomsProxyView

urlpatterns = [
    path('hotels/', HotelsProxyView.as_view(), name='hotels_proxy'),
    path('rooms/', RoomsProxyView.as_view(), name='rooms_proxy'),
]
