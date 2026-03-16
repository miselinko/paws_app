from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, WalkerListSerializer, WalkerProfileSerializer
import math

def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class ProfileImageView(APIView):
    """PATCH /api/users/profile/image/ — upload profile photo."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        image = request.FILES.get('profile_image')
        if not image:
            return Response({'detail': 'No file provided.'}, status=400)
        user = request.user
        user.profile_image = image
        user.save(update_fields=['profile_image'])
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)


class WalkerProfileUpdateView(generics.UpdateAPIView):
    serializer_class = WalkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.walker_profile

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)


class WalkerListView(generics.ListAPIView):
    serializer_class = WalkerListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = User.objects.filter(
            role=User.WALKER,
            walker_profile__active=True
        ).select_related('walker_profile').prefetch_related('received_reviews')

        service = self.request.query_params.get('usluga')
        if service:
            qs = qs.filter(walker_profile__services__in=[service, 'both'])

        max_rate = self.request.query_params.get('cena_max')
        if max_rate:
            qs = qs.filter(walker_profile__hourly_rate__lte=max_rate)

        # Distance filter: ?lat=44.8&lng=20.4&radius=10 (km)
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius', '10')

        if lat and lng:
            try:
                lat_f, lng_f, radius_f = float(lat), float(lng), float(radius)
                results = []
                for w in qs:
                    if w.lat and w.lng:
                        d = haversine(lat_f, lng_f, float(w.lat), float(w.lng))
                        if d <= radius_f:
                            w.distance = round(d, 1)
                            results.append(w)
                results.sort(key=lambda w: w.distance)
                return results
            except (ValueError, TypeError):
                pass

        return qs


class WalkerDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return User.objects.filter(role=User.WALKER)
