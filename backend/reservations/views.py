from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from .models import Reservation
from .serializers import ReservationSerializer, ReservationStatusSerializer

User = get_user_model()


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

    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=True)
    except Exception:
        pass


def send_new_reservation_email(reservation):
    owner = reservation.owner
    walker = reservation.walker
    date_str = reservation.start_time.strftime('%d.%m.%Y')
    time_str = f"{reservation.start_time.strftime('%H:%M')} – {reservation.end_time.strftime('%H:%M')}"
    service = 'šetanje' if reservation.service_type == 'walking' else 'čuvanje'
    dogs = ', '.join(d.name for d in reservation.dogs.all())

    subject = '🐾 Nova rezervacija – Paws'
    body = (
        f"Zdravo {walker.first_name},\n\n"
        f"Imaš novu rezervaciju!\n\n"
        f"Vlasnik: {owner.first_name} {owner.last_name}\n"
        f"Usluga: {service}\n"
        f"Datum: {date_str}\n"
        f"Vreme: {time_str}\n"
        f"Pas/psi: {dogs}\n\n"
        f"Prijavi se na Paws platformu da prihvatiš ili odbiješ rezervaciju.\n\nPaws tim"
    )

    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [walker.email], fail_silently=True)
    except Exception:
        pass


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
        return Response({'status': 'cancelled'})


class WalkerReservationRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reservation = Reservation.objects.get(pk=pk, walker=request.user)
        except Reservation.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status != Reservation.PENDING:
            return Response({'detail': 'Reservation has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        new_status = request.data.get('status')
        if new_status not in [Reservation.CONFIRMED, Reservation.REJECTED]:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = new_status
        reservation.save()
        send_reservation_email(reservation, new_status)
        return Response({'status': new_status})
