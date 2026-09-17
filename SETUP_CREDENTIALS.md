# Setup Credentials — Step-by-Step Guide

This guide walks you through obtaining and configuring each credential needed to run MixoGuide locally and deploy to production.

---

## Table of Contents

1. [Database](#database)
2. [NextAuth](#nextauth)
3. [Google OAuth](#google-oauth)
4. [Image Upload (Cloudinary)](#image-upload--cloudinary)
5. [Email (Resend)](#email--resend)
6. [Redis](#redis)
7. [Bot Protection (Turnstile)](#bot-protection--turnstile)
8. [Analytics (PostHog)](#analytics--posthog)
9. [Error Tracking (Sentry)](#error-tracking--sentry)
10. [Mobile: AdMob](#mobile-admob)
11. [Mobile: Google Services](#mobile-google-services)
12. [Mobile: Android Signing Key](#mobile-android-signing-key)
13. [Mobile: Google Play Publisher](#mobile-google-play-publisher)

---

## Database

### Local Development (Using Docker Compose)

The `docker-compose.yml` file includes PostgreSQL 18 pre-configured:

```bash
docker-compose up -d
```

Default credentials (defined in `docker-compose.yml`):
- **Host:** `localhost`
- **Port:** `5432`
- **User:** `mixoguide`
- **Password:** `secret`
- **Database:** `mixoguide`

Add to `.env`:
```env
DATABASE_URL="postgresql://mixoguide:secret@localhost:5432/mixoguide"
DIRECT_URL="postgresql://mixoguide:secret@localhost:5432/mixoguide"
TEST_DATABASE_URL="postgresql://mixoguide:secret@localhost:5432/mixoguide_test"
```

If you need a separate test database:

```bash
# From inside the container or via psql:
psql -U mixoguide -d postgres -c "CREATE DATABASE mixoguide_test;"
```

### Production (Managed Postgres)

For production, use a managed service like:
- **Prisma Accelerate** (recommended) — connection pooling included
- **AWS RDS** or **DigitalOcean Postgres**
- **Neon** or **Supabase** (PostgreSQL SaaS)

Get the connection string from your provider and add to `.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/mixoguide"
DIRECT_URL="postgresql://user:password@host:5432/mixoguide"
```

---

## NextAuth

NextAuth requires two pieces of configuration:

### 1. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
# Example output: JpfCh1z4zIss3k26H8IfQrc30xTnK+WoOfZ2GcEaEng=
```

Copy the output to `.env`:
```env
NEXTAUTH_SECRET="JpfCh1z4zIss3k26H8IfQrc30xTnK+WoOfZ2GcEaEng="
```

### 2. Set NEXTAUTH_URL and BASE_URL

```env
# Where the app is running (used for redirects)
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Production:
NEXTAUTH_URL="https://mixoguide.com"
NEXT_PUBLIC_BASE_URL="https://mixoguide.com"
```

---

## Google OAuth

Google OAuth is required for both web and mobile sign-in. Follow these steps:

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Enter project name: `MixoGuide` (or your own)
4. Click **Create**

### 2. Enable Required APIs

1. In the console, go to **APIs & Services** → **Library**
2. Search for `Google+` and enable **Google+ API**
3. Search for `People` and enable **People API**

### 3. Create OAuth 2.0 Web Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the **OAuth consent screen first**:
   - User type: **External**
   - App name: `MixoGuide`
   - User support email: your email
   - Developer contact info: your email
   - Save and continue
4. On the **Scopes** page, leave defaults and continue (no special scopes needed)
5. Add test users (yourself) and continue

### 4. Create the Web Client

1. Back to **Credentials**, click **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `MixoGuide Web`
4. **Authorized JavaScript origins** (add these):
   ```
   http://localhost:3000
   https://mixoguide.com
   ```
5. **Authorized redirect URIs** (add these):
   ```
   http://localhost:3000/api/auth/callback/google
   https://mixoguide.com/api/auth/callback/google
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 5. Add to .env

```env
# Use the Web client ID and secret from step 4
AUTH_GOOGLE_ID="<YOUR_GOOGLE_WEB_CLIENT_ID>"
AUTH_GOOGLE_SECRET="<YOUR_GOOGLE_CLIENT_SECRET>"

# Mobile apps use the same Web Client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="<YOUR_GOOGLE_WEB_CLIENT_ID>"
```

---

## Image Upload — Cloudinary

Cloudinary handles image uploads for user avatars and cocktail photos.

### 1. Sign Up

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. Verify your email

### 2. Get Your Credentials

1. Go to your [Dashboard](https://cloudinary.com/console)
2. On the top banner, you'll see:
   - **Cloud Name** (e.g., `dbej4ezvi`)
   - **API Key** (e.g., `392316979186386`)
3. Click your profile → **Account Settings** → **Security**
4. Scroll to **API Key Management**
5. Click the eye icon to reveal your **API Secret** (e.g., `lGhpHbmYrr2OnVFGnIxYw4nLZ_U`)

### 3. Add to .env

```env
CLOUDINARY_CLOUD_NAME="<YOUR_CLOUDINARY_CLOUD_NAME>"
CLOUDINARY_API_KEY="<YOUR_CLOUDINARY_API_KEY>"
CLOUDINARY_API_SECRET="<YOUR_CLOUDINARY_API_SECRET>"
```

---

## Email — Resend

Resend sends transactional emails (password reset, verification, etc.).

### 1. Sign Up

1. Go to [Resend](https://resend.com/)
2. Sign up with your email
3. Verify your email

### 2. Get Your API Key

1. Go to [API Keys](https://resend.com/api-keys)
2. Click **Create API Key** (or copy the default one if it exists)

### 3. Verify Email Domain (Production)

For production, add a verified email domain:

1. Go to [Domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `mixoguide.com`)
4. Add the DNS records shown to your domain registrar
5. Wait for verification (usually 5–10 minutes)

### 4. Add to .env

```env
RESEND_API_KEY="<YOUR_RESEND_API_KEY>"
```

---

## Redis

Redis handles rate limiting and session storage.

### Local Development (Using Docker Compose)

The `docker-compose.yml` includes MinIO (S3 storage), but **not Redis**. You need to either:

**Option A: Run Redis in Docker (recommended)**

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Then use default credentials in `.env`:
```env
REDIS_PASSWORD="default"
REDIS_USERNAME="default"
```

**Option B: Use Docker Redis with Password**

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine redis-server --requirepass secret
```

```env
REDIS_PASSWORD="secret"
REDIS_USERNAME="default"
```

### Production (Managed Redis)

Use a managed service:
- **AWS ElastiCache** — Redis managed service
- **Upstash** — serverless Redis
- **DigitalOcean Managed Databases** — Redis option

Get the connection details from your provider and add to `.env`:
```env
REDIS_PASSWORD="your-managed-redis-password"
REDIS_USERNAME="default"  # or as provided by your service
```

---

## Bot Protection — Turnstile

Cloudflare Turnstile replaces reCAPTCHA for bot protection on signup/login.

### 1. Get a Turnstile Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** (in the left sidebar)
3. Click **Add site**
4. **Site name:** `MixoGuide` (or your app name)
5. **Domains:**
   ```
   localhost
   mixoguide.com
   ```
6. **Mode:** `Managed` (recommended)
7. Click **Create**

### 2. Copy Your Keys

1. On the Turnstile page, find:
   - **Site Key** (public, safe to expose)
   - **Secret Key** (sensitive, never expose)

### 3. Add to .env

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
```

---

## Analytics — PostHog

PostHog tracks user behavior and events (optional, can skip).

### 1. Sign Up

1. Go to [PostHog](https://posthog.com/)
2. Sign up for a free account
3. Create a project: `MixoGuide`

### 2. Get Your Project Token

1. Go to **Project settings** → **Integrate**
2. Find your **Project Token** (e.g., `phc_BQbtckLDLyxt3iwKNUXK5T6NQHGrsMtYnMnhk5qUpc3y`)

### 3. Add to .env (Optional)

```env
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN="phc_BQbtckLDLyxt3iwKNUXK5T6NQHGrsMtYnMnhk5qUpc3y"
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

---

## Error Tracking — Sentry

Sentry captures errors and performance issues (optional, can skip).

### 1. Sign Up

1. Go to [Sentry](https://sentry.io/)
2. Sign up for a free account
3. Create an organization

### 2. Create Projects

Create two projects: one for web, one for mobile.

**Web Project:**
1. Click **Create Project**
2. **Platform:** Next.js
3. **Project name:** `mixoguide-web`
4. Copy the **DSN** (starts with `https://`)

**Mobile Project:**
1. Click **Create Project**
2. **Platform:** React Native
3. **Project name:** `mixoguide-mobile`
4. Copy the **DSN**

### 3. Create Organization Auth Token

1. Go to **Settings** → **Auth Tokens**
2. Create a new token with organization/project access
3. Copy the token (starts with `sntrys_`)

### 4. Add to .env

```env
# Web (optional)
# SENTRY_DSN="https://..."

# Mobile
EXPO_PUBLIC_SENTRY_DSN="https://..."
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="react-native"
SENTRY_AUTH_TOKEN="sntrys_..."
```

---

## Mobile: AdMob

AdMob serves mobile ads in the app (optional, uses test ads by default).

### 1. Sign Up

1. Go to [Google AdMob](https://admob.google.com/)
2. Sign in with your Google account
3. Click **Get started** and follow the wizard

### 2. Create an App

1. In AdMob, click **Apps** → **Add app**
2. **Platform:** Android
3. **App name:** `MixoGuide`
4. **App store:** Google Play
5. Create the app

### 3. Create Ad Units

1. Click **Ad units** → **Create ad unit**
2. **Ad format:** Banner
3. Copy the **Ad unit ID** (e.g., `ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy`)

Repeat for other ad formats (interstitial, rewarded) if needed.

### 4. Get Your App ID

1. Go to **App settings**
2. Copy your **App ID** (e.g., `ca-app-pub-xxxxxxxxxxxxxxxx~zzzzzzzzzz`)

### 5. Add to mobile/.env.local

```env
# Development: use test ads
EXPO_PUBLIC_ADMOB_USE_TEST_ADS=true

# Production: your real ad IDs
ADMOB_ANDROID_APP_ID="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID="ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy"
```

---

## Mobile: Google Services

Android requires `google-services.json` from Firebase for native libraries to work.

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Create a project**
3. **Project name:** `MixoGuide`
4. Continue through the wizard

### 2. Add Android App

1. Click **Add app** → **Android**
2. **Package name:** `com.mixoguide.app`
3. **App nickname:** `MixoGuide Android`
4. (Optional) **Debug signing certificate SHA-1:** add later
5. Click **Register app**

### 3. Download `google-services.json`

1. Click **Download google-services.json**
2. Save to `mobile/google-services.json` (in the repo root)

### 4. Update Your Google Web Client

The `google-services.json` file includes your Google Web client ID. Make sure it matches your `.env`:

```bash
# Check the Web client ID in google-services.json:
cat mobile/google-services.json | grep -A 2 '"client_type": 3' | grep client_id

# It should match:
AUTH_GOOGLE_ID="<this-client-id>"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="<this-client-id>"
```

**NEVER commit `google-services.json` to git** — it contains API keys.

---

## Mobile: Android Signing Key

To build APKs/AABs and submit to Google Play, you need a signing key.

### 1. Generate a Keystore (One-Time)

```bash
keytool -genkey -v -keystore mobile/android/app/upload-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload \
  -storetype JKS
```

You'll be prompted for:
- **Keystore password:** (something secure, e.g., 32 chars)
- **Key password:** (can be same as keystore password)
- **Name, email, organization, country, etc.:** fill in your details

### 2. Save the Passwords

Store these securely (password manager, CI/CD secrets):
- **Keystore password**
- **Key alias:** `upload`
- **Key password**

### 3. Get the SHA-256 Fingerprint

```bash
keytool -list -v -keystore mobile/android/app/upload-keystore.jks -alias upload -storepass <keystore-password>
```

Look for:
```
SHA-256 fingerprint: AA:BB:CC:DD:...
```

### 4. Add to .env

```env
ANDROID_CERT_SHA256_FINGERPRINTS="AA:BB:CC:DD:..."
```

**NEVER commit the `.jks` file to git** — it's in `.gitignore`.

---

## Mobile: Google Play Publisher

To release the app on Google Play, you need a service account with publishing permissions.

### 1. Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **Service Account**
4. **Service account name:** `mixoguide-play-publisher`
5. Click **Create and Continue**
6. Grant roles: **Editor** (or more specific roles if available)
7. Click **Continue** → **Done**

### 2. Create a JSON Key

1. Click the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Key type: **JSON**
5. Click **Create**
6. A JSON file will download

### 3. Move to Mobile Directory

```bash
# Save the JSON file as:
mv ~/Downloads/<service-account-key>.json mobile/google-play-service-account.json
```

### 4. Grant Play Store Permissions

1. Go to [Google Play Console](https://play.google.com/console/)
2. Click **Settings** → **API access**
3. Under **Service accounts**, click **Invite**
4. Paste the email from the service account JSON: `<name>@<project>.iam.gserviceaccount.com`
5. Grant role: **Admin**
6. Click **Invite**

### 5. Update eas.json

The `mobile/eas.json` already references the service account file:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**NEVER commit the service account JSON to git** — it's in `.gitignore`.

---

## Verification Checklist

Before starting the app, verify:

- [ ] `.env` file exists and all required fields are filled
- [ ] `mobile/.env.local` exists with Google Web Client ID
- [ ] Database is running: `docker-compose up -d`
- [ ] `pnpm install` completed successfully
- [ ] `pnpm db:migrate` ran without errors
- [ ] `pnpm db:generate` completed
- [ ] `pnpm dev` starts without errors
- [ ] Can log in to `http://localhost:3000` with email/password or Google OAuth
- [ ] Avatar upload works (Cloudinary)
- [ ] Mobile app can build and run: `cd mobile && pnpm start`

---

## Common Issues

### "DATABASE_URL is required"
- Check that `.env` exists: `ls -la .env`
- Verify the PostgreSQL connection: `psql $DATABASE_URL -c "SELECT 1"`

### "NEXTAUTH_SECRET is missing"
- Generate a new secret: `openssl rand -base64 32`
- Add to `.env` and restart the dev server

### "Google sign-in failed"
- Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env`
- Check that `http://localhost:3000` is in Google Console authorized origins
- Check that `/api/auth/callback/google` is in authorized redirect URIs

### "Upload fails / 403 Forbidden"
- Verify Cloudinary credentials: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Check that the API secret is correctly copied (no extra spaces)

### "Mobile app won't build"
- Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `mobile/.env.local`
- Verify `mobile/google-services.json` exists and contains your Google Web client ID
- Check `mobile/android/app/upload-keystore.jks` for production builds

---

## Questions?

Refer to:
- [OAUTH_SETUP.md](./OAUTH_SETUP.md) — detailed Google OAuth setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system architecture and data flows
- Individual service documentation (Cloudinary, Resend, etc.)

