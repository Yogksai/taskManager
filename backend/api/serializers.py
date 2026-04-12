import base64
from rest_framework import serializers
from .models import User, Task, SubTask, TaskImage


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'created_at']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def create(self, validated_data):
        # password hash
        return User.objects.create_user(**validated_data)


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ['id', 'description', 'status', 'task']


class TaskImageSerializer(serializers.ModelSerializer):
    image_base64 = serializers.SerializerMethodField()

    class Meta:
        model = TaskImage
        fields = ['id', 'image_base64', 'task']

    def get_image_base64(self, obj):
        if obj.payload:
            return base64.b64encode(obj.payload).decode('utf-8')
        return None


class TaskSerializer(serializers.ModelSerializer):
    subtasks = SubTaskSerializer(many=True, read_only=True)
    images = TaskImageSerializer(many=True, read_only=True)

    owner_name = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Task
        fields = [
            'id',
            'description',
            'status',
            'created_at',
            'owner',
            'owner_name',
            'subtasks',
            'images'
        ]
        read_only_fields = ['owner', 'created_at']