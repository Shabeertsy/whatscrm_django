from django.contrib import admin
from .models import Contact, ContactTag

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'owner', 'status')
    search_fields = ('name', 'phone', 'email')
    list_filter = ('owner', 'status', 'tags')

@admin.register(ContactTag)
class ContactTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'color')
