from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q, Max
from .models import Message
from .serializers import MessageSerializer, ConversationSerializer

User = get_user_model()


class ConversationView(APIView):
    """GET messages with a user, POST send a message."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            other = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        messages = Message.objects.filter(
            Q(sender=request.user, recipient=other) |
            Q(sender=other, recipient=request.user)
        ).select_related('sender')

        # Mark incoming as read
        messages.filter(recipient=request.user, read=False).update(read=True)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, user_id):
        try:
            recipient = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        text = request.data.get('text', '').strip()
        if not text:
            return Response({'detail': 'Message cannot be empty.'}, status=400)

        message = Message.objects.create(
            sender=request.user,
            recipient=recipient,
            text=text,
        )
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=201)


class ConversationsListView(APIView):
    """List all conversations for current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # All users this user has exchanged messages with
        sent = Message.objects.filter(sender=user).values_list('recipient_id', flat=True)
        received = Message.objects.filter(recipient=user).values_list('sender_id', flat=True)
        user_ids = set(list(sent) + list(received))

        result = []
        for uid in user_ids:
            try:
                other = User.objects.get(pk=uid)
            except User.DoesNotExist:
                continue

            messages = Message.objects.filter(
                Q(sender=user, recipient=other) |
                Q(sender=other, recipient=user)
            ).order_by('-created_at')

            if not messages.exists():
                continue

            last = messages.first()
            unread = messages.filter(recipient=user, read=False).count()

            result.append({
                'user': other,
                'last_message': last.text,
                'time': last.created_at,
                'unread': unread,
            })

        result.sort(key=lambda x: x['time'], reverse=True)
        serializer = ConversationSerializer(result, many=True)
        return Response(serializer.data)


class UnreadCountView(APIView):
    """Count of unread messages."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(recipient=request.user, read=False).count()
        return Response({'count': count})
