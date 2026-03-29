from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from users.models import WalkerProfile
from dogs.models import Dog
from reservations.models import Reservation

User = get_user_model()

OVERRIDE = override_settings(
    DEFAULT_THROTTLE_CLASSES=[],
    DEFAULT_THROTTLE_RATES={},
    REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': (
            'rest_framework_simplejwt.authentication.JWTAuthentication',
        ),
        'DEFAULT_PERMISSION_CLASSES': (
            'rest_framework.permissions.IsAuthenticated',
        ),
    },
)


def _create_user(email, role='owner', **kwargs):
    defaults = dict(
        password='testpass123',
        first_name='Test',
        last_name='User',
        is_email_verified=True,
    )
    defaults.update(kwargs)
    return User.objects.create_user(email=email, role=role, **defaults)


def _create_dog(owner, **kwargs):
    defaults = dict(
        name='Buddy',
        breed='Labrador',
        age=3,
        weight=Decimal('25.00'),
        size='large',
        gender='male',
    )
    defaults.update(kwargs)
    return Dog.objects.create(owner=owner, **defaults)


@OVERRIDE
class TestReservationCreate(TestCase):
    """Tests for creating reservations."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.walker = _create_user('walker@test.com', role='walker', first_name='Walker')
        WalkerProfile.objects.create(user=self.walker, active=True, hourly_rate=10)
        self.dog = _create_dog(self.owner)

    def get_token(self, email, password='testpass123'):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth(self, user):
        token = self.get_token(user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _reservation_data(self, **overrides):
        start = timezone.now() + timedelta(hours=2)
        end = start + timedelta(minutes=30)
        data = {
            'walker': self.walker.id,
            'dog_ids': [self.dog.id],
            'service_type': 'walking',
            'duration': 30,
            'start_time': start.isoformat(),
            'end_time': end.isoformat(),
            'notes': 'Test walk',
        }
        data.update(overrides)
        return data

    @patch('reservations.views.send_new_reservation_email')
    @patch('reservations.views.threading.Thread')
    def test_create_reservation_success(self, mock_thread, mock_email):
        """Owner can create a reservation for a walker."""
        self.auth(self.owner)
        data = self._reservation_data()
        response = self.client.post('/api/reservations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['walker'], self.walker.id)
        self.assertEqual(Reservation.objects.count(), 1)
        reservation = Reservation.objects.first()
        self.assertEqual(reservation.owner, self.owner)
        self.assertEqual(reservation.walker, self.walker)
        self.assertIn(self.dog, reservation.dogs.all())

    def test_create_reservation_unauthenticated(self):
        """Unauthenticated user cannot create a reservation."""
        data = self._reservation_data()
        response = self.client.post('/api/reservations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@OVERRIDE
class TestReservationRespond(TestCase):
    """Tests for walker responding to reservations (confirm/reject)."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.walker = _create_user('walker@test.com', role='walker', first_name='Walker')
        WalkerProfile.objects.create(user=self.walker, active=True, hourly_rate=10)
        self.dog = _create_dog(self.owner)

        self.reservation = Reservation.objects.create(
            owner=self.owner,
            walker=self.walker,
            service_type='walking',
            duration=30,
            start_time=timezone.now() + timedelta(hours=2),
            end_time=timezone.now() + timedelta(hours=2, minutes=30),
            status=Reservation.PENDING,
        )
        self.reservation.dogs.add(self.dog)

    def get_token(self, email, password='testpass123'):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth(self, user):
        token = self.get_token(user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    @patch('reservations.views.send_reservation_email')
    @patch('reservations.views.threading.Thread')
    def test_walker_confirms_reservation(self, mock_thread, mock_email):
        """Walker can confirm a pending reservation."""
        self.auth(self.walker)
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/respond/',
            {'status': 'confirmed'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'confirmed')
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.CONFIRMED)

    @patch('reservations.views.send_reservation_email')
    @patch('reservations.views.threading.Thread')
    def test_walker_rejects_reservation(self, mock_thread, mock_email):
        """Walker can reject a pending reservation."""
        self.auth(self.walker)
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/respond/',
            {'status': 'rejected'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'rejected')
        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.status, Reservation.REJECTED)


@OVERRIDE
class TestReservationCancel(TestCase):
    """Tests for cancelling reservations."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.walker = _create_user('walker@test.com', role='walker', first_name='Walker')
        WalkerProfile.objects.create(user=self.walker, active=True, hourly_rate=10)
        self.dog = _create_dog(self.owner)

    def get_token(self, email, password='testpass123'):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth(self, user):
        token = self.get_token(user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    @patch('reservations.views.threading.Thread')
    def test_owner_cancels_pending_reservation(self, mock_thread):
        """Owner can cancel a pending reservation."""
        reservation = Reservation.objects.create(
            owner=self.owner,
            walker=self.walker,
            service_type='walking',
            duration=30,
            start_time=timezone.now() + timedelta(hours=2),
            end_time=timezone.now() + timedelta(hours=2, minutes=30),
            status=Reservation.PENDING,
        )
        reservation.dogs.add(self.dog)

        self.auth(self.owner)
        response = self.client.post(f'/api/reservations/{reservation.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'cancelled')
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.CANCELLED)
        self.assertEqual(reservation.cancelled_by, self.owner)


@OVERRIDE
class TestWalkStart(TestCase):
    """Tests for starting a walk."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.walker = _create_user('walker@test.com', role='walker', first_name='Walker')
        WalkerProfile.objects.create(user=self.walker, active=True, hourly_rate=10)
        self.dog = _create_dog(self.owner)

    def get_token(self, email, password='testpass123'):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth(self, user):
        token = self.get_token(user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    @patch('reservations.views.threading.Thread')
    def test_walker_starts_confirmed_reservation(self, mock_thread):
        """Walker can start a confirmed reservation (within 30 min of start_time)."""
        reservation = Reservation.objects.create(
            owner=self.owner,
            walker=self.walker,
            service_type='walking',
            duration=30,
            start_time=timezone.now() + timedelta(minutes=10),
            end_time=timezone.now() + timedelta(minutes=40),
            status=Reservation.CONFIRMED,
        )
        reservation.dogs.add(self.dog)

        self.auth(self.walker)
        response = self.client.post(f'/api/reservations/{reservation.id}/start/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'in_progress')
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.IN_PROGRESS)
        self.assertIsNotNone(reservation.walk_started_at)


@OVERRIDE
class TestWalkComplete(TestCase):
    """Tests for completing a walk."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.walker = _create_user('walker@test.com', role='walker', first_name='Walker')
        WalkerProfile.objects.create(user=self.walker, active=True, hourly_rate=10)
        self.dog = _create_dog(self.owner)

    def get_token(self, email, password='testpass123'):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth(self, user):
        token = self.get_token(user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    @patch('reservations.views.threading.Thread')
    def test_walker_completes_in_progress_reservation(self, mock_thread):
        """Walker can complete an in-progress reservation."""
        reservation = Reservation.objects.create(
            owner=self.owner,
            walker=self.walker,
            service_type='walking',
            duration=30,
            start_time=timezone.now() - timedelta(minutes=30),
            end_time=timezone.now() + timedelta(minutes=10),
            status=Reservation.IN_PROGRESS,
            walk_started_at=timezone.now() - timedelta(minutes=25),
        )
        reservation.dogs.add(self.dog)

        self.auth(self.walker)
        response = self.client.post(f'/api/reservations/{reservation.id}/complete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.COMPLETED)
        self.assertIsNone(reservation.last_lat)
        self.assertIsNone(reservation.last_lng)


@OVERRIDE
class TestWalkLocation(TestCase):
    """Tests for walk location tracking (POST and GET)."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.walker = _create_user('walker@test.com', role='walker', first_name='Walker')
        WalkerProfile.objects.create(user=self.walker, active=True, hourly_rate=10)
        self.dog = _create_dog(self.owner)

        self.reservation = Reservation.objects.create(
            owner=self.owner,
            walker=self.walker,
            service_type='walking',
            duration=30,
            start_time=timezone.now() - timedelta(minutes=10),
            end_time=timezone.now() + timedelta(minutes=20),
            status=Reservation.IN_PROGRESS,
            walk_started_at=timezone.now() - timedelta(minutes=5),
        )
        self.reservation.dogs.add(self.dog)

    def get_token(self, email, password='testpass123'):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )
        return response.data['access']

    def auth(self, user):
        token = self.get_token(user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_post_and_get_walk_location(self):
        """Walker can POST lat/lng and owner can GET location."""
        # Walker posts location
        self.auth(self.walker)
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/location/',
            {'lat': '44.8176111', 'lng': '20.4568974'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['ok'])

        self.reservation.refresh_from_db()
        self.assertEqual(self.reservation.last_lat, Decimal('44.8176111'))
        self.assertEqual(self.reservation.last_lng, Decimal('20.4568974'))

        # Owner can GET the location
        self.auth(self.owner)
        response = self.client.get(
            f'/api/reservations/{self.reservation.id}/location/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lat'], '44.8176111')
        self.assertEqual(response.data['lng'], '20.4568974')
        self.assertEqual(response.data['status'], 'in_progress')

    def test_post_invalid_lat_lng_rejected(self):
        """Invalid lat/lng values are rejected."""
        self.auth(self.walker)

        # Non-numeric value
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/location/',
            {'lat': 'abc', 'lng': '20.456'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Out of range lat (> 90)
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/location/',
            {'lat': '91.0', 'lng': '20.456'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Out of range lng (> 180)
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/location/',
            {'lat': '44.0', 'lng': '181.0'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing lat/lng
        response = self.client.post(
            f'/api/reservations/{self.reservation.id}/location/',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
