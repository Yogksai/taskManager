import base64
from rest_framework import serializers
from .models import User, Task, SubTask


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

class SubTaskSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    description = serializers.CharField()
    status = serializers.CharField(max_length=20, default='new')
    task_id = serializers.IntegerField(write_only=True)  # Заменили source на прямой ID

    def create(self, validated_data):
        return SubTask.objects.create(
            task_id=validated_data.pop('task_id'),
            **validated_data
        )
    def update(self, instance, validated_data):
        instance.description = validated_data.get('description', instance.description)
        instance.status = validated_data.get('status', instance.status)
        instance.save()
        return instance

class TaskImageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    image_base64 = serializers.SerializerMethodField()

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

