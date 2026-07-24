from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContactViewSet,
    ConversationListAPIView, ConversationDetailAPIView,
    ConversationSendMessageAPIView, ConversationMarkReadAPIView,
    StartConversationAPIView,
    GlobalActiveFlowsAPIView, GlobalCancelFlowAPIView,
    MessageDeleteAPIView, WebhookView, MediaUploadAPIView,
    CustomMessageViewSet
)

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'custom-messages', CustomMessageViewSet, basename='custom-message')

urlpatterns = [
    # Contacts (ViewSet)
    path('', include(router.urls)),

    # Conversations
    path('conversations/', ConversationListAPIView.as_view(), name='conversation-list'),
    path('conversations/start/', StartConversationAPIView.as_view(), name='conversation-start'),
    path('conversations/<int:pk>/', ConversationDetailAPIView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/send/', ConversationSendMessageAPIView.as_view(), name='conversation-send-message'),
    path('conversations/<int:pk>/mark-read/', ConversationMarkReadAPIView.as_view(), name='conversation-mark-read'),

    # Active Flows
    path('active-flows/', GlobalActiveFlowsAPIView.as_view(), name='global-active-flows'),
    path('active-flows/<uuid:exec_id>/cancel/', GlobalCancelFlowAPIView.as_view(), name='global-cancel-flow'),

    # Messages
    path('upload/', MediaUploadAPIView.as_view(), name='media-upload'),
    path('messages/<int:pk>/', MessageDeleteAPIView.as_view(), name='message-delete'),

    # Meta Cloud API webhook 
    path('webhook/', WebhookView.as_view(), name='messaging-webhook'),
]
