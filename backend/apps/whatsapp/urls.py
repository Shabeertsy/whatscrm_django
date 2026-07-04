from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WhatsappInstanceViewSet

app_name = "whatsapp"

router = DefaultRouter()
router.register(r"instances", WhatsappInstanceViewSet, basename="whatsapp-instance")

urlpatterns = [
    path("", include(router.urls)),
]
