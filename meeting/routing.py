from django.urls import re_path
from . import consumers
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from meet import consumers

# 0814 2237新增   0817王子將meeting\meet底下的consumers.py，移到\meeting\meeting底下的consumers.py，就可以執行「consumers.SpeechConsumer.as_asgi」
#。是否與環境路徑有關。
websocket_urlpatterns = [
    re_path(r'ws/speech/(?P<meeting_id>\w+)/$', consumers.SpeechConsumer.as_asgi()),
    
]