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

- **Authentication** — JWT login/registration, roles: owner / walker / admin
- **Walkers** — search by location (haversine), service type and price; featured walkers
- **Reservations** — create, accept/reject, cancel with rules (blocked within 3h of start)
- **Dogs** — CRUD with photo upload, breeds, temperament tags
- **Chat** — messaging between owners and walkers + AI bot (Paws topics only)
- **Reviews** — rate walkers after a completed reservation
- **Admin panel** — manage users, reservations, reviews
- **Email verification** — confirm email address on registration

## Key API endpoints

```
POST       /api/auth/login/                 JWT login
POST       /api/users/register/             Registration
GET        /api/users/verify-email/         Email verification (?token=)
GET        /api/users/walkers/              Walker list (?lat, ?lng, ?radius, ?usluga)
GET        /api/users/walkers/:id/          Walker profile
GET/PATCH  /api/users/profile/             My profile
PATCH      /api/users/profile/image/        Upload profile photo
GET/POST   /api/reservations/              Reservations
POST       /api/reservations/:id/respond/   Accept/reject (walker)
POST       /api/reservations/:id/cancel/    Cancel
GET/POST   /api/dogs/                      My dogs
GET/POST   /api/chat/:user_id/             Messages
```

## Deploy

Backend auto-deploys to Render on every push to `main`.
`render.yaml` includes `python manage.py migrate` — migrations run automatically.

> **Note:** Render free tier has a cold start of 30–60 seconds if the server has been idle.
