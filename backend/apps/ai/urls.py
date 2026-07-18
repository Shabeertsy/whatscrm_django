from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIAgentSettingsViewSet, AIProviderSettingsViewSet



router = DefaultRouter()
router.register(r'ai-agents', AIAgentSettingsViewSet, basename='ai-agents')
router.register(r'ai-providers', AIProviderSettingsViewSet, basename='ai-providers')

urlpatterns = [
    path('', include(router.urls)),
]
