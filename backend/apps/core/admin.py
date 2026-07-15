from django.contrib import admin
from .models import ProxyURL, UserActiveProxy

@admin.register(ProxyURL)
class ProxyURLAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'created_at', 'updated_at')
    search_fields = ('name', 'url')
    ordering = ('-created_at',)

@admin.register(UserActiveProxy)
class UserActiveProxyAdmin(admin.ModelAdmin):
    list_display = ('user', 'proxy', 'created_at', 'updated_at')
    list_select_related = ('user', 'proxy')
    search_fields = ('user__email', 'proxy__name', 'proxy__url')
    ordering = ('-created_at',)
    autocomplete_fields = ('user', 'proxy')
