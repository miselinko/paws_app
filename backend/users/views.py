from rest_framework import generics, permissions, status as drf_status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from config.throttling import AnonRateThrottle
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Avg, Count, Q
from .serializers import (
    RegisterSerializer, UserSerializer, WalkerListSerializer,
    WalkerProfileSerializer, AdminUserListSerializer, AdminUserDetailSerializer,
)
from .permissions import IsAdmin
from .models import PasswordResetToken, EmailVerificationToken, PushToken, AuditLog, Favorite
from .antispam import verify_turnstile, client_ip, HONEYPOT_FIELD
from .visibility import visible_walkers
import logging
import math, threading, urllib.request, urllib.error, json as json_lib

logger = logging.getLogger(__name__)


def run_in_background(target, *args, **kwargs):
    """Email/push u pozadinskoj niti; u testovima sinhrono (izolovana baza, bez zaključavanja)."""
    if getattr(settings, 'RUNNING_TESTS', False):
        return target(*args, **kwargs)
    threading.Thread(target=target, args=args, kwargs=kwargs, daemon=True).start()


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


class RegisterThrottle(AnonRateThrottle):
    scope = 'register'


class RegisterDailyThrottle(AnonRateThrottle):
    scope = 'register_daily'


class ResendVerificationThrottle(AnonRateThrottle):
    scope = 'resend_verification'

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
    messages = [{
        'to': t,
        'title': title,
        'body': body,
        'sound': 'default',
        'priority': 'high',
        'channelId': 'default',
    } for t in tokens]
    payload = json_lib.dumps(messages).encode('utf-8')
    req = urllib.request.Request(
        'https://exp.host/--/api/v2/push/send',
        data=payload,
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST',
    )
    try:
        resp = urllib.request.urlopen(req, timeout=5)
        resp_body = resp.read().decode('utf-8')
        logger.info('Push notification sent to %d token(s): %s', len(tokens), resp_body[:200])
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        logger.warning('Push notification failed: %s', e)
    except Exception as e:
        logger.error('Unexpected push notification error: %s', e)


def _safe_send_mail(*args, **kwargs):
    """Wrapper for send_mail that logs errors instead of silently failing."""
    try:
        send_mail(*args, **kwargs)
    except Exception as e:
        logger.error('Failed to send email: %s', e)


def send_verification_email(user):
    token = EmailVerificationToken.objects.create(user=user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
    _safe_send_mail(
        subject='Potvrdi svoju email adresu — Paws',
        message=f'Zdravo {user.first_name},\n\nKlikni na link da potvrdiš email adresu:\n{verify_url}\n\nLink važi 24 sata.\n\nTim Paws 🐾',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle, RegisterDailyThrottle]

    def create(self, request, *args, **kwargs):
        ip = client_ip(request)
        # Honeypot: pravi korisnik ne vidi ovo polje.
        if str(request.data.get(HONEYPOT_FIELD, '')).strip():
            logger.warning('Registration honeypot triggered from %s', ip)
            return Response({'detail': 'Registracija nije uspela. Pokušaj ponovo.'}, status=400)
        ok, reason = verify_turnstile(request.data.get('captcha_token', ''), ip)
        if not ok:
            logger.warning('Registration CAPTCHA failed (%s) from %s', reason, ip)
            return Response({'detail': 'Potvrdi da nisi robot (CAPTCHA) i pokušaj ponovo.', 'code': 'captcha'}, status=400)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = serializer.save()
        run_in_background(send_verification_email, user)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get('token')
        if not token_str:
            return Response({'detail': 'Token nije prosleđen.'}, status=400)
        try:
            with transaction.atomic():
                token = EmailVerificationToken.objects.select_for_update().select_related('user').get(token=token_str)
                if not token.is_valid():
                    return Response({'detail': 'Token je istekao. Zatraži novi.'}, status=400)
                token.user.is_email_verified = True
                token.user.save(update_fields=['is_email_verified'])
                token.used = True
                token.save(update_fields=['used'])
        except (EmailVerificationToken.DoesNotExist, ValueError):
            return Response({'detail': 'Nevažeći token.'}, status=400)
        logger.info('Email verified for user %s', token.user.email)
        return Response({'detail': 'Email adresa je potvrđena. Možeš se prijaviti.'})


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Ako nalog postoji, email je poslat.'})
        if user.is_email_verified or not user.is_active:
            return Response({'detail': 'Ako nalog postoji, email je poslat.'})
        # Stari, neiskorišćeni tokeni se poništavaju da u opticaju bude samo jedan link.
        EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
        run_in_background(send_verification_email, user)
        return Response({'detail': 'Ako nalog postoji, email je poslat.'})


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
        qs = visible_walkers(User.objects.all()).filter(
            walker_profile__active=True
        ).select_related('walker_profile').prefetch_related('received_reviews').annotate(
            avg_rating=Avg('received_reviews__rating'),
            review_count=Count('received_reviews'),
        )

        # Pre-fetch favorites for logged-in user
        fav_ids = set()
        if self.request.user.is_authenticated:
            fav_ids = set(
                Favorite.objects.filter(user=self.request.user).values_list('walker_id', flat=True)
            )

        # Name / address search: ?search=marko
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(address__icontains=search)
            )

        service = self.request.query_params.get('usluga')
        if service:
            qs = qs.filter(walker_profile__services__in=[service, 'both'])

        max_rate = self.request.query_params.get('cena_max')
        if max_rate:
            if service == 'boarding':
                qs = qs.filter(walker_profile__daily_rate__lte=max_rate)
            else:
                qs = qs.filter(
                    Q(walker_profile__hourly_rate__lte=max_rate) |
                    Q(walker_profile__hourly_rate__isnull=True, walker_profile__daily_rate__lte=max_rate)
                )

        # Min rating: ?min_rating=4
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            try:
                qs = qs.filter(avg_rating__gte=float(min_rating))
            except (ValueError, TypeError):
                pass

        if self.request.query_params.get('istaknuti') == 'true':
            qs = qs.filter(walker_profile__is_featured=True)

        # Ordering: ?ordering=rating|price_asc|price_desc
        ordering = self.request.query_params.get('ordering', 'rating')

        # Distance filter: ?lat=44.8&lng=20.4&radius=10 (km)
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius', '10')

        def sort_key(w):
            featured = not w.walker_profile.is_featured  # featured first
            if ordering == 'price_asc':
                rate = w.walker_profile.hourly_rate or w.walker_profile.daily_rate or 9999
                return (featured, float(rate))
            elif ordering == 'price_desc':
                rate = w.walker_profile.hourly_rate or w.walker_profile.daily_rate or 0
                return (featured, -float(rate))
            else:  # rating (default)
                return (featured, -(w.avg_rating or 0))

        if lat and lng:
            try:
                lat_f, lng_f, radius_f = float(lat), float(lng), float(radius)
                results = []
                for w in qs:
                    w._is_favorited = w.id in fav_ids
                    if w.lat and w.lng:
                        d = haversine(lat_f, lng_f, float(w.lat), float(w.lng))
                        if d <= radius_f:
                            w.distance = round(d, 1)
                            results.append(w)
                results.sort(key=lambda w: (not w.walker_profile.is_featured, w.distance))
                self._distance_results = results
                self._fav_ids = fav_ids
                return results
            except (ValueError, TypeError):
                pass

        walkers = list(qs)
        for w in walkers:
            w._is_favorited = w.id in fav_ids
        return sorted(walkers, key=sort_key)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # If distance filter returned a Python list, paginate manually
        if isinstance(queryset, list):
            try:
                page = int(request.query_params.get('page', 1))
            except (ValueError, TypeError):
                page = 1
            try:
                page_size = min(int(request.query_params.get('page_size', 20)), 100)
            except (ValueError, TypeError):
                page_size = 20
            total = len(queryset)
            start = (page - 1) * page_size
            end = start + page_size
            page_items = queryset[start:end]
            serializer = self.get_serializer(page_items, many=True)
            return Response({
                'count': total,
                'next': None if end >= total else f'?page={page + 1}&page_size={page_size}',
                'previous': None if page <= 1 else f'?page={page - 1}&page_size={page_size}',
                'results': serializer.data,
            })
        return super().list(request, *args, **kwargs)


class WalkerDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = User.objects.filter(role=User.WALKER)
        user = self.request.user
        if user.is_authenticated and user.role == User.ADMIN:
            return qs
        visible = visible_walkers(qs)
        if user.is_authenticated and user.role == User.WALKER:
            # Šetač uvek vidi svoj profil, i pre potvrde emaila.
            return qs.filter(Q(pk__in=visible.values('pk')) | Q(pk=user.pk))
        return visible


class ToggleFavoriteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, walker_id):
        try:
            walker = visible_walkers(User.objects.all()).get(pk=walker_id)
        except User.DoesNotExist:
            return Response({'detail': 'Walker not found.'}, status=drf_status.HTTP_404_NOT_FOUND)
        fav, created = Favorite.objects.get_or_create(user=request.user, walker=walker)
        if not created:
            fav.delete()
            return Response({'is_favorited': False})
        return Response({'is_favorited': True}, status=drf_status.HTTP_201_CREATED)


class FavoritesListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        fav_ids = list(
            Favorite.objects.filter(user=request.user, walker__is_active=True).values_list('walker_id', flat=True)
        )
        return Response(fav_ids)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = User.objects.get(email=email, is_active=True)
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
            run_in_background(_safe_send_mail, subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], **{'fail_silently': True})
            logger.info('Password reset requested for %s', email)
        except User.DoesNotExist:
            pass
        return Response({'detail': 'Ako email postoji u sistemu, poslaćemo ti link za resetovanje.'})


class DeleteAccountView(APIView):
    """DELETE /api/users/profile/delete/ — deactivate (soft-delete) the account."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'detail': 'Nalog je deaktiviran.'}, status=204)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        password = request.data.get('password', '')

        if len(password) < 8:
            return Response({'detail': 'Lozinka mora imati najmanje 8 karaktera.'}, status=400)

        try:
            with transaction.atomic():
                token = PasswordResetToken.objects.select_for_update().select_related('user').get(token=token_str)
                if not token.is_valid() or not token.user.is_active:
                    return Response({'detail': 'Link je istekao. Zatraži novi reset lozinke.'}, status=400)
                try:
                    validate_password(password, user=token.user)
                except DjangoValidationError as e:
                    return Response({'detail': ' '.join(e.messages)}, status=400)
                token.user.set_password(password)
                token.user.save(update_fields=['password'])
                token.used = True
                token.save(update_fields=['used'])
        except (PasswordResetToken.DoesNotExist, ValueError):
            return Response({'detail': 'Nevažeći ili istekao link.'}, status=400)

        logger.info('Password reset completed for user %s', token.user.email)
        return Response({'detail': 'Lozinka je uspešno promenjena. Možeš se prijaviti.'})


# ─── Admin views ────────────────────────────────────────────────────

def _parse_bool(value):
    """JSON true/false ili string 'true'/'false' -> bool; ostalo -> None."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.lower() in ('true', 'false', '1', '0'):
        return value.lower() in ('true', '1')
    return None


def is_protected_admin(user):
    return user.email.lower() in settings.PROTECTED_ADMIN_EMAILS

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
            'in_progress_reservations': reservations.filter(status='in_progress').count(),
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
        """Deaktivacija/aktivacija naloga (is_active) i/ili isticanje šetača (is_featured)."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Korisnik nije pronađen.'}, status=404)
        is_active = _parse_bool(request.data.get('is_active'))
        is_featured = _parse_bool(request.data.get('is_featured'))
        if is_active is not None:
            if user.role == User.ADMIN or is_protected_admin(user) or user.pk == request.user.pk:
                return Response({'detail': 'Administratorski nalog ne može da se deaktivira.'}, status=400)
            if user.is_active != is_active:
                user.is_active = is_active
                user.save(update_fields=['is_active'])
                action = AuditLog.ACTION_UNBAN if is_active else AuditLog.ACTION_BAN
                AuditLog.objects.create(admin=request.user, target_user=user, action=action)
        if is_featured is not None and user.role == User.WALKER:
            from .models import WalkerProfile
            WalkerProfile.objects.filter(user=user).update(is_featured=is_featured)
            action = AuditLog.ACTION_FEATURE if is_featured else AuditLog.ACTION_UNFEATURE
            AuditLog.objects.create(admin=request.user, target_user=user, action=action)
        user.refresh_from_db()
        return Response(AdminUserDetailSerializer(user).data)

    def delete(self, request, pk):
        """Bez parametra: DEAKTIVACIJA (reverzibilno, podaci ostaju).
        ?permanent=true + {"confirm_email": "<email korisnika>"}: TRAJNO BRISANJE
        (samo superuser; nalog i povezani podaci se brišu i ne mogu da se vrate)."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Korisnik nije pronađen.'}, status=404)
        if user.role == User.ADMIN or is_protected_admin(user) or user.pk == request.user.pk:
            return Response({'detail': 'Administratorski nalog ne može da se deaktivira ni obriše.'}, status=400)

        permanent = str(request.query_params.get('permanent', '')).lower() in ('1', 'true', 'yes')
        if not permanent:
            if user.is_active:
                user.is_active = False
                user.save(update_fields=['is_active'])
                AuditLog.objects.create(admin=request.user, target_user=user, action=AuditLog.ACTION_BAN,
                                        note='Deaktiviran preko admin panela')
            return Response(status=drf_status.HTTP_204_NO_CONTENT)

        if not request.user.is_superuser:
            return Response({'detail': 'Trajno brisanje može da uradi samo glavni administrator.'}, status=403)
        confirm = str(request.data.get('confirm_email', '')).strip().lower()
        if confirm != user.email.lower():
            return Response({'detail': 'Za trajno brisanje upiši tačnu email adresu korisnika.', 'code': 'confirm'}, status=400)
        email = user.email
        AuditLog.objects.create(admin=request.user, target_user=user, action=AuditLog.ACTION_DELETE,
                                note=f'Trajno obrisan nalog {email} (id {user.pk})')
        user.delete()
        logger.warning('Admin %s permanently deleted user %s', request.user.email, email)
        return Response(status=drf_status.HTTP_204_NO_CONTENT)


class AdminReservationListView(APIView):
    """GET /api/users/admin/reservations/ — all reservations with filter."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from reservations.models import Reservation

        qs = Reservation.objects.select_related('owner', 'walker').order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'):
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


