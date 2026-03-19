from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import threading
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

    threading.Thread(
        target=send_mail,
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
        gender_map = {'male': 'muški', 'female': 'ženski'}
        line = f"  • {d.name} ({d.breed}, {d.age} god, {size_map.get(d.size, d.size)}, {gender_map.get(d.gender, d.gender)}, {d.weight}kg)"
        if d.temperament:
            line += f"\n    Karakter: {d.temperament}"
        if d.notes:
            line += f"\n    Napomene: {d.notes}"
        dog_lines.append(line)
    dogs_section = '\n'.join(dog_lines)

    location = owner.address if owner.address else '(adresa nije uneta)'
    maps_link = ''
    if owner.lat and owner.lng:
        maps_link = f"\n    Google Maps: https://www.google.com/maps?q={owner.lat},{owner.lng}"

    subject = '🐾 Nova rezervacija – Paws'
    body = (
        f"Zdravo {walker.first_name},\n\n"
        f"Stigla ti je nova rezervacija! Pogledaj detalje ispod i prihvati ili odbij je na platformi.\n\n"
        f"{'='*40}\n"
        f"DETALJI REZERVACIJE\n"
        f"{'='*40}\n"
        f"Usluga:  {service}\n"
        f"Datum:   {date_str}\n"
        f"Vreme:   {time_str}\n"
        f"{'='*40}\n\n"
        f"VLASNIK\n"
        f"Ime:     {owner.first_name} {owner.last_name}\n"
        f"Telefon: {owner.phone if owner.phone else '(nije unet)'}\n"
        f"Email:   {owner.email}\n"
        f"Adresa:  {location}{maps_link}\n\n"
        f"PAS/PSI\n"
        f"{dogs_section}\n\n"
    )

    if reservation.notes:
        body += f"NAPOMENA VLASNIKA\n{reservation.notes}\n\n"

    body += "Prijavi se na Paws platformu da prihvatiš ili odbiješ rezervaciju.\n\nPaws tim 🐾"

    threading.Thread(
        target=send_mail,
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

        if reservation.status != Reservation.CONFIRMED:
            return Response({'detail': 'Samo potvrđene rezervacije mogu biti završene.'}, status=status.HTTP_400_BAD_REQUEST)

        # Walker može da završi tek nakon start_time
        if reservation.walker == user and timezone.now() < reservation.start_time:
            return Response({'detail': 'Šetnja još nije počela.'}, status=status.HTTP_400_BAD_REQUEST)

        # Owner može da završi tek nakon end_time
        if reservation.owner == user and timezone.now() < reservation.end_time:
            return Response({'detail': 'Šetnja još nije završena.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = Reservation.COMPLETED
        reservation.save()
        return Response({'status': 'completed'})


class ReservationPendingCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'walker':
            count = Reservation.objects.filter(walker=request.user, status=Reservation.PENDING).count()
        else:
            count = 0
        return Response({'count': count})
