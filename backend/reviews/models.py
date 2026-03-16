from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


class Review(models.Model):
    reservation = models.OneToOneField(
        'reservations.Reservation',
        on_delete=models.CASCADE,
        related_name='review'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_reviews'
    )
    walker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_reviews'
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f'Review for {self.walker.full_name} - rating {self.rating}/5'
