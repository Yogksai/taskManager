from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken import views as auth_views
from .views import *

urlpatterns = [
    #Registration (ViewSet as_view)
    path('register/', UserRegistrationViewSet.as_view({'post': 'create'})),

    #Login-Logout
    path('login/', auth_views.obtain_auth_token),
    path('logout/', LogoutAPIView.as_view()),

    #Tasks
    path('tasks/', TaskListCreateAPIView.as_view()),
    path('tasks/<int:pk>/', TaskDetailAPIView.as_view()),

    #SubTasks
    path('subtasks/', subtask_list_create_fbv),
    path('subtasks/<int:pk>/', subtask_detail_fbv),
]