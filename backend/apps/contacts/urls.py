from django.urls import path
from .views import (
    ContactListCreateView, ContactDetailView,
    ContactTagListCreateView, ContactTagDetailView,
    WAContactsListView, WAContactsImportView,
    PipelineListCreateView, PipelineDetailView, PipelineActivateView,
    PipelineStageListCreateView, PipelineStageDetailView, PipelineStageSwapView,
    PipelineDealListCreateView, PipelineDealDetailView,
)

urlpatterns = [
    path('', ContactListCreateView.as_view(), name='contact_list'),
    path('<uuid:pk>/', ContactDetailView.as_view(), name='contact_detail'),
    path('tags/', ContactTagListCreateView.as_view(), name='tag_list'),
    path('tags/<uuid:pk>/', ContactTagDetailView.as_view(), name='tag_detail'),
    path('wa-contacts/', WAContactsListView.as_view(), name='wa_contacts_list'),
    path('wa-import/', WAContactsImportView.as_view(), name='wa_contacts_import'),

    # Pipeline
    path('pipelines/', PipelineListCreateView.as_view(), name='pipeline_list'),
    path('pipelines/<uuid:pk>/', PipelineDetailView.as_view(), name='pipeline_detail'),
    path('pipelines/<uuid:pk>/activate/', PipelineActivateView.as_view(), name='pipeline_activate'),

    # Stages
    path('pipeline/stages/', PipelineStageListCreateView.as_view(), name='pipeline_stage_list'),
    path('pipeline/stages/swap/', PipelineStageSwapView.as_view(), name='pipeline_stage_swap'),
    path('pipeline/stages/<uuid:pk>/', PipelineStageDetailView.as_view(), name='pipeline_stage_detail'),

    # Deals
    path('pipeline/deals/', PipelineDealListCreateView.as_view(), name='pipeline_deal_list'),
    path('pipeline/deals/<uuid:pk>/', PipelineDealDetailView.as_view(), name='pipeline_deal_detail'),
]
