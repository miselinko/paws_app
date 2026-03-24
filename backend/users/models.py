from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.conf import settings
from datetime import timedelta
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    OWNER = 'owner'
    WALKER = 'walker'
    ADMIN = 'admin'

    ROLE_CHOICES = [
        (OWNER, 'Dog Owner'),
        (WALKER, 'Walker/Sitter'),
        (ADMIN, 'Administrator'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=OWNER)
    address = models.CharField(max_length=255, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.email})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'


class WalkerProfile(models.Model):
    WALKING = 'walking'
    BOARDING = 'boarding'
    BOTH = 'both'

    SERVICE_CHOICES = [
        (WALKING, 'Walking'),
        (BOARDING, 'Boarding'),
        (BOTH, 'All Services'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='walker_profile')
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    daily_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    services = models.CharField(max_length=10, choices=SERVICE_CHOICES, default=BOTH)
    bio = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    availability = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Walker Profile'
        verbose_name_plural = 'Walker Profiles'

    def __str__(self):
        return f'Walker profile: {self.user.full_name}'


class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.used and timezone.now() < self.created_at + timedelta(hours=1)

    def __str__(self):
        return f'Reset token for {self.user.email}'
