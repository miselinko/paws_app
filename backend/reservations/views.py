from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Reservation
from .serializers import ReservationSerializer, ReservationStatusSerializer

User = get_user_model()


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
        serializer.save(owner=self.request.user)


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
        return Response({'status': new_status})
