from django.urls import path
from .views import (
    ReservationListCreateView,
    ReservationDetailView,
    ReservationCancelView,
    WalkerReservationRespondView,
    WalkerCompleteReservationView,
    ReservationPendingCountView,
)

urlpatterns = [
    path('', ReservationListCreateView.as_view(), name='reservation-list'),
    path('pending-count/', ReservationPendingCountView.as_view(), name='reservation-pending-count'),
    path('<int:pk>/', ReservationDetailView.as_view(), name='reservation-detail'),
    path('<int:pk>/cancel/', ReservationCancelView.as_view(), name='reservation-cancel'),
    path('<int:pk>/respond/', WalkerReservationRespondView.as_view(), name='reservation-respond'),
    path('<int:pk>/complete/', WalkerCompleteReservationView.as_view(), name='reservation-complete'),
]
