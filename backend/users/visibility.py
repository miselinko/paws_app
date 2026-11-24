"""Koji šetači su javno vidljivi (lista, profil, favoriti, rezervacije)."""
from datetime import datetime, time

from django.conf import settings
from django.db.models import Q
from django.utils import timezone


def verification_cutoff():
    d = datetime.strptime(settings.WALKER_EMAIL_VERIFICATION_REQUIRED_FROM, '%Y-%m-%d').date()
    return timezone.make_aware(datetime.combine(d, time.min))


def visible_walkers(qs):
    """Aktivni šetači; oni registrovani posle datuma iz podešavanja moraju imati potvrđen email.
    Postojeći šetači (registrovani ranije) ostaju vidljivi i bez potvrde."""
    return qs.filter(role='walker', is_active=True).filter(
        Q(is_email_verified=True) | Q(created_at__lt=verification_cutoff())
    )
