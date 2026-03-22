from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
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


class DogImageView(APIView):
    """DELETE /api/dogs/{id}/image/ — remove dog photo."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            dog = Dog.objects.get(pk=pk, owner=request.user)
        except Dog.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        dog.image = None
        dog.save(update_fields=['image'])
        return Response(DogSerializer(dog, context={'request': request}).data)
