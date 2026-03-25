# Paws 🐾

A platform connecting dog owners with walkers and sitters. Serbian market.

## Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Django + Django REST Framework + SimpleJWT + PostgreSQL |
| **Web frontend** | React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query |
| **Mobile app** | React Native + Expo SDK 55 (Android) |
| **Images** | Cloudinary |
| **Chat bot** | Groq API (Llama 4) |
| **Maps (web)** | Leaflet + react-leaflet |
| **GPS (mobile)** | expo-location |
| **Hosting** | Render (backend) · Vercel (frontend) · Neon (database) |

## Project structure

```
paws_app_git/
├── backend/       # Django API
├── frontend/      # React web app
├── mobile/        # React Native / Expo
├── render.yaml    # Render deploy config
└── plan.txt       # Development roadmap and TODO list
```

## Running locally

### Backend

```bash
cd backend
source venv/Scripts/activate      # Windows: venv\Scripts\activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

API available at: `http://localhost:8001/api`

### Frontend (web)

```bash
cd frontend
npm install
npm run dev
```

Web app available at: `http://localhost:5173`

### Mobile app

```bash
cd mobile
npm install
npx expo start          # Expo Go (QR code)
npx expo start --clear  # with cache reset
```

For Android emulator: press `a` in the terminal (Android Studio required).

For release APK build:
```
powershell.exe -ExecutionPolicy Bypass -File android/build_release.ps1
```
APK output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

## Environment variables

### Backend (`.env`)

```
SECRET_KEY=
DEBUG=True
DATABASE_URL=               # or DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
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

### Mobile app (`.env`)

```
EXPO_PUBLIC_API_URL=https://paws-app.onrender.com/api
```

## Features

- **Authentication** — JWT login/registration, roles: owner / walker / admin; email verification on registration
- **Walkers** — search by location (haversine), service type and price; featured walkers highlighted
- **Reservations** — create, accept/reject, cancel (blocked within 3h of start); statuses: pending → confirmed → in_progress → completed
- **Live GPS tracking** — walker shares location every 5s during a walk; owner watches live on a Leaflet map (web) or opens native Maps (mobile)
- **Dogs** — CRUD with photo upload, breeds, size, temperament notes
- **Chat** — real-time messaging between owners and walkers + AI assistant (Paws topics only, Groq/Llama 4)
- **Reviews** — owner rates walker after a completed reservation; displayed on walker profiles (web + mobile)
- **Push notifications** — Expo push notifications on reservation changes and walk start/end
- **Admin panel** — available on web and mobile; manage users (ban/unban, feature toggle), reservations, reviews, dogs; all actions logged to AuditLog
- **Deep linking** — `paws://` scheme + `https://paws.rs` for direct navigation into the mobile app
- **Soft delete** — deactivating accounts instead of hard-deleting; history preserved

## Key API endpoints

```
POST       /api/auth/login/                   JWT login
POST       /api/users/register/               Registration
GET        /api/users/verify-email/           Email verification (?token=)
POST       /api/users/resend-verification/    Resend verification email
GET        /api/users/walkers/               Walker list (?lat, ?lng, ?radius, ?usluga, ?cena_max, ?istaknuti)
GET        /api/users/walkers/:id/           Walker profile
GET/PATCH  /api/users/profile/              My profile
PATCH      /api/users/profile/image/         Upload profile photo
DELETE     /api/users/profile/image/         Remove profile photo
DELETE     /api/users/profile/delete/        Deactivate account (soft delete)
POST       /api/users/push-token/            Register Expo push token
GET/POST   /api/reservations/               Reservations list / create
POST       /api/reservations/:id/respond/    Accept or reject (walker)
POST       /api/reservations/:id/cancel/     Cancel reservation
POST       /api/reservations/:id/complete/   Mark as completed (walker)
POST       /api/reservations/:id/start/      Start walk → in_progress (walker)
GET/POST   /api/reservations/:id/location/   Read or update live GPS location
GET        /api/reservations/pending-count/  Unread pending count (badge)
GET/POST   /api/dogs/                       My dogs
GET/POST   /api/chat/:user_id/              Conversation messages
GET        /api/reviews/walker/:id/         Reviews for a walker
POST       /api/reviews/                    Submit a review
GET        /api/users/admin/stats/          Admin dashboard stats
GET        /api/users/admin/users/          Admin user list (search, filter)
GET/PATCH  /api/users/admin/users/:id/     Admin user detail, ban/unban, is_featured
DELETE     /api/users/admin/users/:id/     Admin deactivate user
GET        /api/users/admin/reservations/  Admin reservation list
GET        /api/users/admin/reviews/       Admin review list
GET        /api/users/admin/dogs/          Admin dog list
```

## Deploy

Backend auto-deploys to Render on every push to `main`.
`render.yaml` includes `python manage.py migrate` — migrations run automatically.

> **Note:** Render free tier has a cold start of 30–60 seconds if the server has been idle.
