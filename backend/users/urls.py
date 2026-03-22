from django.urls import path
from .views import RegisterView, MyProfileView, ProfileImageView, WalkerProfileUpdateView, WalkerListView, WalkerDetailView, ForgotPasswordView, ResetPasswordView, DeleteAccountView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', MyProfileView.as_view(), name='my-profile'),
    path('profile/delete/', DeleteAccountView.as_view(), name='delete-account'),
    path('profile/image/', ProfileImageView.as_view(), name='profile-image'),
    path('profile/walker/', WalkerProfileUpdateView.as_view(), name='walker-profile'),
    path('walkers/', WalkerListView.as_view(), name='walker-list'),
    path('walkers/<int:pk>/', WalkerDetailView.as_view(), name='walker-detail'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]
