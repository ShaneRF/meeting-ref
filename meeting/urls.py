"""
URL configuration for meeting project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from line_bot.views import callback, sendMsg
from login.views import login, index
from meet.views import list, add, edit, senddata, chatroom
from employee.views import list as list_emp, add as add_emp, edit as edit_emp, senddata as senddata_emp
from meet import views

urlpatterns = [
    path('', login),
    path('login', login),
    path('index', index),
    path('meeting/list', list),
    path('meeting/add', add),
    path('meeting/edit/<str:uid>', edit),
    path('meeting/senddata', senddata),
    path('meeting/chatroom', chatroom),
    path('employee/list', list_emp),
    path('employee/add', add_emp),
    path('employee/edit/<str:uid>', edit_emp),
    path('employee/senddata', senddata_emp),
    path("admin/", admin.site.urls),
    path('line/', callback),
    path('line/push/<str:uid>/<str:msg>', sendMsg),
    path('meeting/chatroom/<int:meeting_id>/', views.chatroom, name='chatroom'),
    #path('meeting/process-audio/', views.process_audio, name='process_audio'),
    path('process_audio/', views.process_audio, name='process_audio'),
    #path('transcribe/', views.transcribe_audio, name='transcribe_audio'),
    path('ws/speech/<int:meeting_id>/', views.chatroom, name='speech_websocket'),
]
