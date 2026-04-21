from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Task, SubTask, TaskImage
from .serializers import TaskSerializer, SubTaskSerializer, UserSerializer
# Create your views here.
#User registration
class UserRegistrationViewSet(viewsets.GenericViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

#Task CRUD CBV
class TaskListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request): # List
        tasks = Task.objects.filter(owner=request.user)
        return Response(TaskSerializer(tasks, many=True).data)

    def post(self, request): # Create
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class TaskDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        return Task.objects.filter(pk=pk, owner=user).first()

    def get(self, request, pk): # Retrieve
        task = self.get_object(pk, request.user)
        if not task: return Response(status=404)
        return Response(TaskSerializer(task).data)

    def patch(self, request, pk): # Update
        task = self.get_object(pk, request.user)
        if not task: return Response(status=404)
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk): # Delete
        task = self.get_object(pk, request.user)
        if not task: return Response(status=404)
        task.delete()
        return Response(status=204)


class TaskImageUploadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        task = Task.objects.filter(pk=pk, owner=request.user).first()
        if not task:
            return Response({"detail": "Task not found."}, status=404)

        image_file = request.FILES.get('image') or request.FILES.get('file')
        if not image_file:
            return Response({"detail": "Image file is required (field: image or file)."}, status=400)

        content_type = image_file.content_type or ''
        if not content_type.startswith('image/'):
            return Response({"detail": "Only image files are allowed."}, status=400)

        payload = image_file.read()
        if not payload:
            return Response({"detail": "Uploaded file is empty."}, status=400)

        TaskImage.objects.create(
            payload=payload,
            content_type=content_type[:50],
            task=task
        )

        return Response(TaskSerializer(task).data, status=201)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def subtask_list_create_fbv(request):
    if request.method == 'GET':
        subtasks = SubTask.objects.filter(task__owner=request.user)
        return Response(SubTaskSerializer(subtasks, many=True).data)

    elif request.method == 'POST':
        serializer = SubTaskSerializer(data=request.data)
        if serializer.is_valid():
            # Проверка владения задачей перед сохранением
            task_id = serializer.validated_data['task_id']  # Берем из валидированных данных
            if not Task.objects.filter(id=task_id, owner=request.user).exists():
                return Response({"detail": "You do not own this task."}, status=403)

            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

#SubTask CRUD FBV
@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def subtask_detail_fbv(request, pk):
    subtask = SubTask.objects.filter(pk=pk, task__owner=request.user).first()
    if not subtask: return Response(status=404)

    if request.method == 'GET':
        return Response(SubTaskSerializer(subtask).data)

    elif request.method == 'PATCH':
        serializer = SubTaskSerializer(subtask, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    elif request.method == 'DELETE':
        subtask.delete()
        return Response(status=204)

#Logout CBV
class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response({"message": "Successfully logged out."}, status=status.HTTP_204_NO_CONTENT)