from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
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


class DogProfileView(generics.RetrieveAPIView):
    """Read-only dog profile visible to the owner or a walker who has a reservation with this dog."""
    serializer_class = DogSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Dog.objects.all()

    def get_object(self):
        dog = super().get_object()
        user = self.request.user
        if dog.owner_id == user.id:
            return dog
        if user.role == 'walker' and dog.reservations.filter(walker=user).exists():
            return dog
        raise PermissionDenied('Nemate pristup profilu ovog psa.')


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
