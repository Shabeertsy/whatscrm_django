import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

from apps.messaging.consumers import InboxConsumer  
from apps.messaging.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter({
    # Standard Django HTTP requests
    "http": django_asgi_app,

    # WebSocket connections
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter([
                path("ws/inbox/", InboxConsumer.as_asgi()),
            ])
        )
    ),
})
