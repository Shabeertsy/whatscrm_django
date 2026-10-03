from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    WhatsappFlowViewSet,
    FlowSubmissionListView,
    FlowDataExchangeView,
    PreviewApiView,
    FlowFieldsView,
)

router = DefaultRouter()
router.register(r"", WhatsappFlowViewSet, basename="wa-flow")

urlpatterns = [
    # Meta calls this endpoint for every screen interaction (public, no auth)
    path("wa/data-exchange/", FlowDataExchangeView.as_view(), name="flow-data-exchange"),
    path("submissions/", FlowSubmissionListView.as_view(), name="flow-submissions"),
    path("preview-api/", PreviewApiView.as_view(), name="flow-preview-api"),
    path("<uuid:flow_id>/fields/", FlowFieldsView.as_view(), name="flow-fields"),

    # Flow CRUD
    path("", include(router.urls)),
]
