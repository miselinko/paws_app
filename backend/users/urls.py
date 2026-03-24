from django.urls import path
from .views import (
    RegisterView, MyProfileView, ProfileImageView, WalkerProfileUpdateView,
    WalkerListView, WalkerDetailView, ForgotPasswordView, ResetPasswordView,
    DeleteAccountView, AdminDashboardView, AdminUserListView, AdminUserDetailView,
    AdminReservationListView, AdminReviewListView, AdminDogListView,
)

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
    # Admin
    path('admin/stats/', AdminDashboardView.as_view(), name='admin-stats'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/reservations/', AdminReservationListView.as_view(), name='admin-reservations'),
    path('admin/reviews/', AdminReviewListView.as_view(), name='admin-reviews'),
    path('admin/dogs/', AdminDogListView.as_view(), name='admin-dogs'),
]
