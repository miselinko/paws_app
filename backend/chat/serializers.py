from rest_framework import serializers
from .models import Message
from django.contrib.auth import get_user_model

User = get_user_model()


class SenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'profile_image', 'role']


class MessageSerializer(serializers.ModelSerializer):
    sender = SenderSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'created_at', 'read']
        read_only_fields = ['id', 'sender', 'created_at']


class ConversationSerializer(serializers.Serializer):
    user = SenderSerializer()
    last_message = serializers.CharField()
    time = serializers.DateTimeField()
    unread = serializers.IntegerField()
