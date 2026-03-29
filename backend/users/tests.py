from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import WalkerProfile, Favorite, PasswordResetToken

User = get_user_model()


@override_settings(
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
class TestRegistration(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_owner_success(self):
        data = {
            'email': 'newowner@test.com',
            'first_name': 'New',
            'last_name': 'Owner',
            'password': 'testpass123',
            'password2': 'testpass123',
            'role': 'owner',
        }
        response = self.client.post('/api/users/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newowner@test.com').exists())
        user = User.objects.get(email='newowner@test.com')
        self.assertEqual(user.role, 'owner')
        self.assertFalse(user.is_email_verified)

    def test_register_walker_creates_profile(self):
        data = {
            'email': 'newwalker@test.com',
            'first_name': 'New',
            'last_name': 'Walker',
            'password': 'testpass123',
            'password2': 'testpass123',
            'role': 'walker',
            'services': 'walking',
        }
        response = self.client.post('/api/users/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='newwalker@test.com')
        self.assertTrue(hasattr(user, 'walker_profile'))
        self.assertEqual(user.walker_profile.services, 'walking')

    def test_register_duplicate_email(self):
        User.objects.create_user(
            email='existing@test.com', password='testpass123',
            first_name='Existing', last_name='User',
        )
        data = {
            'email': 'existing@test.com',
            'first_name': 'Another',
            'last_name': 'User',
            'password': 'testpass123',
            'password2': 'testpass123',
            'role': 'owner',
        }
        response = self.client.post('/api/users/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        data = {
            'email': 'mismatch@test.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123',
            'password2': 'differentpass',
            'role': 'owner',
        }
        response = self.client.post('/api/users/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password(self):
        data = {
            'email': 'short@test.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'short',
            'password2': 'short',
            'role': 'owner',
        }
        response = self.client.post('/api/users/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(
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
class TestLogin(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='login@test.com', password='testpass123',
            first_name='Login', last_name='User',
            is_email_verified=True,
        )

    def test_login_success(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'login@test.com', 'password': 'testpass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'login@test.com', 'password': 'wrongpass'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_email(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'nobody@test.com', 'password': 'testpass123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(
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
class TestProfile(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='profile@test.com', password='testpass123',
            first_name='Profile', last_name='User', role='owner',
            is_email_verified=True,
        )

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

    def test_get_profile_authenticated(self):
        self.auth(self.user)
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@test.com')
        self.assertEqual(response.data['first_name'], 'Profile')
        self.assertEqual(response.data['last_name'], 'User')
        self.assertEqual(response.data['role'], 'owner')

    def test_get_profile_unauthenticated(self):
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        self.auth(self.user)
        response = self.client.patch(
            '/api/users/profile/',
            {'first_name': 'Updated', 'phone': '0601234567'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['phone'], '0601234567')


@override_settings(
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
class TestWalkerList(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create active walker
        self.walker1 = User.objects.create_user(
            email='walker1@test.com', password='testpass123',
            first_name='Active', last_name='Walker', role='walker',
            is_email_verified=True,
        )
        WalkerProfile.objects.create(user=self.walker1, active=True, hourly_rate=10)

        # Create inactive walker
        self.walker2 = User.objects.create_user(
            email='walker2@test.com', password='testpass123',
            first_name='Inactive', last_name='Walker', role='walker',
            is_email_verified=True,
        )
        WalkerProfile.objects.create(user=self.walker2, active=False, hourly_rate=15)

        # Create an owner (should not appear in walker list)
        self.owner = User.objects.create_user(
            email='owner@test.com', password='testpass123',
            first_name='Test', last_name='Owner', role='owner',
            is_email_verified=True,
        )

    def test_walker_list_returns_only_active_walkers(self):
        response = self.client.get('/api/users/walkers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['first_name'], 'Active')

    def test_walker_list_search(self):
        response = self.client.get('/api/users/walkers/?search=Active')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['first_name'], 'Active')

    def test_walker_list_search_no_match(self):
        response = self.client.get('/api/users/walkers/?search=Nonexistent')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 0)

    def test_walker_list_filter_by_max_price(self):
        response = self.client.get('/api/users/walkers/?cena_max=12')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['first_name'], 'Active')


@override_settings(
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
class TestFavorites(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email='owner@test.com', password='testpass123',
            first_name='Test', last_name='Owner', role='owner',
            is_email_verified=True,
        )
        self.walker = User.objects.create_user(
            email='walker@test.com', password='testpass123',
            first_name='Test', last_name='Walker', role='walker',
            is_email_verified=True,
        )
        WalkerProfile.objects.create(user=self.walker, active=True)

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

    def test_toggle_favorite_add(self):
        self.auth(self.owner)
        response = self.client.post(f'/api/users/favorites/{self.walker.id}/toggle/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_favorited'])
        self.assertTrue(Favorite.objects.filter(user=self.owner, walker=self.walker).exists())

    def test_toggle_favorite_remove(self):
        self.auth(self.owner)
        Favorite.objects.create(user=self.owner, walker=self.walker)
        response = self.client.post(f'/api/users/favorites/{self.walker.id}/toggle/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_favorited'])
        self.assertFalse(Favorite.objects.filter(user=self.owner, walker=self.walker).exists())

    def test_toggle_favorite_nonexistent_walker(self):
        self.auth(self.owner)
        response = self.client.post('/api/users/favorites/99999/toggle/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_favorites_list(self):
        self.auth(self.owner)
        Favorite.objects.create(user=self.owner, walker=self.walker)
        response = self.client.get('/api/users/favorites/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.walker.id, response.data)

    def test_toggle_favorite_unauthenticated(self):
        response = self.client.post(f'/api/users/favorites/{self.walker.id}/toggle/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(
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
class TestPasswordReset(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='reset@test.com', password='oldpass123',
            first_name='Reset', last_name='User',
            is_email_verified=True,
        )

    def test_forgot_password_creates_token(self):
        response = self.client.post(
            '/api/users/forgot-password/',
            {'email': 'reset@test.com'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())

    def test_forgot_password_nonexistent_email_still_200(self):
        """Should not reveal whether email exists in system."""
        response = self.client.post(
            '/api/users/forgot-password/',
            {'email': 'nobody@test.com'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reset_password_with_valid_token(self):
        token = PasswordResetToken.objects.create(user=self.user)
        response = self.client.post(
            '/api/users/reset-password/',
            {'token': str(token.token), 'password': 'newpass1234'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify new password works
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass1234'))
        # Token should be marked as used
        token.refresh_from_db()
        self.assertTrue(token.used)

    def test_reset_password_with_invalid_token(self):
        response = self.client.post(
            '/api/users/reset-password/',
            {'token': '00000000-0000-0000-0000-000000000000', 'password': 'newpass1234'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_used_token(self):
        token = PasswordResetToken.objects.create(user=self.user)
        token.used = True
        token.save()
        response = self.client.post(
            '/api/users/reset-password/',
            {'token': str(token.token), 'password': 'newpass1234'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_too_short(self):
        token = PasswordResetToken.objects.create(user=self.user)
        response = self.client.post(
            '/api/users/reset-password/',
            {'token': str(token.token), 'password': 'short'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
