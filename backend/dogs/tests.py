from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from dogs.models import Dog

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


def _dog_data(**overrides):
    data = {
        'name': 'Buddy',
        'breed': 'Labrador',
        'age': 3,
        'size': 'large',
        'gender': 'male',
        'neutered': False,
        'temperament': 'Friendly',
        'notes': '',
    }
    data.update(overrides)
    return data


@OVERRIDE
class TestDogCreate(TestCase):
    """Tests for creating dogs."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')

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

    def test_owner_can_create_dog(self):
        """Authenticated owner can create a dog."""
        self.auth(self.owner)
        data = _dog_data()
        response = self.client.post('/api/dogs/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Buddy')
        self.assertEqual(response.data['breed'], 'Labrador')
        self.assertEqual(Dog.objects.count(), 1)
        dog = Dog.objects.first()
        self.assertEqual(dog.owner, self.owner)
        self.assertEqual(dog.name, 'Buddy')


@OVERRIDE
class TestDogList(TestCase):
    """Tests for listing dogs — owner sees only their own dogs."""

    def setUp(self):
        self.client = APIClient()
        self.owner1 = _create_user('owner1@test.com', role='owner', first_name='Owner1')
        self.owner2 = _create_user('owner2@test.com', role='owner', first_name='Owner2')

        # Owner1's dogs
        Dog.objects.create(
            owner=self.owner1, name='Buddy', breed='Labrador',
            age=3, size='large', gender='male',
        )
        Dog.objects.create(
            owner=self.owner1, name='Max', breed='Poodle',
            age=5, size='small', gender='male',
        )
        # Owner2's dog
        Dog.objects.create(
            owner=self.owner2, name='Rex', breed='Shepherd',
            age=2, size='large', gender='male',
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

    def test_owner_sees_only_their_dogs(self):
        """Owner sees only their own dogs in the list."""
        self.auth(self.owner1)
        response = self.client.get('/api/dogs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        names = {d['name'] for d in response.data}
        self.assertEqual(names, {'Buddy', 'Max'})

    def test_other_owner_sees_only_their_dogs(self):
        """Owner2 sees only their dog, not Owner1's."""
        self.auth(self.owner2)
        response = self.client.get('/api/dogs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Rex')


@OVERRIDE
class TestDogUpdate(TestCase):
    """Tests for updating dogs."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.dog = Dog.objects.create(
            owner=self.owner, name='Buddy', breed='Labrador',
            age=3, size='large', gender='male',
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

    def test_owner_can_update_dog(self):
        """Owner can update their dog's details."""
        self.auth(self.owner)
        response = self.client.patch(
            f'/api/dogs/{self.dog.id}/',
            {'name': 'Buddy Jr', 'age': 4},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Buddy Jr')
        self.assertEqual(response.data['age'], 4)
        self.dog.refresh_from_db()
        self.assertEqual(self.dog.name, 'Buddy Jr')
        self.assertEqual(self.dog.age, 4)


@OVERRIDE
class TestDogDelete(TestCase):
    """Tests for deleting dogs."""

    def setUp(self):
        self.client = APIClient()
        self.owner = _create_user('owner@test.com', role='owner')
        self.dog = Dog.objects.create(
            owner=self.owner, name='Buddy', breed='Labrador',
            age=3, size='large', gender='male',
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

    def test_owner_can_delete_dog(self):
        """Owner can delete their dog."""
        self.auth(self.owner)
        response = self.client.delete(f'/api/dogs/{self.dog.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Dog.objects.filter(id=self.dog.id).exists())


@OVERRIDE
class TestDogAccessControl(TestCase):
    """Tests that another user cannot access someone else's dogs."""

    def setUp(self):
        self.client = APIClient()
        self.owner1 = _create_user('owner1@test.com', role='owner', first_name='Owner1')
        self.owner2 = _create_user('owner2@test.com', role='owner', first_name='Owner2')
        self.dog = Dog.objects.create(
            owner=self.owner1, name='Buddy', breed='Labrador',
            age=3, size='large', gender='male',
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

    def test_other_user_cannot_view_dog(self):
        """Another user cannot view someone else's dog via detail endpoint."""
        self.auth(self.owner2)
        response = self.client.get(f'/api/dogs/{self.dog.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_other_user_cannot_update_dog(self):
        """Another user cannot update someone else's dog."""
        self.auth(self.owner2)
        response = self.client.patch(
            f'/api/dogs/{self.dog.id}/',
            {'name': 'Hacked'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.dog.refresh_from_db()
        self.assertEqual(self.dog.name, 'Buddy')

    def test_other_user_cannot_delete_dog(self):
        """Another user cannot delete someone else's dog."""
        self.auth(self.owner2)
        response = self.client.delete(f'/api/dogs/{self.dog.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Dog.objects.filter(id=self.dog.id).exists())
