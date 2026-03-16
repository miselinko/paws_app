from rest_framework import generics, permissions
from .models import Dog
from .serializers import DogSerializer


class DogListCreateView(generics.ListCreateAPIView):
    serializer_class = DogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Dog.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class DogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Dog.objects.filter(owner=self.request.user)
