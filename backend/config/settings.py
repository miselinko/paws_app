from pathlib import Path
from decouple import config
from datetime import timedelta
from urllib.parse import urlparse
import os
import sys
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,.onrender.com').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'cloudinary',
    # Local apps
    'users',
    'dogs',
    'reservations',
    'reviews',
    'chat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Baza ──────────────────────────────────────────────────────────────
# Okruženja: APP_ENV=production (Render), development (lokalno), test (testovi).
# Testovi UVEK koriste izolovanu bazu (SQLite u memoriji ili TEST_DATABASE_URL),
# nikad produkcijsku — čak i ako je DATABASE_URL u .env-u produkcijski.
RUNNING_TESTS = len(sys.argv) > 1 and sys.argv[1] == 'test'
# Render automatski postavlja RENDER=true; svuda drugde podrazumevano je "development".
APP_ENV = 'test' if RUNNING_TESTS else config('APP_ENV', default='production' if os.environ.get('RENDER') else 'development')

# Hostovi produkcijske baze (Neon compute endpoint, npr. "ep-xxxx"). Van produkcije
# aplikacija odbija da se poveže na njih, da lokalni razvoj ne bi pisao u pravu bazu.
PRODUCTION_DB_HOST_MARKERS = [h.strip() for h in config('PRODUCTION_DB_HOST_MARKERS', default='ep-wandering-smoke-al2o1inw').split(',') if h.strip()]


def _db_from_url(url):
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    return dj_database_url.parse(url, conn_max_age=600, conn_health_checks=True)


if RUNNING_TESTS:
    TEST_DATABASE_URL = config('TEST_DATABASE_URL', default='')
    if TEST_DATABASE_URL:
        DATABASES = {'default': _db_from_url(TEST_DATABASE_URL)}
    else:
        DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
else:
    DATABASE_URL = config('DATABASE_URL', default=None)
    if DATABASE_URL:
        DATABASES = {'default': _db_from_url(DATABASE_URL)}
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': config('DB_NAME', default='paws_db'),
                'USER': config('DB_USER', default='paws_user'),
                'PASSWORD': config('DB_PASSWORD', default='paws_password'),
                'HOST': config('DB_HOST', default='localhost'),
                'PORT': config('DB_PORT', default='5432'),
            }
        }

_db_host = DATABASES['default'].get('HOST') or ''
if APP_ENV != 'production' and any(m in _db_host for m in PRODUCTION_DB_HOST_MARKERS):
    raise ImproperlyConfigured(
        'Okruženje "%s" pokušava da koristi PRODUKCIJSKU bazu. Koristi Neon granu "dev" '
        '(DATABASE_URL) za lokalni razvoj. Produkcijska baza je samo za APP_ENV=production.' % APP_ENV
    )

AUTH_USER_MODEL = 'users.User'

# Deljeni keš u bazi: throttle brojači važe za sve gunicorn procese i posle restarta.
# Tabelu pravi migracija users/0011_cache_table.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'paws_cache',
        'OPTIONS': {'MAX_ENTRIES': 20000},
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'config.throttling.AnonRateThrottle',
        'config.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/day',
        'user': '2000/day',
        'login': '10/minute',
        'register': config('REGISTER_THROTTLE_RATE', default='5/hour'),
        'register_daily': config('REGISTER_DAILY_THROTTLE_RATE', default='15/day'),
        'resend_verification': '3/hour',
        'password_reset': '5/hour',
        'reservation_create': '30/hour',
        'chat_message': '60/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    # Deaktiviran nalog ne može da osveži token (default u simplejwt 5.5 je True; eksplicitno).
    'CHECK_USER_IS_ACTIVE': True,
}

if RUNNING_TESTS:
    # Throttle brojači žive u kešu; u testovima keš je isključen (testovi za
    # throttle eksplicitno uključuju LocMemCache).
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL', default=False, cast=bool)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://localhost:3000',
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ── Zaštita registracije ─────────────────────────────────────────────
# Cloudflare Turnstile (besplatan). Bez TURNSTILE_SECRET_KEY provera je isključena.
TURNSTILE_SECRET_KEY = config('TURNSTILE_SECRET_KEY', default='')
# Kad je True, registracija bez CAPTCHA tokena se odbija (uključiti tek kad su web i
# novi APK sa CAPTCHA-om objavljeni, da stari APK ne bi prestao da radi).
TURNSTILE_ENFORCE = config('TURNSTILE_ENFORCE', default=False, cast=bool)

# Šetači registrovani posle ovog datuma vide se u pretrazi tek kad potvrde email.
# Postojeći nalozi (pre datuma) ostaju vidljivi i nisu zaključani.
WALKER_EMAIL_VERIFICATION_REQUIRED_FROM = config('WALKER_EMAIL_VERIFICATION_REQUIRED_FROM', default='2026-11-24')

# Glavni administrator — ne može se deaktivirati ni obrisati preko API-ja.
PROTECTED_ADMIN_EMAILS = [e.strip().lower() for e in config('PROTECTED_ADMIN_EMAILS', default='admin@paws.rs').split(',') if e.strip()]

GROQ_API_KEY = config('GROQ_API_KEY', default='')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# Email
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Paws Platforma <noreply@paws.rs>')

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Belgrade'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': config('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default=''),
}

STORAGES = {
    'default': {
        'BACKEND': 'config.cloudinary_storage.CloudinaryMediaStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5 MB

# ── Security (production only) ──────────────────────────────────
if not DEBUG and not RUNNING_TESTS:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

if RUNNING_TESTS:
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    TURNSTILE_SECRET_KEY = ''
