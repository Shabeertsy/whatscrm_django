from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    WhatsappFlowViewSet,
    FlowSubmissionListView,
    FlowDataExchangeView,
)

router = DefaultRouter()
router.register(r"", WhatsappFlowViewSet, basename="wa-flow")

urlpatterns = [
    # Meta calls this endpoint for every screen interaction (public, no auth)
    path("wa/data-exchange/", FlowDataExchangeView.as_view(), name="flow-data-exchange"),

    # Flow submissions list
    path("submissions/", FlowSubmissionListView.as_view(), name="flow-submissions"),

    # Flow CRUD — must come AFTER specific paths to avoid router catching them
    path("", include(router.urls)),
]
