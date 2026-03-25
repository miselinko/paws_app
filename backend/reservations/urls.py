from django.urls import path
from .views import (
    ReservationListCreateView,
    ReservationDetailView,
    ReservationCancelView,
    WalkerReservationRespondView,
    WalkerCompleteReservationView,
    ReservationPendingCountView,
    WalkStartView,
    WalkLocationView,
)

urlpatterns = [
    path('', ReservationListCreateView.as_view(), name='reservation-list'),
    path('pending-count/', ReservationPendingCountView.as_view(), name='reservation-pending-count'),
    path('<int:pk>/', ReservationDetailView.as_view(), name='reservation-detail'),
    path('<int:pk>/cancel/', ReservationCancelView.as_view(), name='reservation-cancel'),
    path('<int:pk>/respond/', WalkerReservationRespondView.as_view(), name='reservation-respond'),
    path('<int:pk>/complete/', WalkerCompleteReservationView.as_view(), name='reservation-complete'),
    path('<int:pk>/start/', WalkStartView.as_view(), name='walk-start'),
    path('<int:pk>/location/', WalkLocationView.as_view(), name='walk-location'),
]
