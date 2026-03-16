from django.urls import path
from .views import (
    ReservationListCreateView,
    ReservationDetailView,
    ReservationCancelView,
    WalkerReservationRespondView,
)

urlpatterns = [
    path('', ReservationListCreateView.as_view(), name='reservation-list'),
    path('<int:pk>/', ReservationDetailView.as_view(), name='reservation-detail'),
    path('<int:pk>/cancel/', ReservationCancelView.as_view(), name='reservation-cancel'),
    path('<int:pk>/respond/', WalkerReservationRespondView.as_view(), name='reservation-respond'),
]
