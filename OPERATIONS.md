# PawsApp: okruženja, bezbednost i održavanje

## Okruženja i baze

| Okruženje | Gde | Baza | `APP_ENV` |
| --- | --- | --- | --- |
| Produkcija | Render `paws_app` | Neon `paws_app_db`, grana **main** | `production` |
| Lokalni razvoj | tvoj računar | Neon `paws_app_db`, grana **dev** (anonimizovana kopija) | `development` |
| Automatski testovi | lokalno / GitHub Actions | SQLite u memoriji (ili `TEST_DATABASE_URL`) | `test` |

- `python manage.py test` **uvek** koristi izolovanu bazu, čak i ako `.env` sadrži produkcijski `DATABASE_URL`.
- Van produkcije backend **odbija** da se poveže na produkcijsku Neon bazu (`PRODUCTION_DB_HOST_MARKERS`).
- Grana `dev`: lažni emailovi (`korisnikN@dev.paws.local`), bez telefona, bez push tokena, lozinke onemogućene.
  Za prijavu napravi lokalnog korisnika: `python manage.py createsuperuser`.
- Grana `backup-before-test-cleanup-2026-11-24` je samo rezervna kopija, ne koristi je za razvoj.
- **Nikad** ne testiraj registraciju/rezervacije na `paws-app.onrender.com`; za to postoji `dev`.

## Zaštita registracije

- Ograničenje: 5 registracija na sat i 15 dnevno po IP adresi (`REGISTER_THROTTLE_RATE`, `REGISTER_DAILY_THROTTLE_RATE`).
- Skriveno polje (honeypot) `website` odbija jednostavne botove.
- Cloudflare Turnstile CAPTCHA (besplatna), web + aplikacija:
  1. Cloudflare dashboard → Turnstile → Add widget. Hostname: domen Vercel sajta (npr. `paws-app-seven.vercel.app`).
  2. Render env: `TURNSTILE_SECRET_KEY=<secret key>` (ostavi `TURNSTILE_ENFORCE=False`).
  3. Vercel env: `VITE_TURNSTILE_SITE_KEY=<site key>` → redeploy.
  4. Aplikacija: `EXPO_PUBLIC_TURNSTILE_SITE_KEY=<site key>` u `mobile/.env` → novi APK.
  5. Kad korisnici pređu na novi APK: Render `TURNSTILE_ENFORCE=True` (stari APK tada više ne može da registruje nalog).
- Šetači registrovani od `WALKER_EMAIL_VERIFICATION_REQUIRED_FROM` (2026-11-24) vide se u pretrazi tek posle potvrde emaila.
  Postojeći nalozi ostaju vidljivi i niko nije zaključan.
- **Email:** bez `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` i SMTP podataka na Render-u verifikacioni
  i reset mejlovi se samo ispisuju u log i ne stižu korisnicima.

## Administracija

- „Deaktiviraj" blokira prijavu i sakriva nalog. Podaci ostaju, a nalog može ponovo da se aktivira.
- „Trajno obriši" (samo web, samo superuser) traži upis emaila korisnika i nepovratno briše nalog i povezane podatke.
- `admin@paws.rs` (`PROTECTED_ADMIN_EMAILS`) i svi admin nalozi ne mogu da se deaktiviraju ni obrišu preko API-ja.

## Render Free plan (spavanje servera)

- Free servis se uspava posle ~15 min bez saobraćaja. Prvi zahtev ga budi za ~30–60 s.
- `/api/health/` ne dira bazu. Podesi ga kao **Health Check Path** (Render → paws_app → Settings).
- `.github/workflows/keepalive.yml` pinguje backend svakih 10 min od 07 do 23h. Noću server spava, da ukupna
  potrošnja ostane ispod 750 besplatnih sati mesečno (deli se sa servisom `dryfortis`).
- Web i aplikacija prikazuju „Server se pokreće…", čekaju do 70 s i same ponavljaju GET zahteve.
- Bez spavanja: Render Starter plan (plaćen), ne uključuje se bez odobrenja.

## Mobilna aplikacija: OTA ažuriranja

- `expo-updates` je uključen (`runtimeVersion` = verzija aplikacije, kanal `production`).
- **Jednom** je potreban novi APK (nove native biblioteke: expo-updates, netinfo, webview).
- Posle toga se JS izmene (ekrani, logika, tekst) šalju bez nove instalacije:
  ```
  cd mobile
  npx eas-cli update --channel production --message "opis izmene"
  ```
  Aplikacija preuzme izmenu u pozadini i primeni je pri sledećem pokretanju.
- Novi APK je i dalje potreban kad se doda native biblioteka ili promeni `version` u `app.json`.
- **Automatski APK:** `.github/workflows/build-apk.yml` pravi `Paws-v{version}.apk` na besplatnom GitHub runneru
  posle svake izmene u `mobile/` na `main` grani (ili ručno: Actions → Build APK → Run workflow) i objavljuje ga
  u GitHub Releases i Actions Artifacts. `versionCode` raste sa svakim buildom.
- **Potpis:** bez Secrets-a APK se potpisuje podrazumevanim Expo keystore-om (isto kao dosadašnji lokalni build),
  pa se instalira preko stare verzije. Za sopstveni keystore dodaj Secrets `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Promena keystore-a zahteva jednu
  deinstalaciju stare aplikacije.
- **CAPTCHA u APK-u:** GitHub → Settings → Variables: `TURNSTILE_SITE_KEY` (i po potrebi `TURNSTILE_BASE_URL`).
- **OTA objava:** treba `EXPO_TOKEN` (expo.dev → Access tokens) za `eas update`.
