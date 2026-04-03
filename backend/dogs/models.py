from django.db import models
from django.conf import settings


class Dog(models.Model):
    SMALL = 'small'
    MEDIUM = 'medium'
    LARGE = 'large'

    SIZE_CHOICES = [
        (SMALL, 'Small (up to 10kg)'),
        (MEDIUM, 'Medium (10-25kg)'),
        (LARGE, 'Large (25kg+)'),
    ]

    MALE = 'male'
    FEMALE = 'female'

    GENDER_CHOICES = [
        (MALE, 'Male'),
        (FEMALE, 'Female'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dogs'
    )
    name = models.CharField(max_length=100)
    breed = models.CharField(max_length=100)
    age = models.PositiveIntegerField(help_text='Age in years')
    size = models.CharField(max_length=10, choices=SIZE_CHOICES)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    neutered = models.BooleanField(default=False)
    temperament = models.CharField(max_length=255, blank=True, help_text='e.g. calm, energetic, aggressive towards dogs')
    notes = models.TextField(blank=True, help_text='Allergies, medications, fears...')
    image = models.ImageField(upload_to='dogs/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Dog'
        verbose_name_plural = 'Dogs'

    def __str__(self):
        return f'{self.name} ({self.breed}) - {self.owner.full_name}'
