from django.db import models
from django.conf import settings


class Reservation(models.Model):
    WALKING = 'walking'
    BOARDING = 'boarding'

    SERVICE_CHOICES = [
        (WALKING, 'Walking'),
        (BOARDING, 'Boarding'),
    ]

    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    REJECTED = 'rejected'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (CONFIRMED, 'Confirmed'),
        (REJECTED, 'Rejected'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owner_reservations'
    )
    walker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='walker_reservations'
    )
    dogs = models.ManyToManyField('dogs.Dog', related_name='reservations')
    service_type = models.CharField(max_length=10, choices=SERVICE_CHOICES)
    duration = models.PositiveIntegerField(null=True, blank=True, help_text='Duration in minutes (20, 30, 60)')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)
    notes = models.TextField(blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cancelled_reservations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Reservation'
        verbose_name_plural = 'Reservations'
        ordering = ['-created_at']

    def __str__(self):
        return f'Reservation #{self.pk} - {self.owner.full_name} -> {self.walker.full_name} ({self.status})'
