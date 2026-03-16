from django.urls import path
from .views import DogListCreateView, DogDetailView

urlpatterns = [
    path('', DogListCreateView.as_view(), name='dog-list'),
    path('<int:pk>/', DogDetailView.as_view(), name='dog-detail'),
]
