from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken import views as auth_views
from .views import TaskViewSet, SubTaskViewSet, UserRegistrationViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'subtasks', SubTaskViewSet, basename='subtask')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', UserRegistrationViewSet.as_view({'post': 'create'})),
    path('login/', auth_views.obtain_auth_token),
]