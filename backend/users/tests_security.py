"""Testovi za zaštitu registracije, vidljivost šetača, admin akcije i tokene.

Pokreću se nad izolovanom bazom (SQLite u memoriji ili TEST_DATABASE_URL),
nikad nad produkcijskom — vidi config/settings.py.
"""
from datetime import timedelta
from unittest.mock import patch, MagicMock
import json

from django.core.cache import cache
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User, WalkerProfile, EmailVerificationToken

STRONG = 'Sigurna-Lozinka-2026'


def reg_payload(**over):
    data = {
        'email': 'novi@primer.rs', 'first_name': 'Ana', 'last_name': 'Anić',
        'password': STRONG, 'password2': STRONG, 'role': 'owner',
    }
    data.update(over)
    return data


def make_user(email, role='owner', verified=False, active=True, days_ago=0, **extra):
    u = User.objects.create_user(email=email, password=STRONG, first_name='T', last_name='U',
                                 role=role, is_email_verified=verified, is_active=active, **extra)
    if days_ago:
        User.objects.filter(pk=u.pk).update(created_at=timezone.now() - timedelta(days=days_ago))
        u.refresh_from_db()
    if role == 'walker':
        WalkerProfile.objects.create(user=u, hourly_rate=500)
    return u


class RegistrationProtectionTests(TestCase):
    def setUp(self):
        self.c = APIClient()

    def test_honeypot_blocks_bots(self):
        r = self.c.post('/api/users/register/', reg_payload(website='http://spam'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(email='novi@primer.rs').exists())

    def test_weak_password_rejected(self):
        r = self.c.post('/api/users/register/', reg_payload(password='12345678', password2='12345678'), format='json')
        self.assertEqual(r.status_code, 400)

    def test_cannot_register_as_admin(self):
        r = self.c.post('/api/users/register/', reg_payload(role='admin'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(role='admin').exists())

    def test_extra_privilege_fields_ignored(self):
        r = self.c.post('/api/users/register/', reg_payload(is_staff=True, is_superuser=True, is_email_verified=True), format='json')
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email='novi@primer.rs')
        self.assertFalse(u.is_staff or u.is_superuser or u.is_email_verified)

    def test_duplicate_email_case_insensitive(self):
        make_user('novi@primer.rs')
        r = self.c.post('/api/users/register/', reg_payload(email='NOVI@Primer.rs'), format='json')
        self.assertEqual(r.status_code, 400)

    def test_verification_email_sent(self):
        from django.core import mail
        r = self.c.post('/api/users/register/', reg_payload(), format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('verify-email?token=', mail.outbox[0].body)
        self.assertTrue(EmailVerificationToken.objects.filter(user__email='novi@primer.rs').exists())

    @override_settings(TURNSTILE_SECRET_KEY='secret', TURNSTILE_ENFORCE=True)
    def test_captcha_required_when_enforced(self):
        r = self.c.post('/api/users/register/', reg_payload(), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data.get('code'), 'captcha')

    @override_settings(TURNSTILE_SECRET_KEY='secret', TURNSTILE_ENFORCE=True)
    def test_captcha_valid_token_passes(self):
        resp = MagicMock()
        resp.read.return_value = json.dumps({'success': True}).encode()
        resp.__enter__.return_value = resp
        with patch('users.antispam.urllib.request.urlopen', return_value=resp):
            r = self.c.post('/api/users/register/', reg_payload(captcha_token='tok'), format='json')
        self.assertEqual(r.status_code, 201)

    @override_settings(TURNSTILE_SECRET_KEY='secret', TURNSTILE_ENFORCE=False)
    def test_captcha_invalid_token_rejected_even_if_not_enforced(self):
        resp = MagicMock()
        resp.read.return_value = json.dumps({'success': False, 'error-codes': ['invalid-input-response']}).encode()
        resp.__enter__.return_value = resp
        with patch('users.antispam.urllib.request.urlopen', return_value=resp):
            r = self.c.post('/api/users/register/', reg_payload(captcha_token='bad'), format='json')
        self.assertEqual(r.status_code, 400)

    @override_settings(TURNSTILE_SECRET_KEY='secret', TURNSTILE_ENFORCE=True)
    def test_captcha_fails_closed_when_cloudflare_down_and_enforced(self):
        import urllib.error
        with patch('users.antispam.urllib.request.urlopen', side_effect=urllib.error.URLError('down')):
            r = self.c.post('/api/users/register/', reg_payload(captcha_token='tok'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(email='novi@primer.rs').exists())

    @override_settings(TURNSTILE_SECRET_KEY='secret', TURNSTILE_ENFORCE=False)
    def test_old_app_without_captcha_still_works_when_not_enforced(self):
        r = self.c.post('/api/users/register/', reg_payload(), format='json')
        self.assertEqual(r.status_code, 201)


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.db.DatabaseCache', 'LOCATION': 'paws_cache'}})
class RegistrationThrottleTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from django.core.management import call_command
        with override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.db.DatabaseCache', 'LOCATION': 'paws_cache'}}):
            call_command('createcachetable', verbosity=0)

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_register_throttled_per_ip(self):
        c = APIClient()
        codes = [c.post('/api/users/register/', reg_payload(email=f'u{i}@primer.rs'), format='json').status_code
                 for i in range(7)]
        self.assertEqual(codes[:5], [201] * 5)
        self.assertEqual(codes[5], 429)

    def test_spoofed_x_forwarded_for_does_not_bypass_throttle(self):
        c = APIClient()
        codes = [c.post('/api/users/register/', reg_payload(email=f's{i}@primer.rs'), format='json',
                        HTTP_X_FORWARDED_FOR=f'10.0.0.{i}').status_code for i in range(7)]
        self.assertEqual(codes[5], 429)

    def test_cloudflare_client_ip_used(self):
        c = APIClient()
        for i in range(5):
            c.post('/api/users/register/', reg_payload(email=f'a{i}@primer.rs'), format='json', HTTP_CF_CONNECTING_IP='1.1.1.1')
        r_same = c.post('/api/users/register/', reg_payload(email='a9@primer.rs'), format='json', HTTP_CF_CONNECTING_IP='1.1.1.1')
        r_other = c.post('/api/users/register/', reg_payload(email='b9@primer.rs'), format='json', HTTP_CF_CONNECTING_IP='2.2.2.2')
        self.assertEqual(r_same.status_code, 429)
        self.assertEqual(r_other.status_code, 201)


@override_settings(WALKER_EMAIL_VERIFICATION_REQUIRED_FROM='2026-01-01')
class WalkerVisibilityTests(TestCase):
    def setUp(self):
        self.c = APIClient()
        # "Stari" nalozi su pre datuma u podešavanjima (testovi pomeraju datum unazad).
        self.old_unverified = make_user('stari@primer.rs', 'walker')
        User.objects.filter(pk=self.old_unverified.pk).update(created_at=timezone.make_aware(timezone.datetime(2025, 6, 1)))
        self.new_unverified = make_user('novi@primer.rs', 'walker')
        self.new_verified = make_user('potvrdjen@primer.rs', 'walker', verified=True)
        self.inactive = make_user('neaktivan@primer.rs', 'walker', verified=True, active=False)

    def ids(self):
        r = self.c.get('/api/users/walkers/')
        self.assertEqual(r.status_code, 200)
        return {w['id'] for w in r.data['results']}

    def test_list_hides_new_unverified_and_inactive(self):
        ids = self.ids()
        self.assertIn(self.old_unverified.id, ids)
        self.assertIn(self.new_verified.id, ids)
        self.assertNotIn(self.new_unverified.id, ids)
        self.assertNotIn(self.inactive.id, ids)

    def test_detail_hidden_for_public_but_visible_to_self(self):
        self.assertEqual(self.c.get(f'/api/users/walkers/{self.new_unverified.id}/').status_code, 404)
        self.assertEqual(self.c.get(f'/api/users/walkers/{self.inactive.id}/').status_code, 404)
        self.c.force_authenticate(self.new_unverified)
        self.assertEqual(self.c.get(f'/api/users/walkers/{self.new_unverified.id}/').status_code, 200)

    def test_existing_unverified_users_can_still_log_in(self):
        r = self.c.post('/api/auth/login/', {'email': 'stari@primer.rs', 'password': STRONG}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_cannot_book_hidden_walker(self):
        from dogs.models import Dog
        owner = make_user('vlasnik@primer.rs')
        dog = Dog.objects.create(owner=owner, name='Rex', breed='x', age=2, size='small', gender='male')
        self.c.force_authenticate(owner)
        start = timezone.now() + timedelta(days=2)
        r = self.c.post('/api/reservations/', {
            'walker': self.new_unverified.id, 'dog_ids': [dog.id], 'service_type': 'walking', 'duration': 60,
            'start_time': start.isoformat(), 'end_time': (start + timedelta(hours=1)).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 400)


class ProfileEscalationTests(TestCase):
    def test_user_cannot_make_self_admin(self):
        u = make_user('obican@primer.rs')
        c = APIClient()
        c.force_authenticate(u)
        r = c.patch('/api/users/profile/', {'role': 'admin', 'is_staff': True, 'is_superuser': True}, format='json')
        self.assertEqual(r.status_code, 200)
        u.refresh_from_db()
        self.assertEqual(u.role, 'owner')
        self.assertFalse(u.is_staff or u.is_superuser)

    def test_non_admin_cannot_use_admin_api(self):
        u = make_user('obican@primer.rs')
        c = APIClient()
        c.force_authenticate(u)
        self.assertEqual(c.get('/api/users/admin/stats/').status_code, 403)
        self.assertEqual(c.delete(f'/api/users/admin/users/{u.id}/').status_code, 403)


@override_settings(PROTECTED_ADMIN_EMAILS=['admin@paws.rs'])
class AdminDeleteTests(TestCase):
    def setUp(self):
        self.main_admin = User.objects.create_superuser(email='admin@paws.rs', password=STRONG, first_name='A', last_name='P')
        self.staff_admin = User.objects.create_user(email='mod@paws.rs', password=STRONG, first_name='M', last_name='P',
                                                    role='admin', is_staff=True)
        self.target = make_user('meta@primer.rs')
        self.c = APIClient()

    def test_default_delete_only_deactivates(self):
        self.c.force_authenticate(self.main_admin)
        r = self.c.delete(f'/api/users/admin/users/{self.target.id}/')
        self.assertEqual(r.status_code, 204)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_reactivate(self):
        self.c.force_authenticate(self.main_admin)
        self.c.delete(f'/api/users/admin/users/{self.target.id}/')
        r = self.c.patch(f'/api/users/admin/users/{self.target.id}/', {'is_active': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)

    def test_permanent_delete_requires_confirmation(self):
        self.c.force_authenticate(self.main_admin)
        r = self.c.delete(f'/api/users/admin/users/{self.target.id}/?permanent=true', {'confirm_email': 'pogresno@x.rs'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.target.pk).exists())
        r = self.c.delete(f'/api/users/admin/users/{self.target.id}/?permanent=true', {'confirm_email': 'META@primer.rs'}, format='json')
        self.assertEqual(r.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.target.pk).exists())

    def test_permanent_delete_requires_superuser(self):
        self.c.force_authenticate(self.staff_admin)
        r = self.c.delete(f'/api/users/admin/users/{self.target.id}/?permanent=true', {'confirm_email': 'meta@primer.rs'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertTrue(User.objects.filter(pk=self.target.pk).exists())

    def test_main_admin_protected(self):
        self.c.force_authenticate(self.staff_admin)
        self.assertEqual(self.c.delete(f'/api/users/admin/users/{self.main_admin.id}/').status_code, 400)
        self.assertEqual(self.c.patch(f'/api/users/admin/users/{self.main_admin.id}/', {'is_active': False}, format='json').status_code, 400)
        self.c.force_authenticate(self.main_admin)
        r = self.c.delete(f'/api/users/admin/users/{self.main_admin.id}/?permanent=true', {'confirm_email': 'admin@paws.rs'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.main_admin.refresh_from_db()
        self.assertTrue(self.main_admin.is_active)

    def test_string_false_does_not_activate(self):
        self.c.force_authenticate(self.main_admin)
        self.c.patch(f'/api/users/admin/users/{self.target.id}/', {'is_active': 'false'}, format='json')
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_stats_reflect_changes(self):
        self.c.force_authenticate(self.main_admin)
        before = self.c.get('/api/users/admin/stats/').data['inactive_users']
        self.c.delete(f'/api/users/admin/users/{self.target.id}/')
        after = self.c.get('/api/users/admin/stats/').data['inactive_users']
        self.assertEqual(after, before + 1)


class TokenTests(TestCase):
    def test_refresh_for_deleted_user_is_401(self):
        u = make_user('brisan@primer.rs')
        refresh = str(RefreshToken.for_user(u))
        u.delete()
        r = APIClient().post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_refresh_for_deactivated_user_is_401(self):
        u = make_user('ban@primer.rs')
        refresh = str(RefreshToken.for_user(u))
        u.is_active = False
        u.save()
        r = APIClient().post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_deactivated_user_cannot_log_in(self):
        make_user('ban@primer.rs', active=False)
        r = APIClient().post('/api/auth/login/', {'email': 'ban@primer.rs', 'password': STRONG}, format='json')
        self.assertEqual(r.status_code, 401)


class HealthCheckTests(TestCase):
    def test_health_does_not_touch_database(self):
        before = User.objects.count()
        with CaptureQueriesContext(connection) as ctx:
            r = APIClient().get('/api/health/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(ctx.captured_queries), 0)
        self.assertEqual(User.objects.count(), before)


class TestDatabaseIsolationTests(TestCase):
    def test_tests_never_use_production_database(self):
        from django.conf import settings
        db = settings.DATABASES['default']
        self.assertTrue(db['ENGINE'].endswith('sqlite3') or 'test' in str(db.get('NAME', '')).lower()
                        or settings.APP_ENV == 'test')
        self.assertEqual(settings.APP_ENV, 'test')
