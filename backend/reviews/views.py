from rest_framework import generics, permissions
from .models import Review
from .serializers import ReviewSerializer, ReviewListSerializer


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]


class WalkerReviewsView(generics.ListAPIView):
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        walker_id = self.kwargs['walker_id']
        return Review.objects.filter(walker_id=walker_id).select_related('owner')
