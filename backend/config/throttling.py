"""Throttle klase koje koriste PRAVU IP adresu klijenta.

Render ne briše X-Forwarded-For koji pošalje klijent, nego samo dopisuje na njega,
pa se prva adresa u tom zaglavlju može lažirati. DRF podrazumevano koristi celo
zaglavlje, pa bi bot sa nasumičnim X-Forwarded-For dobio novi brojač za svaki zahtev.

Render je iza Cloudflare-a, a Cloudflare sam postavlja CF-Connecting-IP i
True-Client-IP i prepisuje vrednosti koje klijent pošalje. Zato koristimo njih.
Lokalno (bez proxyja) koristi se REMOTE_ADDR.

Brojači su u deljenom DatabaseCache-u (vidi CACHES u settings.py), pa važe za sve
gunicorn procese i preživljavaju restart.
"""
from rest_framework import throttling

TRUSTED_IP_HEADERS = ('HTTP_CF_CONNECTING_IP', 'HTTP_TRUE_CLIENT_IP')


def client_ip(request):
    meta = getattr(request, 'META', {})
    for header in TRUSTED_IP_HEADERS:
        value = meta.get(header, '').strip()
        if value:
            return value
    return meta.get('REMOTE_ADDR', '') or 'unknown'


class ClientIPMixin:
    def get_ident(self, request):
        return client_ip(request)


class AnonRateThrottle(ClientIPMixin, throttling.AnonRateThrottle):
    pass


class UserRateThrottle(ClientIPMixin, throttling.UserRateThrottle):
    pass
