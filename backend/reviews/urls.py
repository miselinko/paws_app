from django.urls import path
from .views import ReviewCreateView, WalkerReviewsView

urlpatterns = [
    path('', ReviewCreateView.as_view(), name='review-create'),
    path('walker/<int:walker_id>/', WalkerReviewsView.as_view(), name='walker-reviews'),
]
