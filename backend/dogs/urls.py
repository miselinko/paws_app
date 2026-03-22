from django.urls import path
from .views import DogListCreateView, DogDetailView, DogImageView

urlpatterns = [
    path('', DogListCreateView.as_view(), name='dog-list'),
    path('<int:pk>/', DogDetailView.as_view(), name='dog-detail'),
    path('<int:pk>/image/', DogImageView.as_view(), name='dog-image'),
]
