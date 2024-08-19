"""
ASGI config for meeting project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application #0814新增
from channels.routing import ProtocolTypeRouter, URLRouter #0814新增
from channels.auth import AuthMiddlewareStack
import meeting.routing #0814新增

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'meeting.settings')

# 舊 0814-2235 application = get_asgi_application()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            meeting.routing.websocket_urlpatterns
        )
    ),
})
