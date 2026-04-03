# Paws

A platform connecting dog owners with walkers and sitters. Built for the Serbian market.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Django 6, Django REST Framework, SimpleJWT, PostgreSQL 16 |
| **Web Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, TanStack Query, React Hook Form + Zod |
| **Mobile App** | React Native 0.83, Expo SDK 55 (Android), React Navigation, TanStack Query |
| **Images** | Cloudinary |
| **AI Chat** | Groq API (Llama 4) |
| **Maps (web)** | Leaflet + react-leaflet |
| **Maps (mobile)** | OpenStreetMap tile grid + expo-location |
| **Notifications** | Expo Push Notifications + Firebase Cloud Messaging |
| **Hosting** | Render (backend), Vercel (frontend), Neon (PostgreSQL) |

## Project Structure

```
paws_app_git/
├── backend/                # Django API
│   ├── config/             # Django settings, URLs, WSGI
│   ├── users/              # Auth, profiles, walkers, admin, favorites
│   ├── dogs/               # CRUD for dogs, image uploads
│   ├── reservations/       # Bookings, GPS tracking, lifecycle
│   ├── reviews/            # Ratings and reviews
│   └── chat/               # Messaging, AI assistant
├── frontend/               # React web app
│   └── src/pages/          # 14 pages (home, walkers, reservations, chat, admin...)
├── mobile/                 # React Native / Expo
│   └── src/
│       ├── screens/        # 13 screens
│       ├── navigation/     # Tab + Stack navigation
│       ├── api/            # API client with token refresh mutex
│       ├── context/        # Auth context, Query client
│       └── components/     # OfflineBanner, shared components
├── docker-compose.yml      # Local dev setup (backend + frontend + PostgreSQL)
├── render.yaml             # Render deploy config
└── plan.txt                # Development roadmap
```

## Running Locally

### Docker (easiest)

```bash
docker-compose up
```

Backend at `http://localhost:8000/api`, frontend at `http://localhost:5173`.

### Manual Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

API: `http://localhost:8001/api`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Web app: `http://localhost:5173`

#### Mobile App

```bash
cd mobile
npm install
npx expo start          # Expo Go (scan QR code)
npx expo start --clear  # with cache reset
```

For Android emulator: press `a` in the terminal (requires Android Studio).

Release APK build (PowerShell):
```powershell
cd mobile
powershell -ExecutionPolicy Bypass -Command "npx expo prebuild --clean"
powershell.exe -ExecutionPolicy Bypass -File build_apk.ps1
```
APK output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

> **Note:** `build_apk.ps1` already cleans the build cache — no separate clean step needed.
> Windows may block scripts by default; always use `-ExecutionPolicy Bypass`.

## Environment Variables

### Backend (`.env`)

```env
SECRET_KEY=                               # REQUIRED — no default, app won't start without it
DEBUG=False                               # default is False, set True for local dev
DATABASE_URL=                             # or DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=
FRONTEND_URL=http://localhost:5173
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:8001/api
```

### Mobile (`.env`)

```env
EXPO_PUBLIC_API_URL=https://paws-app.onrender.com/api
```

## Features

### Authentication & Users
- JWT login/registration with email verification
- Three roles: owner, walker, admin
- Forgot/reset password via email link with token
- Soft delete — account deactivation instead of hard delete
- Profile photo upload (Cloudinary)

### Walkers
- Search by location (haversine formula), service type (walking/sitting), max price
- Featured walker badge — toggled by admin
- Average rating and review count on profiles
- Favorites — owners can save preferred walkers

### Reservations
- Create bookings with dog selection, time slot, service type
- Lifecycle: pending → confirmed → in_progress → completed
- Walker accepts/rejects, owner cancels (blocked within 3h of start)
- Validations: min 15 min duration, max 90 days ahead, walking must be 30/60/90/120/180 min
- Atomic transactions to prevent race conditions
- Busy slot display: web shows color-coded calendar (red=confirmed, yellow=pending), mobile shows list with overlap validation

### Live GPS Tracking
- Walker broadcasts location every 5s during a walk
- Web: owner watches on a Leaflet map in real-time
- Mobile: static OpenStreetMap image with live marker + "Open in Maps" button + GPS error handling
- Coordinate validation (lat -90..90, lng -180..180)

### Dogs
- CRUD with image upload
- Fields: name, breed, size (mali/srednji/veliki), age, gender, neutered, temperament, notes
- Form validation (name max 50 chars, age 0–30)

### Chat
- Direct messaging between owners and walkers
- AI assistant (Groq/Llama 4) — responds only to dog/service topics
- Prompt injection protection with unicode normalization
- Create reservations directly through chat

### Reviews
- Owner rates walker after a completed reservation
- Displayed on walker profiles (web + mobile)

### Push Notifications
- Expo push notifications on reservation status changes
- Notifications when a walk starts/ends
- Badge counts on tab bar (unread messages + pending reservations)

### Admin Panel
- Available on both web and mobile
- Manage users (ban/unban, featured toggle)
- View all reservations, reviews, dogs
- Dashboard with stats
- All actions logged to AuditLog

### Security
- Registration restricted to owner/walker roles only (no admin via API)
- Role is read-only after registration — cannot be changed via profile update
- Admin endpoints protected with IsAdmin permission class + AuditLog
- CORS domain whitelist (no allow-all)
- Rate limiting: login 10/min, registration 20/hr, password reset 5/hr, reservations 30/hr, chat 60/min
- Dog ownership validation — users can only reserve their own dogs
- Walker role + active status verification on reservations
- Chat bot reservation creation validates times, service type, walker status
- Direct message length limit (2000 chars)
- Chat prompt injection detection with unicode normalization
- Image upload validation (type whitelist + 5 MB size limit)
- Native DateTimePicker prevents selecting past dates/times
- Health check endpoint: `GET /api/health/` (no DB queries)

### Other
- Deep linking: `paws://` scheme + `https://paws.rs`
- Offline banner (mobile) — connectivity detection
- Token refresh mutex for handling concurrent 401 responses
- Upload limit: 5 MB
- Request timeout: 15s (mobile)

## API Endpoints

### Auth
```
POST   /api/auth/login/                    JWT login (throttled: 10/min)
POST   /api/auth/refresh/                  Refresh access token
GET    /api/health/                        Health check (no DB)
```

### Users
```
POST   /api/users/register/                Registration
GET    /api/users/verify-email/            Email verification (?token=)
POST   /api/users/resend-verification/     Resend verification email
POST   /api/users/forgot-password/         Request password reset
POST   /api/users/reset-password/          Reset password with token
GET    /api/users/walkers/                 Walker list (?lat, ?lng, ?radius, ?usluga, ?cena_max, ?istaknuti)
GET    /api/users/walkers/:id/             Walker profile
GET    /api/users/profile/                 My profile
PATCH  /api/users/profile/                 Update profile
PATCH  /api/users/profile/image/           Upload profile photo
DELETE /api/users/profile/image/           Remove profile photo
DELETE /api/users/profile/delete/          Deactivate account (soft delete)
POST   /api/users/push-token/             Register Expo push token
GET    /api/users/favorites/               Favorite walkers list
POST   /api/users/favorites/:id/toggle/    Add/remove from favorites
```

### Reservations
```
GET    /api/reservations/                  List reservations
POST   /api/reservations/                  Create reservation
GET    /api/reservations/:id/              Reservation detail
POST   /api/reservations/:id/respond/      Accept or reject (walker)
POST   /api/reservations/:id/cancel/       Cancel reservation
POST   /api/reservations/:id/start/        Start walk → in_progress (walker)
POST   /api/reservations/:id/complete/     Complete walk (walker)
GET    /api/reservations/:id/location/     Get live GPS location
POST   /api/reservations/:id/location/     Update GPS location
GET    /api/reservations/pending-count/    Unread pending count (badge)
GET    /api/reservations/busy/             Walker busy slots (?walker, ?date)
```

### Dogs
```
GET    /api/dogs/                          My dogs
POST   /api/dogs/                          Add dog
GET    /api/dogs/:id/                      Dog detail
PUT    /api/dogs/:id/                      Update dog
DELETE /api/dogs/:id/                      Delete dog
```

### Chat
```
GET    /api/chat/:user_id/                 Conversation messages
POST   /api/chat/:user_id/                 Send message
```

### Reviews
```
GET    /api/reviews/walker/:id/            Reviews for a walker
POST   /api/reviews/                       Submit a review
```

### Admin
```
GET    /api/users/admin/stats/             Dashboard stats
GET    /api/users/admin/users/             User list (search, filter)
GET    /api/users/admin/users/:id/         User detail
PATCH  /api/users/admin/users/:id/         Update user (ban, featured)
DELETE /api/users/admin/users/:id/         Deactivate user
GET    /api/users/admin/reservations/      Reservation list
GET    /api/users/admin/reviews/           Review list
GET    /api/users/admin/dogs/              Dog list
```

## Tests

```bash
cd backend
python manage.py test                      # all tests
python manage.py test users                # user tests
python manage.py test reservations         # reservation tests
python manage.py test dogs                 # dog tests
```

> **Note:** Tests require CREATEDB permission on the database user:
> `ALTER USER paws_user CREATEDB;`

## Deploy

### Backend (Render)
- Auto-deploys on push to `main`
- `render.yaml` runs migrations automatically
- Render free tier has a 30–60s cold start after inactivity

### Frontend (Vercel)
- SPA routing configured in `vercel.json`
- Build: `tsc -b && vite build`

### Database (Neon)
- Serverless PostgreSQL
- Connection string passed via `DATABASE_URL` env variable

## DB Backup / Restore

```bash
# Backup
pg_dump -U paws_user -d paws_db -F c -f paws_backup.dump

# Restore
pg_restore -U paws_user -d paws_db --clean --if-exists paws_backup.dump
```
