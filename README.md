# Paws 🐾

Platforma za povezivanje vlasnika pasa sa šetačima i čuvarima. Srpsko tržište.

## Stack

| Deo | Tehnologije |
|-----|------------|
| **Backend** | Django + Django REST Framework + SimpleJWT + PostgreSQL |
| **Web frontend** | React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query |
| **Mobilna app** | React Native + Expo SDK 55 (Android) |
| **Slike** | Cloudinary |
| **Chat bot** | Groq API (Llama 4) |
| **Hosting** | Render (backend) · Vercel (frontend) · Neon (baza) |

## Struktura projekta

```
paws_app_git/
├── backend/       # Django API
├── frontend/      # React web app
├── mobile/        # React Native / Expo
├── render.yaml    # Render deploy konfiguracija
└── plan.txt       # Plan razvoja i TODO lista
```

## Pokretanje lokalno

### Backend

```bash
cd backend
source venv/Scripts/activate      # Windows: venv\Scripts\activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

API dostupan na: `http://localhost:8001/api`

### Frontend (web)

```bash
cd frontend
npm install
npm run dev
```

Web app dostupna na: `http://localhost:5173`

### Mobilna app

```bash
cd mobile
npm install
npx expo start          # Expo Go (QR kod)
npx expo start --clear  # sa čišćenjem cache-a
```

Za Android emulator: pritisni `a` u terminalu (potreban Android Studio).

Za release APK build:
```
powershell.exe -ExecutionPolicy Bypass -File android/build_release.ps1
```
APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`

## Env varijable

### Backend (`.env`)

```
SECRET_KEY=
DEBUG=True
DATABASE_URL=               # ili DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=
FRONTEND_URL=http://localhost:5173
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Frontend (`.env`)

```
VITE_API_URL=http://localhost:8001/api
```

### Mobilna app (`.env`)

```
EXPO_PUBLIC_API_URL=https://paws-app.onrender.com/api
```

## Glavne funkcionalnosti

- **Autentifikacija** — JWT login/registracija, uloge: vlasnik / šetač / admin
- **Šetači** — pretraga po lokaciji (haversine), usluzi i ceni; istaknuti šetači
- **Rezervacije** — kreiranje, prihvatanje/odbijanje, otkazivanje sa pravilima (blokada <3h)
- **Psi** — CRUD sa foto uploadom, pasmine, temperament
- **Chat** — poruke između vlasnika i šetača + AI bot (samo teme vezane za Paws)
- **Recenzije** — ocenjivanje šetača posle završene rezervacije
- **Admin panel** — upravljanje korisnicima, rezervacijama, recenzijama
- **Email verifikacija** — potvrda email adrese pri registraciji

## API endpointi (ključni)

```
POST   /api/auth/login/                  JWT login
POST   /api/users/register/              Registracija
GET    /api/users/verify-email/          Verifikacija emaila (?token=)
GET    /api/users/walkers/               Lista šetača (?lat, ?lng, ?radius, ?usluga)
GET    /api/users/walkers/:id/           Profil šetača
GET/PATCH  /api/users/profile/           Moj profil
PATCH  /api/users/profile/image/         Upload profilne slike
GET/POST   /api/reservations/            Rezervacije
POST   /api/reservations/:id/respond/    Prihvati/odbij (šetač)
POST   /api/reservations/:id/cancel/     Otkaži
GET/POST   /api/dogs/                    Moji psi
GET/POST   /api/chat/:user_id/           Poruke
```

## Deploy

Backend se automatski deploya na Render pri svakom push-u na `main`.
`render.yaml` uključuje `python manage.py migrate` — migracije su automatske.

> **Napomena:** Render free tier ima cold start od 30–60 sekundi ako server nije bio aktivan.
