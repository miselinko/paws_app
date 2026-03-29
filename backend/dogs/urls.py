from django.urls import path
from .views import DogListCreateView, DogDetailView, DogProfileView, DogImageView

urlpatterns = [
    path('', DogListCreateView.as_view(), name='dog-list'),
    path('<int:pk>/', DogDetailView.as_view(), name='dog-detail'),
    path('<int:pk>/profile/', DogProfileView.as_view(), name='dog-profile'),
    path('<int:pk>/image/', DogImageView.as_view(), name='dog-image'),
]
