# Paws App - Architecture & Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Backend](#backend)
   - [Django Apps](#django-apps)
   - [Database Schema](#database-schema)
   - [API Endpoints](#api-endpoints)
   - [Authentication](#authentication)
   - [Third-Party Integrations](#third-party-integrations)
5. [Frontend (Web)](#frontend-web)
   - [Pages & Routes](#pages--routes)
   - [Components](#components)
   - [State Management](#state-management)
6. [Mobile App](#mobile-app)
   - [Screens & Navigation](#screens--navigation)
   - [Native Features](#native-features)
7. [Feature Parity Matrix](#feature-parity-matrix)
8. [Infrastructure & Deployment](#infrastructure--deployment)
9. [Security](#security)

---

## Overview

Paws is a full-stack dog walking and boarding marketplace connecting dog owners with professional walkers/sitters. The platform includes a Django REST API backend, a React web frontend, and a React Native (Expo) mobile app.

**Core user flows:**
- Owners register, add their dogs, browse walkers, make reservations, chat, and leave reviews
- Walkers register, set rates and availability, accept/reject bookings, track walks via GPS
- Admins manage users, reservations, reviews, and dogs from a dashboard

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Django + Django REST Framework | 5.x |
| **Auth** | SimpleJWT (access + refresh tokens) | - |
| **Database** | PostgreSQL (Neon serverless in prod) | - |
| **Media Storage** | Cloudinary | - |
| **AI Chatbot** | Groq API (LLaMA 4 Scout) | - |
| **Frontend** | React 19 + Vite 8 | 19.2.4 |
| **CSS** | Tailwind CSS 4 | 4.2.1 |
| **Forms** | React Hook Form + Zod | 7.x / 4.x |
| **Maps (Web)** | Leaflet + React Leaflet | 1.9.4 |
| **Routing (Web)** | React Router v7 | 7.13.1 |
| **Mobile** | React Native + Expo SDK 55 | 0.83.2 |
| **Navigation (Mobile)** | React Navigation 7 (native-stack + bottom-tabs) | 7.x |
| **Maps (Mobile)** | react-native-maps | 1.27.2 |
| **Data Fetching** | TanStack Query v5 (both web & mobile) | 5.90+ |
| **HTTP Client** | Axios (with JWT refresh interceptor) | 1.x |
| **Geocoding** | Nominatim (OpenStreetMap) | - |
| **Push Notifications** | Expo Notifications | 55.x |

---

## Project Structure

```
paws_app_git/
├── backend/
│   ├── config/           # Django settings, URLs, WSGI, Cloudinary storage
│   ├── users/            # User model, auth, walkers, favorites, admin
│   ├── dogs/             # Dog profiles CRUD
│   ├── reservations/     # Booking lifecycle, GPS tracking
│   ├── reviews/          # Rating system
│   ├── chat/             # Messaging + AI chatbot
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios API modules (users, dogs, reservations, reviews, chat, admin)
│   │   ├── components/   # Navbar, AdresaInput, MapaPicker, MapaSetac, Reveal
│   │   ├── context/      # AuthContext
│   │   ├── pages/        # 14 page components
│   │   ├── types/        # TypeScript interfaces
│   │   ├── App.tsx        # Routes & guards
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── mobile/
│   ├── src/
│   │   ├── api/          # Axios API modules (mirroring frontend)
│   │   ├── context/      # AuthContext, queryClient
│   │   ├── navigation/   # RootNavigator, MainTabs, stack navigators
│   │   ├── screens/      # 16 screen components
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Push notification helpers
│   ├── app.json          # Expo config, permissions, deep linking
│   └── package.json
└── README.md
```

---

## Backend

### Django Apps

#### 1. Users (`users/`)

**Models:**

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **User** | email (USERNAME_FIELD), first_name, last_name, phone, role (`owner`/`walker`/`admin`), address, lat, lng, profile_image, is_email_verified | Custom auth model |
| **WalkerProfile** | user (OneToOne), hourly_rate, daily_rate, services (`walking`/`boarding`/`both`), bio, active, is_featured, availability (JSON) | Walker-specific data |
| **Favorite** | user, walker (unique_together) | Owner favorites a walker |
| **EmailVerificationToken** | user, token (UUID), used, created_at | Email verification (24h expiry) |
| **PasswordResetToken** | user, token (UUID), used, created_at | Password reset (1h expiry) |
| **PushToken** | user (OneToOne), token | Expo push notification token |
| **AuditLog** | admin, target_user, action (`ban`/`unban`/`feature`/`unfeature`/`delete`), note | Admin action tracking |

#### 2. Dogs (`dogs/`)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Dog** | owner (FK User), name, breed, age, weight, size (`small`/`medium`/`large`), gender (`male`/`female`), neutered, temperament, notes, image | Dog profile |

#### 3. Reservations (`reservations/`)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Reservation** | owner (FK), walker (FK), dogs (M2M), service_type, duration, start_time, end_time, status (`pending`/`confirmed`/`in_progress`/`rejected`/`completed`/`cancelled`), notes, cancelled_by, last_lat, last_lng, walk_started_at | Booking lifecycle |

**Status transitions:**
```
pending ──> confirmed ──> in_progress ──> completed
   │            │
   └──> rejected/cancelled
```

#### 4. Reviews (`reviews/`)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Review** | reservation (OneToOne), owner (FK), walker (FK), rating (1-5), comment | Post-completion rating |

#### 5. Chat (`chat/`)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Message** | sender (FK), recipient (FK), text, created_at, read | Direct messaging |

---

### Database Schema

```
User ─────────────────────────────────────────────────────┐
 │ OneToOne                                                │
 ├── WalkerProfile                                        │
 ├── PushToken                                            │
 │                                                         │
 │ FK (owner)              FK (walker)                     │
 ├── Dog ◄── M2M ──► Reservation ◄── OneToOne ── Review   │
 │                     │       │                           │
 │                     │ owner │ walker                    │
 │                     └───────┘                           │
 │ FK                                                      │
 ├── Favorite (user + walker unique)                       │
 ├── EmailVerificationToken                                │
 ├── PasswordResetToken                                    │
 ├── AuditLog (admin + target_user)                        │
 └── Message (sender + recipient) ◄────────────────────────┘
```

---

### API Endpoints

**Base URL:** `/api`

#### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login/` | Public | JWT login (throttled 10/min) |
| POST | `/auth/refresh/` | Public | Refresh access token |

#### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/users/register/` | Public | Create account |
| GET | `/users/verify-email/?token=` | Public | Verify email |
| POST | `/users/resend-verification/` | Public | Resend verification (5/hour) |
| POST | `/users/forgot-password/` | Public | Request password reset (5/hour) |
| POST | `/users/reset-password/` | Public | Reset password with token |
| GET/PATCH | `/users/profile/` | Auth | Get/update own profile |
| PATCH/DELETE | `/users/profile/image/` | Auth | Upload/delete profile photo |
| GET/PATCH | `/users/profile/walker/` | Auth | Walker profile settings |
| DELETE | `/users/profile/delete/` | Auth | Soft-delete account |
| POST | `/users/push-token/` | Auth | Store push notification token |
| GET | `/users/walkers/` | Public | List walkers (paginated, filterable) |
| GET | `/users/walkers/:id/` | Public | Walker detail |
| POST | `/users/favorites/:id/toggle/` | Auth | Toggle favorite |
| GET | `/users/favorites/` | Auth | Get favorite IDs |

**Walker list filters:** `search`, `usluga` (service), `cena_max`, `istaknuti` (featured), `lat`/`lng`/`radius` (Haversine distance)

#### Dogs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/dogs/` | Auth | List own / create dog |
| GET/PATCH/DELETE | `/dogs/:id/` | Auth | Dog CRUD (owner only) |
| GET | `/dogs/:id/profile/` | Auth | Dog profile (owner or walker with reservation) |
| DELETE | `/dogs/:id/image/` | Auth | Delete dog photo |

#### Reservations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/reservations/` | Auth | List own / create reservation |
| GET | `/reservations/:id/` | Auth | Reservation detail |
| POST | `/reservations/:id/cancel/` | Auth | Cancel (owner: pending; both: confirmed, >3h before start) |
| POST | `/reservations/:id/respond/` | Auth | Walker accepts/rejects pending |
| POST | `/reservations/:id/start/` | Auth | Walker starts walk (up to 30min early) |
| POST/GET | `/reservations/:id/location/` | Auth | Walker posts GPS / owner reads GPS |
| POST | `/reservations/:id/complete/` | Auth | Mark completed |
| GET | `/reservations/pending-count/` | Auth | Pending count (walkers) |

#### Reviews
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reviews/` | Auth | Create review (completed reservations only) |
| GET | `/reviews/walker/:id/` | Public | Walker's reviews |

#### Chat
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/chat/` | Auth | Conversations list |
| GET/POST | `/chat/:userId/` | Auth | Messages thread / send message |
| DELETE | `/chat/:userId/delete/` | Auth | Delete conversation |
| GET | `/chat/unread/` | Auth | Unread message count |
| POST | `/chat/bot/` | Auth | AI chatbot (Groq/LLaMA) |

#### Admin (requires `role=admin`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/admin/stats/` | Dashboard statistics |
| GET | `/users/admin/users/` | Paginated user list (filterable) |
| GET/PATCH/DELETE | `/users/admin/users/:id/` | User detail / toggle active/featured / soft-delete |
| GET | `/users/admin/reservations/` | All reservations (filterable) |
| GET | `/users/admin/reviews/` | All reviews (filterable) |
| GET | `/users/admin/dogs/` | All dogs (filterable) |

---

### Authentication

**Flow:**
1. `POST /auth/login/` with `{email, password}` returns `{access, refresh}` tokens
2. Access token (60 min lifetime) sent as `Authorization: Bearer <token>` header
3. On 401, client auto-refreshes via `POST /auth/refresh/` with refresh token (7 day lifetime)
4. On refresh failure, client clears tokens and redirects to login

**Additional auth features:**
- Email verification on registration (24h token expiry)
- Password reset via email (1h token expiry)
- Rate limiting: login 10/min, password reset 5/hour, anonymous 200/day, authenticated 2000/day

---

### Third-Party Integrations

| Service | Purpose | Details |
|---------|---------|---------|
| **Cloudinary** | Media storage | All profile images and dog photos. Custom `CloudinaryMediaStorage` backend. Max 5MB, JPEG/PNG/WebP/GIF |
| **Groq AI** | Chatbot | LLaMA 4 Scout model. Agentic loop with function calling (get_walkers, get_my_dogs, create_reservation). Serbian-only, prompt injection protection (20+ patterns) |
| **Nominatim** | Geocoding | Address autocomplete + reverse geocoding for GPS coordinates. Serbia-focused (countrycodes=rs) |
| **Expo Push** | Push notifications | New reservations, status changes, walk start/complete, new messages. Sent async via threading |
| **Gmail SMTP** | Email | Verification emails, password reset, reservation notifications |

---

## Frontend (Web)

### Pages & Routes

| Route | Component | Access | Key Features |
|-------|-----------|--------|-------------|
| `/` | HomePage | Public | Hero, service showcase, stats, CTA |
| `/walkers` | SetaciPage | Public | Walker search with filters (service, location, price, size), favorites, sorting |
| `/walkers/:id` | SetacProfilPage | Public | Walker profile, availability calendar, Leaflet map, booking form, reviews |
| `/login` | PrijavaPage | Guest | Email/password login with Zod validation |
| `/register` | RegistracijaPage | Guest | Role-based registration, GPS + address autocomplete, Leaflet map picker |
| `/forgot-password` | ForgotPasswordPage | Guest | Password recovery email request |
| `/reset-password` | ResetPasswordPage | Guest | Token-based password reset |
| `/verify-email` | VerifyEmailPage | Guest | Email verification via token |
| `/reservations` | RezervacijePage | Private | Reservation management, status actions, walk tracking map, review form |
| `/my-dogs` | MojiPsiPage | Private | Dog CRUD with image upload, breed autocomplete |
| `/dogs/:id` | PasProfilPage | Private | Read-only dog profile |
| `/profile` | ProfilPage | Private | Profile editing, walker settings, availability scheduling, account deletion |
| `/messages` | PorukePage | Private | Two-panel chat, AI assistant, infinite scroll |
| `/admin` | AdminPage | Admin | Dashboard stats, user/reservation/review/dog management |

**Route guards:** `PrivateRoute` (authenticated), `GuestRoute` (unauthenticated), `AdminRoute` (role=admin)

### Components

| Component | Purpose |
|-----------|---------|
| **Navbar** | Sticky header, user menu, unread badge, pending reservations badge, role-based links |
| **AdresaInput** | Photon/Nominatim address autocomplete with debounce |
| **MapaPicker** | Leaflet interactive map, click-to-select location with reverse geocoding |
| **MapaSetac** | Leaflet map showing walker/owner locations |
| **Reveal** | Scroll-triggered fade/slide animation (IntersectionObserver) |

### State Management

- **Server state:** TanStack Query (staleTime: 30s, retry: 1)
- **Auth state:** React Context (`AuthContext`) with localStorage tokens
- **Form state:** React Hook Form + Zod schemas
- **Token refresh:** Axios response interceptor with mutex pattern

---

## Mobile App

### Screens & Navigation

**Navigation hierarchy:**
```
RootNavigator (Stack)
├── [Unauthenticated]
│   ├── Login
│   ├── Register
│   ├── ForgotPassword
│   ├── ResetPassword (token param)
│   └── VerifyEmail (token param)
│
└── [Authenticated] MainTabs (Bottom Tabs)
    ├── Walkers Tab (Stack)
    │   ├── WalkersScreen (search, filters, favorites)
    │   ├── WalkerDetailScreen (profile, calendar, booking)
    │   └── CreateReservationScreen (booking form)
    │
    ├── Reservations Tab (Stack)
    │   ├── ReservationsScreen (status filter tabs)
    │   ├── ReservationDetailScreen (actions, GPS tracking)
    │   └── DogProfileScreen (read-only)
    │
    ├── My Dogs Tab (owners only)
    │   └── MojiPsiScreen (CRUD, image upload)
    │
    ├── Messages Tab
    │   └── PorukeScreen (conversations, chat, AI bot)
    │
    ├── Admin Tab (admins only)
    │   └── AdminScreen (dashboard, user/data management)
    │
    └── Profile Tab (Stack)
        └── ProfileScreen (edit info, walker settings, availability)
```

**Tab icons:** Walkers (🐕), Reservations (📅), My Dogs (🦴), Messages (💬), Admin (🛡️), Profile (👤)

**Deep linking scheme:** `paws://` and `https://paws.rs`
- `paws://reset-lozinka?token=...` -> ResetPassword
- `paws://verify-email?token=...` -> VerifyEmail
- `paws://setaci` -> Walkers
- `paws://rezervacije` -> Reservations
- `paws://poruke` -> Messages
- `paws://profil` -> Profile

### Native Features

| Feature | Implementation | Usage |
|---------|---------------|-------|
| **GPS Location** | `expo-location` | Registration address auto-fill, profile edit, walker proximity search (25km), walk GPS tracking |
| **Push Notifications** | `expo-notifications` | Reservation updates, new messages, walk start/complete. Android channel: "Paws obaveštenja" |
| **Image Picker** | `expo-image-picker` | Profile photos, dog photos. Square crop, 80% quality |
| **Maps** | `react-native-maps` | Walker location, walk tracking |
| **Deep Linking** | Expo linking config | Password reset, email verification, screen navigation |
| **Async Storage** | `@react-native-async-storage` | JWT tokens, session persistence |

**Android permissions:** ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, READ_MEDIA_IMAGES, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE

---

## Feature Parity Matrix

| Feature | Web | Mobile |
|---------|-----|--------|
| Registration (owner/walker) | Yes | Yes |
| GPS + address autocomplete | Yes (Leaflet map + Nominatim) | Yes (expo-location + Nominatim) |
| Login / Logout | Yes | Yes |
| Forgot / Reset password | Yes | Yes (+ deep linking) |
| Email verification | Yes | Yes (+ deep linking) |
| Browse walkers (search, filters) | Yes | Yes |
| Walker profile + booking | Yes | Yes |
| Favorite walkers | Yes | Yes |
| Dog CRUD + image upload | Yes | Yes |
| Dog profile view | Yes | Yes |
| Reservations (list, filter by status) | Yes | Yes |
| Accept / Reject reservation | Yes | Yes |
| Start walk + GPS tracking | Yes | Yes |
| Complete reservation | Yes | Yes |
| Cancel reservation | Yes | Yes |
| Leave review | Yes | Yes |
| Chat (direct messaging) | Yes | Yes |
| AI chatbot assistant | Yes | Yes |
| Push notifications | No (web) | Yes |
| Admin dashboard | Yes | Yes |
| Profile editing + availability | Yes | Yes |
| Delete account | Yes | Yes |

---

## Infrastructure & Deployment

| Component | Service | Details |
|-----------|---------|---------|
| **Backend** | Render | Django on Gunicorn, auto-deploy from main branch |
| **Database** | Neon | Serverless PostgreSQL, connected via DATABASE_URL |
| **Frontend** | Vercel | Vite build, auto-deploy from main branch |
| **Media** | Cloudinary | Image uploads (profiles, dogs) |
| **Mobile** | EAS Build | Expo Application Services for APK/IPA builds |

**Environment variables (backend):**
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DATABASE_URL` (Neon PostgreSQL)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `GROQ_API_KEY`
- `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `FRONTEND_URL`

**Environment variables (frontend):**
- `VITE_API_URL` (backend API base URL)
- `VITE_BACKEND_URL` (backend base URL for images)

**Environment variables (mobile):**
- `EXPO_PUBLIC_API_URL` (backend API base URL)

---

## Security

| Measure | Implementation |
|---------|---------------|
| **Authentication** | JWT with 60min access / 7day refresh tokens |
| **Authorization** | DRF permissions per view (IsAuthenticated, IsAdmin, owner-only checks) |
| **Rate Limiting** | Per-endpoint throttling (login 10/min, reset 5/hour, anon 200/day, user 2000/day) |
| **Input Validation** | Serializer-level validation, Zod schemas on frontend |
| **File Uploads** | Type validation (JPEG/PNG/WebP/GIF only), 5MB size limit |
| **CORS** | Configured via django-cors-headers |
| **Password Security** | Django validators (similarity, min length, common, numeric) |
| **Token Security** | UUID tokens with expiry (24h email, 1h reset), atomic operations |
| **AI Safety** | Prompt injection detection (20+ patterns), unicode normalization, message length limits |
| **Audit Trail** | AuditLog for admin actions (ban, feature, delete) |
| **Soft Deletes** | Users deactivated (is_active=False), not permanently deleted |
