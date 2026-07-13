from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WhatsappInstanceViewSet, WhatsappTemplateListCreateAPIView, WhatsappTemplateDetailAPIView, WhatsappTemplateSyncAPIView

app_name = "whatsapp"

router = DefaultRouter()
router.register(r"instances", WhatsappInstanceViewSet, basename="whatsapp-instance")

urlpatterns = [
    path("", include(router.urls)),
    path("templates/sync/<uuid:instance_id>/", WhatsappTemplateSyncAPIView.as_view(), name="whatsapp-template-sync"),
    path("templates/", WhatsappTemplateListCreateAPIView.as_view(), name="whatsapp-template-list"),
    path("templates/<uuid:pk>/", WhatsappTemplateDetailAPIView.as_view(), name="whatsapp-template-detail"),
]
