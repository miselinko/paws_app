from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from .serializers import RegisterSerializer, UserSerializer, WalkerListSerializer, WalkerProfileSerializer
from .models import PasswordResetToken
import math, threading


class WalkerPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

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
    pagination_class = WalkerPagination

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


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = User.objects.get(email=email)
            PasswordResetToken.objects.filter(user=user).delete()
            token = PasswordResetToken.objects.create(user=user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_url = f"{frontend_url}/reset-password?token={token.token}"
            subject = '🔑 Resetovanje lozinke – Paws'
            body = (
                f"Zdravo {user.first_name},\n\n"
                f"Primili smo zahtev za resetovanje lozinke na tvom Paws nalogu.\n\n"
                f"Klikni na link ispod da postaviš novu lozinku (važi 1 sat):\n{reset_url}\n\n"
                f"Ako nisi ti tražio/la reset, ignoriši ovaj email.\n\nPaws tim 🐾"
            )
            threading.Thread(
                target=send_mail,
                args=(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email]),
                kwargs={'fail_silently': True},
                daemon=True,
            ).start()
        except User.DoesNotExist:
            pass
        return Response({'detail': 'Ako email postoji u sistemu, poslaćemo ti link za resetovanje.'})


class DeleteAccountView(APIView):
    """DELETE /api/users/profile/delete/ — permanently delete the account."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({'detail': 'Nalog je obrisan.'}, status=204)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        password = request.data.get('password', '')

        try:
            token = PasswordResetToken.objects.get(token=token_str)
        except (PasswordResetToken.DoesNotExist, Exception):
            return Response({'detail': 'Nevažeći ili istekao link.'}, status=400)

        if not token.is_valid():
            return Response({'detail': 'Link je istekao. Zatraži novi reset lozinke.'}, status=400)

        if len(password) < 8:
            return Response({'detail': 'Lozinka mora imati najmanje 8 karaktera.'}, status=400)

        token.user.set_password(password)
        token.user.save()
        token.used = True
        token.save()
        return Response({'detail': 'Lozinka je uspešno promenjena. Možeš se prijaviti.'})
