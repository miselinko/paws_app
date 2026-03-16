from django.urls import path
from .views import ConversationView, ConversationsListView, UnreadCountView

urlpatterns = [
    path('', ConversationsListView.as_view(), name='conversations'),
    path('unread/', UnreadCountView.as_view(), name='unread'),
    path('<int:user_id>/', ConversationView.as_view(), name='conversation'),
]
