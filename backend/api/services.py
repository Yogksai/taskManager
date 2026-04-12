from django.db import transaction
from .models import Task, TaskImage

class TaskService:
    @staticmethod
    @transaction.atomic
    def create_task_with_image(user, description, image_file=None):
        task = Task.objects.create(owner=user, description=description)
        if image_file:
            TaskImage.objects.create(
                task=task,
                payload=image_file.read(),
                content_type=image_file.content_type
            )
        task.refresh_from_db()
        return task