from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Task, SubTask
from .serializers import TaskSerializer, SubTaskSerializer, UserSerializer
from .services import TaskService


class TaskViewSet(viewsets.ModelViewSet):
    """
    Task GET, POST, DELETE
    """
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(owner=self.request.user).prefetch_related('subtasks', 'images')

    def perform_create(self, serializer):
        image = self.request.FILES.get('image')

        TaskService.create_task_with_image(
            user=self.request.user,
            description=serializer.validated_data['description'],
            image_file=image
        )


class SubTaskViewSet(viewsets.ModelViewSet):
    queryset = SubTask.objects.all()
    serializer_class = SubTaskSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserRegistrationViewSet(viewsets.GenericViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
