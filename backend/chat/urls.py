from django.urls import path
from .views import ConversationView, ConversationsListView, UnreadCountView, BotChatView

urlpatterns = [
    path('', ConversationsListView.as_view(), name='conversations'),
    path('unread/', UnreadCountView.as_view(), name='unread'),
    path('bot/', BotChatView.as_view(), name='bot-chat'),
    path('<int:user_id>/', ConversationView.as_view(), name='conversation'),
]
