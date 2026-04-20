from django.db import models
from django.contrib.auth.models import AbstractUser

class TaskManager(models.Manager):
    def get_completed(self):
        return self.filter(status='completed')

class User(AbstractUser):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

class Task(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    objects = TaskManager()

class SubTask(models.Model): #[One to Many] to Task
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    description = models.TextField()
    status = models.CharField(max_length=20, default='pending')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='subtasks')


class TaskImage(models.Model):
    payload = models.BinaryField()
    content_type = models.CharField(max_length=50, default='image/jpeg')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='images')