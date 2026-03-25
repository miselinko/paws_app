from rest_framework import generics, permissions, status as drf_status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Q
from .serializers import (
    RegisterSerializer, UserSerializer, WalkerListSerializer,
    WalkerProfileSerializer, AdminUserListSerializer, AdminUserDetailSerializer,
)
from .permissions import IsAdmin
from .models import PasswordResetToken, EmailVerificationToken, PushToken
import math, threading, urllib.request, json as json_lib


ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


def validate_image_file(file):
    """Returns error string or None."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        return 'Dozvoljeni formati: JPEG, PNG, WebP, GIF.'
    if file.size > MAX_IMAGE_SIZE:
        return 'Slika ne sme biti veća od 5 MB.'
    return None


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'

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


def send_push_notification(users, title, body):
    """Send Expo push notification to a list of users."""
    tokens = list(PushToken.objects.filter(user__in=users).values_list('token', flat=True))
    if not tokens:
        return
    messages = [{'to': t, 'title': title, 'body': body, 'sound': 'default'} for t in tokens]
    payload = json_lib.dumps(messages).encode('utf-8')
    req = urllib.request.Request(
        'https://exp.host/--/api/v2/push/send',
        data=payload,
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST',
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


def send_verification_email(user):
    token = EmailVerificationToken.objects.create(user=user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
    send_mail(
        subject='Potvrdi svoju email adresu — Paws',
        message=f'Zdravo {user.first_name},\n\nKlikni na link da potvrdiš email adresu:\n{verify_url}\n\nLink važi 24 sata.\n\nTim Paws 🐾',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        threading.Thread(target=send_verification_email, args=(user,), daemon=True).start()


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get('token')
        if not token_str:
            return Response({'detail': 'Token nije prosleđen.'}, status=400)
        try:
            token = EmailVerificationToken.objects.select_related('user').get(token=token_str)
        except (EmailVerificationToken.DoesNotExist, ValueError):
            return Response({'detail': 'Nevažeći token.'}, status=400)
        if not token.is_valid():
            return Response({'detail': 'Token je istekao. Zatraži novi.'}, status=400)
        token.user.is_email_verified = True
        token.user.save(update_fields=['is_email_verified'])
        token.used = True
        token.save(update_fields=['used'])
        return Response({'detail': 'Email adresa je potvrđena. Možeš se prijaviti.'})


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Ako nalog postoji, email je poslat.'})
        if user.is_email_verified:
            return Response({'detail': 'Email je već potvrđen.'})
        threading.Thread(target=send_verification_email, args=(user,), daemon=True).start()
        return Response({'detail': 'Verifikacioni email je poslat.'})


class PushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'detail': 'Token je obavezan.'}, status=400)
        PushToken.objects.update_or_create(user=request.user, defaults={'token': token})
        return Response({'detail': 'Token sačuvan.'})


class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class ProfileImageView(APIView):
    """PATCH /api/users/profile/image/ — upload profile photo.
       DELETE /api/users/profile/image/ — remove profile photo."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        image = request.FILES.get('profile_image')
        if not image:
            return Response({'detail': 'No file provided.'}, status=400)
        error = validate_image_file(image)
        if error:
            return Response({'detail': error}, status=400)
        user = request.user
        user.profile_image = image
        user.save(update_fields=['profile_image'])
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    def delete(self, request):
        user = request.user
        user.profile_image = None
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

        if self.request.query_params.get('istaknuti') == 'true':
            qs = qs.filter(walker_profile__is_featured=True)

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
                results.sort(key=lambda w: (not w.walker_profile.is_featured, w.distance))
                return results
            except (ValueError, TypeError):
                pass

        return sorted(qs, key=lambda w: not w.walker_profile.is_featured)


class WalkerDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return User.objects.filter(role=User.WALKER)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

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
    throttle_classes = [PasswordResetThrottle]

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


# ─── Admin views ────────────────────────────────────────────────────

class AdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminDashboardView(APIView):
    """GET /api/users/admin/stats/ — aggregate dashboard numbers."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from reservations.models import Reservation
        from reviews.models import Review
        from dogs.models import Dog

        users = User.objects.all()
        reservations = Reservation.objects.all()

        return Response({
            'total_users': users.count(),
            'owners': users.filter(role='owner').count(),
            'walkers': users.filter(role='walker').count(),
            'admins': users.filter(role='admin').count(),
            'active_users': users.filter(is_active=True).count(),
            'inactive_users': users.filter(is_active=False).count(),
            'total_reservations': reservations.count(),
            'pending_reservations': reservations.filter(status='pending').count(),
            'completed_reservations': reservations.filter(status='completed').count(),
            'cancelled_reservations': reservations.filter(status='cancelled').count(),
            'total_reviews': Review.objects.count(),
            'total_dogs': Dog.objects.count(),
        })


class AdminUserListView(generics.ListAPIView):
    """GET /api/users/admin/users/ — list all users with search & filter."""
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAdmin]
    pagination_class = AdminPagination

    def get_queryset(self):
        qs = User.objects.annotate(
            dogs_count=Count('dogs', distinct=True),
            reservations_count=Count('owner_reservations', distinct=True)
            + Count('walker_reservations', distinct=True),
            reviews_count=Count('given_reviews', distinct=True)
            + Count('received_reviews', distinct=True),
        ).order_by('-created_at')

        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        role = self.request.query_params.get('role')
        if role in ('owner', 'walker', 'admin'):
            qs = qs.filter(role=role)

        is_active = self.request.query_params.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        if self.request.query_params.get('is_featured') == 'true':
            qs = qs.filter(walker_profile__is_featured=True)

        return qs


class AdminUserDetailView(APIView):
    """GET/PATCH/DELETE /api/users/admin/users/<id>/"""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Korisnik nije pronađen.'}, status=404)
        return Response(AdminUserDetailSerializer(user).data)

    def patch(self, request, pk):
        """Toggle is_active (ban/unban)."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Korisnik nije pronađen.'}, status=404)
        if user.role == 'admin':
            return Response({'detail': 'Ne možeš deaktivirati admina.'}, status=400)
        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = is_active
            user.save(update_fields=['is_active'])
        is_featured = request.data.get('is_featured')
        if is_featured is not None and user.role == 'walker':
            from .models import WalkerProfile
            WalkerProfile.objects.filter(user=user).update(is_featured=is_featured)
        return Response(AdminUserDetailSerializer(user).data)

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Korisnik nije pronađen.'}, status=404)
        if user.role == 'admin':
            return Response({'detail': 'Ne možeš obrisati admina.'}, status=400)
        user.delete()
        return Response(status=drf_status.HTTP_204_NO_CONTENT)


class AdminReservationListView(APIView):
    """GET /api/users/admin/reservations/ — all reservations with filter."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from reservations.models import Reservation

        qs = Reservation.objects.select_related('owner', 'walker').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter in ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'):
            qs = qs.filter(status=status_filter)

        service = request.query_params.get('service_type')
        if service in ('walking', 'boarding'):
            qs = qs.filter(service_type=service)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
                | Q(walker__first_name__icontains=search)
                | Q(walker__last_name__icontains=search)
            )

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [
            {
                'id': r.id,
                'owner_name': r.owner.full_name,
                'owner_id': r.owner.id,
                'walker_name': r.walker.full_name,
                'walker_id': r.walker.id,
                'status': r.status,
                'service_type': r.service_type,
                'start_time': r.start_time.isoformat(),
                'end_time': r.end_time.isoformat(),
                'duration': r.duration,
                'notes': r.notes,
                'created_at': r.created_at.isoformat(),
            }
            for r in page
        ]
        return paginator.get_paginated_response(data)


class AdminReviewListView(APIView):
    """GET /api/users/admin/reviews/ — all reviews."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from reviews.models import Review

        qs = Review.objects.select_related('owner', 'walker', 'reservation').order_by('-created_at')

        rating = request.query_params.get('rating')
        if rating and rating.isdigit() and 1 <= int(rating) <= 5:
            qs = qs.filter(rating=int(rating))

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
                | Q(walker__first_name__icontains=search)
                | Q(walker__last_name__icontains=search)
            )

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [
            {
                'id': r.id,
                'owner_name': r.owner.full_name,
                'owner_id': r.owner.id,
                'walker_name': r.walker.full_name,
                'walker_id': r.walker.id,
                'rating': r.rating,
                'comment': r.comment,
                'created_at': r.created_at.isoformat(),
            }
            for r in page
        ]
        return paginator.get_paginated_response(data)


class AdminDogListView(APIView):
    """GET /api/users/admin/dogs/ — all dogs."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from dogs.models import Dog

        qs = Dog.objects.select_related('owner').order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(breed__icontains=search)
                | Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
            )

        size = request.query_params.get('size')
        if size in ('small', 'medium', 'large'):
            qs = qs.filter(size=size)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [
            {
                'id': d.id,
                'name': d.name,
                'breed': d.breed,
                'age': d.age,
                'size': d.size,
                'gender': d.gender,
                'owner_name': d.owner.full_name,
                'owner_id': d.owner.id,
                'image': d.image.url if d.image else None,
                'created_at': d.created_at.isoformat(),
            }
            for d in page
        ]
        return paginator.get_paginated_response(data)


