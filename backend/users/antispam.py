"""Zaštita registracije od botova: Cloudflare Turnstile CAPTCHA + honeypot polje.

Turnstile je besplatan. Provera je aktivna samo ako je TURNSTILE_SECRET_KEY podešen.
Kad je TURNSTILE_ENFORCE=False, zahtev bez tokena prolazi (stari APK bez CAPTCHA-a
i dalje radi), ali poslat token MORA biti ispravan.
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

from config.throttling import client_ip  # noqa: F401  (koristi se u views)

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

# Skriveno polje u formi: ljudi ga ne vide i ne popunjavaju, botovi obično da.
HONEYPOT_FIELD = 'website'


def verify_turnstile(token, remote_ip=''):
    """Vraća (ok, razlog)."""
    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        return True, 'disabled'
    if not token:
        if settings.TURNSTILE_ENFORCE:
            return False, 'missing'
        return True, 'not-enforced'
    payload = urllib.parse.urlencode({'secret': secret, 'response': token, 'remoteip': remote_ip}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(TURNSTILE_VERIFY_URL, data=payload), timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except (urllib.error.URLError, OSError, ValueError) as e:
        logger.warning('Turnstile verification unavailable: %s', e)
        # Kad je zaštita obavezna, nedostupan Cloudflare NE sme da propusti registraciju.
        if settings.TURNSTILE_ENFORCE:
            return False, 'unavailable'
        return True, 'unavailable'
    if data.get('success'):
        return True, 'ok'
    logger.info('Turnstile rejected registration: %s', data.get('error-codes'))
    return False, 'invalid'
