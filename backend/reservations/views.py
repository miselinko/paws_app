from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from decimal import Decimal, InvalidOperation
import logging
import threading
from .models import Reservation
from .serializers import ReservationSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


def _safe_send_mail(*args, **kwargs):
    try:
        send_mail(*args, **kwargs)
    except Exception as e:
        logger.error('Failed to send email: %s', e)


def send_reservation_email(reservation, new_status):
    owner = reservation.owner
    walker = reservation.walker
    date_str = reservation.start_time.strftime('%d.%m.%Y')
    time_str = f"{reservation.start_time.strftime('%H:%M')} – {reservation.end_time.strftime('%H:%M')}"
    service = 'šetanje' if reservation.service_type == 'walking' else 'čuvanje'

    if new_status == Reservation.CONFIRMED:
        subject = '✅ Rezervacija prihvaćena – Paws'
        body = (
            f"Zdravo {owner.first_name},\n\n"
            f"Tvoja rezervacija je prihvaćena!\n\n"
            f"Šetač: {walker.first_name} {walker.last_name}\n"
            f"Usluga: {service}\n"
            f"Datum: {date_str}\n"
            f"Vreme: {time_str}\n\n"
            f"Vidimo se na šetnji! 🐾\n\nPaws tim"
        )
        recipients = [owner.email]
    elif new_status == Reservation.REJECTED:
        subject = '❌ Rezervacija odbijena – Paws'
        body = (
            f"Zdravo {owner.first_name},\n\n"
            f"Nažalost, šetač {walker.first_name} {walker.last_name} nije mogao da prihvati tvoju rezervaciju "
            f"za {service} dana {date_str} u {time_str}.\n\n"
            f"Možeš potražiti drugog šetača na platformi.\n\nPaws tim"
        )
        recipients = [owner.email]
    else:
        return

    threading.Thread(
        target=_safe_send_mail,
        args=(subject, body, settings.DEFAULT_FROM_EMAIL, recipients),
        kwargs={'fail_silently': True},
        daemon=True,
    ).start()


def send_new_reservation_email(reservation):
    owner = reservation.owner
    walker = reservation.walker
    date_str = reservation.start_time.strftime('%d.%m.%Y')
    time_str = f"{reservation.start_time.strftime('%H:%M')} – {reservation.end_time.strftime('%H:%M')}"
    service = 'Šetanje' if reservation.service_type == 'walking' else 'Čuvanje'

    dog_lines = []
    for d in reservation.dogs.all():
        size_map = {'small': 'mali', 'medium': 'srednji', 'large': 'veliki'}
        line = f"  • {d.name} ({d.breed}, {size_map.get(d.size, d.size)})"
        dog_lines.append(line)
    dogs_section = '\n'.join(dog_lines)

    subject = '🐾 Nova rezervacija – Paws'
    body = (
        f"Zdravo {walker.first_name},\n\n"
        f"Stigla ti je nova rezervacija!\n\n"
        f"{'='*40}\n"
        f"DETALJI REZERVACIJE\n"
        f"{'='*40}\n"
        f"Usluga:  {service}\n"
        f"Datum:   {date_str}\n"
        f"Vreme:   {time_str}\n\n"
        f"VLASNIK: {owner.first_name} {owner.last_name}\n\n"
        f"PAS/PSI\n"
        f"{dogs_section}\n\n"
    )

    if reservation.notes:
        body += f"NAPOMENA VLASNIKA\n{reservation.notes}\n\n"

    body += "Prijavi se na Paws platformu za kontakt podatke vlasnika i da prihvatiš ili odbiješ rezervaciju.\n\nPaws tim 🐾"

    threading.Thread(
        target=_safe_send_mail,
        args=(subject, body, settings.DEFAULT_FROM_EMAIL, [walker.email]),
        kwargs={'fail_silently': True},
        daemon=True,
    ).start()


class ReservationListCreateView(generics.ListCreateAPIView):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.OWNER:
            return Reservation.objects.filter(owner=user).select_related('walker').prefetch_related('dogs')
        elif user.role == User.WALKER:
            return Reservation.objects.filter(walker=user).select_related('owner').prefetch_related('dogs')
        return Reservation.objects.none()

    def perform_create(self, serializer):
        reservation = serializer.save(owner=self.request.user)
        send_new_reservation_email(reservation)
        from users.views import send_push_notification
        service = 'šetanje' if reservation.service_type == 'walking' else 'čuvanje'
        threading.Thread(
            target=send_push_notification,
            args=([reservation.walker], '🐾 Nova rezervacija', f'{reservation.owner.first_name} je zakazao/la {service}.'),
            daemon=True,
        ).start()


class ReservationDetailView(generics.RetrieveAPIView):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Reservation.objects.filter(
            owner=user
        ) | Reservation.objects.filter(walker=user)


class ReservationCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reservation = Reservation.objects.get(pk=pk)
        except Reservation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_owner = reservation.owner == user
        is_walker = reservation.walker == user

        if not is_owner and not is_walker:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status == Reservation.PENDING:
            # Only owner can cancel pending reservations
            if not is_owner:
                return Response({'detail': 'Samo vlasnik može otkazati rezervaciju na čekanju.'}, status=status.HTTP_403_FORBIDDEN)
        elif reservation.status == Reservation.CONFIRMED:
            # Both owner and walker can cancel confirmed, but not within 3 hours
            if timezone.now() >= reservation.start_time - timedelta(hours=3):
                return Response(
                    {'detail': 'Nije moguće otkazati rezervaciju manje od 3 sata pre šetnje.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response({'detail': 'Rezervacija ne može biti otkazana.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = Reservation.CANCELLED
        reservation.cancelled_by = user
        reservation.save()
        from users.views import send_push_notification
        other = reservation.walker if is_owner else reservation.owner
        service = 'šetanje' if reservation.service_type == 'walking' else 'čuvanje'
        threading.Thread(
            target=send_push_notification,
            args=([other], '❌ Rezervacija otkazana', f'Rezervacija za {service} je otkazana.'),
            daemon=True,
        ).start()
        logger.info('Reservation %s cancelled by user %s', pk, user.id)
        return Response({'detail': 'cancelled', 'status': 'cancelled'})


class WalkerReservationRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        new_status = request.data.get('status')
        if new_status not in [Reservation.CONFIRMED, Reservation.REJECTED]:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        updated = Reservation.objects.filter(
            pk=pk, walker=request.user, status=Reservation.PENDING
        ).update(status=new_status)

        if not updated:
            return Response({'detail': 'Rezervacija je već obrađena ili ne postoji.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation = Reservation.objects.select_related('owner', 'walker').get(pk=pk)
        logger.info('Reservation %s responded: %s by walker %s', pk, new_status, request.user.id)
        send_reservation_email(reservation, new_status)
        from users.views import send_push_notification
        if new_status == Reservation.CONFIRMED:
            threading.Thread(
                target=send_push_notification,
                args=([reservation.owner], '✅ Rezervacija prihvaćena', f'{reservation.walker.first_name} je prihvatio/la tvoju rezervaciju.'),
                daemon=True,
            ).start()
        elif new_status == Reservation.REJECTED:
            threading.Thread(
                target=send_push_notification,
                args=([reservation.owner], '❌ Rezervacija odbijena', f'{reservation.walker.first_name} nije mogao/la da prihvati rezervaciju.'),
                daemon=True,
            ).start()
        return Response({'detail': 'ok', 'status': new_status})


class WalkStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reservation = Reservation.objects.get(pk=pk, walker=request.user)
        except Reservation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status != Reservation.CONFIRMED:
            return Response({'detail': 'Rezervacija mora biti potvrđena.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow starting up to 30 minutes early
        if timezone.now() < reservation.start_time - timedelta(minutes=30):
            return Response({'detail': 'Šetnja još nije počela.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = Reservation.IN_PROGRESS
        reservation.walk_started_at = timezone.now()
        reservation.last_lat = None
        reservation.last_lng = None
        reservation.save()

        dog_names = ', '.join(d.name for d in reservation.dogs.all())
        from users.views import send_push_notification
        threading.Thread(
            target=send_push_notification,
            args=([reservation.owner], '🐾 Šetnja je počela!',
                  f'{reservation.walker.first_name} je krenuo/la na šetnju sa {dog_names}.'),
            daemon=True,
        ).start()
        logger.info('Walk started for reservation %s', pk)
        return Response({'detail': 'ok', 'status': 'in_progress'})


class WalkLocationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reservation = Reservation.objects.get(pk=pk, walker=request.user)
        except Reservation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status != Reservation.IN_PROGRESS:
            return Response({'detail': 'Šetnja nije aktivna.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_lat = request.data.get('lat')
        raw_lng = request.data.get('lng')
        if raw_lat is None or raw_lng is None:
            return Response({'detail': 'lat i lng su obavezni.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = Decimal(str(raw_lat))
            lng = Decimal(str(raw_lng))
        except (InvalidOperation, ValueError, TypeError):
            return Response({'detail': 'lat i lng moraju biti validni brojevi.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return Response({'detail': 'lat mora biti -90..90, lng -180..180.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.last_lat = lat
        reservation.last_lng = lng
        reservation.save(update_fields=['last_lat', 'last_lng'])
        return Response({'ok': True})

    def get(self, request, pk):
        try:
            reservation = Reservation.objects.get(
                Q(walker=request.user) | Q(owner=request.user), pk=pk
            )
        except Reservation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'lat': str(reservation.last_lat) if reservation.last_lat is not None else None,
            'lng': str(reservation.last_lng) if reservation.last_lng is not None else None,
            'walk_started_at': reservation.walk_started_at,
            'status': reservation.status,
        })


class WalkerCompleteReservationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        try:
            reservation = Reservation.objects.get(
                Q(walker=user) | Q(owner=user), pk=pk
            )
        except Reservation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status not in [Reservation.CONFIRMED, Reservation.IN_PROGRESS]:
            return Response({'detail': 'Samo potvrđene rezervacije mogu biti završene.'}, status=status.HTTP_400_BAD_REQUEST)

        # Walker može da završi tek nakon start_time (ako nije već in_progress)
        if reservation.walker == user and reservation.status == Reservation.CONFIRMED and timezone.now() < reservation.start_time:
            return Response({'detail': 'Šetnja još nije počela.'}, status=status.HTTP_400_BAD_REQUEST)

        # Owner može da završi tek nakon end_time
        if reservation.owner == user and reservation.status == Reservation.CONFIRMED and timezone.now() < reservation.end_time:
            return Response({'detail': 'Šetnja još nije završena.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = Reservation.COMPLETED
        reservation.last_lat = None
        reservation.last_lng = None
        reservation.save()

        if reservation.walker == user:
            from users.views import send_push_notification
            threading.Thread(
                target=send_push_notification,
                args=([reservation.owner], '🏁 Šetnja je završena!',
                      f'{reservation.walker.first_name} je završio/la šetnju i vratio/la psa.'),
                daemon=True,
            ).start()
        logger.info('Reservation %s completed', pk)
        return Response({'detail': 'ok', 'status': 'completed'})


class ReservationPendingCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'walker':
            count = Reservation.objects.filter(walker=request.user, status=Reservation.PENDING).count()
        else:
            count = 0
        return Response({'count': count})


class WalkerBusySlotsView(APIView):
    """GET /api/reservations/busy/?walker=<id>&date=2026-04-05
    Returns busy time slots for a walker on a given date (pending, confirmed, in_progress)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        walker_id = request.query_params.get('walker')
        date_str = request.query_params.get('date')
        if not walker_id or not date_str:
            return Response({'detail': 'walker and date params required.'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import datetime
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        reservations = Reservation.objects.filter(
            walker_id=walker_id,
            status__in=[Reservation.PENDING, Reservation.CONFIRMED, Reservation.IN_PROGRESS],
            start_time__date=date,
        ).values_list('start_time', 'end_time', 'status')

        slots = []
        for start, end, res_status in reservations:
            slots.append({
                'from': start.strftime('%H:%M'),
                'to': end.strftime('%H:%M'),
                'status': res_status,
            })

        return Response(slots)
