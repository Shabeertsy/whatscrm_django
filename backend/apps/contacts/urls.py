from django.urls import path
from .views import (
    ContactListCreateView, ContactDetailView,
    ContactTagListCreateView, ContactTagDetailView,
    WAContactsListView, WAContactsImportView,
)

urlpatterns = [
    path('', ContactListCreateView.as_view(), name='contact_list'),
    path('<uuid:pk>/', ContactDetailView.as_view(), name='contact_detail'),
    path('tags/', ContactTagListCreateView.as_view(), name='tag_list'),
    path('tags/<uuid:pk>/', ContactTagDetailView.as_view(), name='tag_detail'),
    path('wa-contacts/', WAContactsListView.as_view(), name='wa_contacts_list'),
    path('wa-import/', WAContactsImportView.as_view(), name='wa_contacts_import'),
]
