from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AutomationFlowViewSet

router = DefaultRouter()
router.register(r'flows', AutomationFlowViewSet, basename='automation-flow')

urlpatterns = [
    path('', include(router.urls)),
]
