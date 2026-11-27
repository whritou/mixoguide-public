# MixoGuide

MixoGuide is a cocktail management and discovery application. Users can browse cocktails, manage a personal ingredient pantry, discover which cocktails they can make with what they have on hand, plan cocktail events, log every making with quantity and date, and rate their favourites. An admin interface provides full CRUD management for all entities.

Built with **Next.js (App Router)**, **React Native (Expo)**, **Prisma**, **PostgreSQL**, **TanStack React Query**, **NextAuth**, and **Tailwind CSS**.



**Documentation:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) — full technical architecture, data flows, and design decisions
- [SETUP_CREDENTIALS.md](./SETUP_CREDENTIALS.md) — detailed step-by-step guide to obtain all credentials (Google OAuth, Cloudinary, Resend, etc.)
- [OAUTH_SETUP.md](./OAUTH_SETUP.md) — mobile Google OAuth setup guide

---

## Public Link
- [mixoguide.com](https://mixoguide.com/)
- [https://play.google.com/store/apps/details?id=com.mixoguide.app](https://play.google.com/store/apps/details?id=com.mixoguide.app)

---

## Features

| Feature | Description |
|---|---|
| Cocktail catalogue | Browse, filter, and search hundreds of cocktail recipes |
| Ingredient pantry | Track what you own with quantities and units |
| Makeable detection | Instantly see which cocktails you can make right now |
| Planning | Schedule cocktails for future dates with quantity |
| Made-cocktail history | Each making is logged separately — quantity + date, multiple entries per cocktail |
| Shopping list | Add missing ingredients directly from a recipe |
| Events / Collections | Plan multi-cocktail events with per-serving grocery lists |
| Ratings & favourites | Rate cocktails and bookmark your go-tos |
| Auth | Email/password + Google OAuth via NextAuth (web + mobile) |
| Mobile app | React Native (Expo) app for iOS and Android |
| Admin panel | Full CRUD for cocktails, ingredients, glasses, bar tools, and more |

---

## Monorepo Structure

This is an **npm** repository (the mobile app in `mobile/` has its own `package.json`/lockfile):

```
MixoGuide/
├── src/                    # Next.js web app (App Router)
│   ├── app/                # Route groups: (home), admin
│   ├── components/         # Reusable UI components
│   ├── hooks/              # React Query hooks (queries/ + mutations/)
│   ├── lib/                # query-keys, query-client, env, rateLimit, invalidation
│   ├── middlewares/        # withUser, withAdmin, withErrorHandler
│   ├── repositories/       # Prisma data access layer
│   ├── services/           # Business logic
│   └── validations/        # Zod request schemas
├── mobile/                 # React Native app (Expo SDK 54)
│   ├── app/                # Expo Router screens
│   └── src/                # Components, hooks, utilities
├── packages/
│   └── shared/             # Types + Zod auth schemas shared by web and mobile
├── prisma/                 # Schema, migrations, seed scripts
├── tests/                  # Vitest unit and integration tests
├── e2e/                    # Playwright end-to-end tests
└── docker-compose.yml      # Local PostgreSQL + Redis
```

---

## Prerequisites

- **Node.js** 22 (see `.nvmrc`; `nvm use`)
- **npm** 10 (bundled with Node 22; the version is pinned in `package.json` `packageManager`)
- **Docker** (for local PostgreSQL and Redis via `docker compose`)

---

## Quick Start — Web App

### 1. Prerequisites

- **Node.js** 22 and **npm** 10
- **Docker** (for PostgreSQL and Redis)
- **Google Cloud** account (for OAuth) — see [Environment Setup](#environment-setup)

### 2. Start local database and Redis

```bash
docker compose up -d
```

This starts PostgreSQL 18 and Redis 7 bound to `127.0.0.1`. Set `REDIS_PASSWORD=devredis` (the compose default) in `.env` to use Redis for rate limiting; without it the app falls back to an in-memory limiter.

### 3. Install dependencies

```bash
npm ci
```

`package-lock.json` is committed; use `npm install <pkg>` to change dependencies and commit the updated lockfile.

### 4. Configure environment

```bash
cp .env.example .env
```

See the [Environment Setup](#environment-setup) section below to fill in your values.

### 5. Run migrations and generate Prisma client

```bash
npm run db:migrate
npm run db:generate
```

### 6. (Optional) Seed with sample data

```bash
npm run db:seed
```

This seeds ~450 cocktails, ingredients, techniques, and other master data.

### 7. Start dev server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Optional environment variables

| Variable | Values | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_DARK_MODE` | `off` \| `preview` \| `on` | `on` | `on` enables the Velvet Room dark theme and the Light/Dark/System switch. `preview` enables it outside production only. `off` forces the light theme and hides the switch. |

`NEXT_PUBLIC_DARK_MODE` and `NEXT_PUBLIC_BASE_URL` are inlined at **build time**, so on Coolify they must be set as build variables (Dockerfile build args), not only runtime variables. Changing them requires a rebuild.

---

## Environment Setup

### Required Files

| File | Purpose | Template |
|------|---------|----------|
| `.env` | Backend & database config | `.env.example` |
| `mobile/.env.local` | Mobile app build config | `mobile/.env.example` |
| `mobile/google-services.json` | Android Firebase config | Generate from Firebase/Google Cloud |
| `mobile/android/app/upload-keystore.jks` | Android signing key | Generate with `keytool` |
| `mobile/google-play-service-account.json` | Google Play publisher account | Download from Google Play Console |

### Web App — `.env`

1. **Database** — PostgreSQL connection string. For local dev via docker-compose:
   ```env
   DATABASE_URL="postgresql://mixoguide:secret@localhost:5432/mixoguide"
   DIRECT_URL="postgresql://mixoguide:secret@localhost:5432/mixoguide"
   TEST_DATABASE_URL="postgresql://mixoguide:secret@localhost:5432/mixoguide_test"
   ```

2. **NextAuth** — generates a secret and sets the auth URL:
   ```bash
   openssl rand -base64 32  # Generate NEXTAUTH_SECRET
   ```
   ```env
   NEXTAUTH_SECRET="<output above>"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```

3. **Google OAuth** — [Guide](./OAUTH_SETUP.md)
   ```bash
   # 1. Go to https://console.cloud.google.com/
   # 2. Create a new project
   # 3. Enable "Google+ API" and "People API"
   # 4. Create OAuth 2.0 Web Application credentials
   # 5. Set authorized redirect URI: http://localhost:3000/api/auth/callback/google
   ```
   ```env
   AUTH_GOOGLE_ID="<your-client-id>.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="<your-client-secret>"
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="<same-client-id>.apps.googleusercontent.com"
   ```

4. **Image Upload** — Cloudinary (optional, but recommended)
   ```bash
   # 1. Sign up at https://cloudinary.com/
   # 2. Copy your "Cloud Name", "API Key", and generate an "API Secret"
   ```
   ```env
   CLOUDINARY_CLOUD_NAME="<your-cloud-name>"
   CLOUDINARY_API_KEY="<your-api-key>"
   CLOUDINARY_API_SECRET="<your-api-secret>"
   ```

5. **Email** — Resend (for password reset emails)
   ```bash
   # 1. Sign up at https://resend.com/
   # 2. Create an API key
   ```
   ```env
   RESEND_API_KEY="re_<your-api-key>"
   ```

6. **Redis** — for rate limiting and sessions. Local docker-compose uses:
   ```env
   REDIS_PASSWORD="secret"
   REDIS_USERNAME="default"
   ```

7. **Other services** (optional):
   ```env
   # Cloudflare Turnstile (bot protection)
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="<your-site-key>"
   TURNSTILE_SECRET_KEY="<your-secret-key>"
   
   # PostHog (analytics)
   NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN="phc_..."
   
   # Sentry (error tracking)
   EXPO_PUBLIC_SENTRY_DSN="https://..."
   ```

### Mobile App — `mobile/.env.local`

```bash
cp mobile/.env.example mobile/.env.local
```

Fill in:

```env
# Same Google Web client ID as backend
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="<same-as-AUTH_GOOGLE_ID>"

# AdMob (optional)
ADMOB_ANDROID_APP_ID="ca-app-pub-..."
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID="ca-app-pub-..."

# Sentry (optional)
EXPO_PUBLIC_SENTRY_DSN="https://..."
```

### Mobile App — `google-services.json`

Android requires a `google-services.json` file from Firebase:

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Create a project or select existing
3. Add Android app with package name: `com.mixoguide.app`
4. Download `google-services.json` and place in `mobile/`
5. The file must contain the same Web OAuth client ID as your `.env`

```bash
# Verify it's there:
ls -la mobile/google-services.json
```

### Mobile App — Android Signing Key

Required for production builds and Google Play submission:

```bash
# Generate a new keystore (one-time, save the password securely!)
keytool -genkey -v -keystore mobile/android/app/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload -storetype JKS

# For production, also grab the SHA-256 fingerprint:
keytool -list -v -keystore mobile/android/app/upload-keystore.jks -alias upload

# Copy the SHA-256 fingerprint to .env:
ANDROID_CERT_SHA256_FINGERPRINTS="AA:BB:CC:..."
```

**NEVER commit the `.jks` file to git** — it's in `.gitignore`.

### Mobile App — Google Play Service Account

For automated Play Store releases via Expo EAS:

1. Open [Google Play Console](https://play.google.com/console/)
2. Go to **Settings** → **API access**
3. Create a new Service Account in Google Cloud
4. Download the JSON key
5. Place it in `mobile/google-play-service-account.json` (local dev only, never commit)
6. Add to `.gitignore` if not already there

**NEVER commit the service account JSON to git** — it contains your private key.

---

## Quick Start — Mobile App

```bash
cd mobile
npm ci
cp .env.example .env.local
# Fill in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and other vars (see above)

npm run start    # Start Expo dev server
npm run android  # Run on Android emulator
```

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed Google OAuth configuration on mobile.

---

## Architecture

```
Frontend (React/Next.js)         Mobile (React Native/Expo)
  └─ React Query hooks             └─ React Query + Zustand
      └─ fetch()                       └─ fetch()
          └─ /api/* Route Handlers
              └─ Middleware (withUser / withAdmin / withErrorHandler)
                  └─ Services (business logic)
                      └─ Repositories (Prisma queries)
                          └─ PostgreSQL
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full architecture documentation including mobile, monorepo structure, data flows, and deployment.

---

## Key Data Models

| Model | Purpose |
|---|---|
| `User` | Accounts (email + OAuth) |
| `Cocktail` | Recipes with ingredients, technique, occasions, flavours |
| `Ingredient` | Spirits, mixers, garnishes — with unit + ABV |
| `UserPantryItem` | Per-user inventory (pantry + shopping list) |
| `PlannedCocktail` | Scheduled future making (one plan per cocktail per user) |
| `CocktailMadeLog` | History log — one row per making event, quantity + date, unlimited per cocktail |
| `PlannedCollection` | Multi-cocktail party/event planning |
| `Rating` | 1–5 star ratings per user per cocktail |
| `UserFavoriteCocktail` | Bookmarked cocktails |

### Cocktail Made Log

Every time a cocktail is made (via **"Make now"** or **"Mark as done"**), a `CocktailMadeLog` row is written:

```
CocktailMadeLog {
  id, userId, cocktailId,
  quantity,  // how many servings were made
  madeAt,    // exact timestamp
  note       // optional free-text note
}
```

This replaces the old single `done` state on `PlannedCocktail`. The **"Made"** tab now shows the complete log — a cocktail made five times appears as five separate cards, each with its own date and quantity.

---

## API Reference

### Common query parameters (all `GET /api/{entity}` endpoints)

| Parameter | Example | Description |
|---|---|---|
| `page` | `?page=2` | Page number (default: 1) |
| `limit` | `?limit=50` | Results per page (max: 500) |
| `sortBy` | `?sortBy=name` | Sort field |
| `sortOrder` | `?sortOrder=asc` | `asc` or `desc` |
| `search` | `?search=mojito` | Full-text search |
| `include` | `?include=ingredients` | Relations to include |
| `filter[field]` | `?filter[difficulty]=easy` | Exact filter |
| `filter[field][op]` | `?filter[abv][gte]=20` | Filter with operator (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `like`, `between`) |

### Response format

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cocktails` | List cocktails (paginated, filterable) |
| `GET` | `/api/cocktails/makeable` | Cocktails the user can make from pantry |
| `POST` | `/api/cocktails/:id/make` | Make now → pantry decrement + log entry |
| `GET` | `/api/cocktail-made-logs` | User's complete making history |
| `GET` | `/api/planned-cocktails` | Planned cocktails (filter by `status`) |
| `POST` | `/api/planned-cocktails/:id/complete` | Mark as done → pantry decrement + log entry |
| `GET/POST/PUT/DELETE` | `/api/user-pantry-items` | Pantry CRUD |
| `GET` | `/api/planned-collections/:id/grocery` | Grocery list for a collection |
| `GET` | `/api/admin/stats` | Dashboard statistics |

---

## Scripts

### Root (web/api/db)

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run lint` | ESLint for web source (CI blocks on errors) |
| `npm run format` / `npm run format:check` | Prettier write / check (not yet enforced in CI, see below) |
| `npm run type-check` | TypeScript check |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:migrate:prod` | Prisma migrate deploy (local CLI) |
| `npm run db:migrate:release` | Release migration job (`scripts/release-migrate.sh`, uses `DIRECT_URL`) |
| `npm run db:generate` | Generate Prisma client |
| `npm run test:api` | API integration tests only (`tests/integration`, excluding `tests/integration/db/**`) |
| `npm run test:db` | Real Postgres DB integration tests (`tests/integration/db/**`) |
| `npm run test:coverage:check` | Web/API coverage gate run (excludes DB integration tests) |
| `npm run test:webapp` | Playwright E2E suite (`e2e/**`); starts `npm run start` via `webServer` (build first) |
| `npm run test:a11y` | axe-core accessibility scans only (`@a11y` tag) |
| `npm run test:all` | Full local chain: coverage gate + DB integration + Playwright + mobile coverage gate |

### Mobile (`mobile/`)

| Command | Purpose |
|---|---|
| `npm --prefix mobile run start` | Start Expo dev server |
| `npm --prefix mobile run android` | Run Android app |
| `npm --prefix mobile run type-check` | TypeScript check |
| `npm --prefix mobile run lint` | ESLint |
| `npm --prefix mobile run test:coverage:check` | Mobile Jest coverage gate |
| `npm --prefix mobile run test:android:smoke` | Local manual Android smoke helper (prints adb/checklist flow) |

---

## Testing

### Coverage thresholds

Vitest measures coverage over all of `src/**/*.{ts,tsx}` (excluding `src/components/ui/**`, Next.js
page/layout/error shells, OG images, `src/types/**` and `*.d.ts`). The global gate in `vitest.config.ts`
is set just below the measured baseline so it passes today, and is **ratcheted**: whenever coverage
improves, raise each threshold to the new floor; never lower it. Targets: 60% lines/statements
globally, then per-glob thresholds of 80% for `src/lib`, `src/middlewares`, `src/services` and
`src/repositories`.

| Surface | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Web/API (Vitest, global) | 19 | 65 | 40 | 19 |
| Mobile (Jest) | 85 | 80 | 80 | 85 |

### Test folders and frameworks

```text
tests/unit, tests/services, tests/integration      -> Vitest
tests/integration/db                               -> Vitest + real Postgres
e2e                                                -> Playwright
mobile/src/**/__tests__, mobile/app/**/__tests__   -> Jest
```

### Local runbook

```bash
# 1) Web/API coverage gates (DB tests excluded on purpose)
npm run test:coverage:check

# 2) DB integration (real Postgres)
npm run test:db

# 3) Web end-to-end
npm run test:webapp

# 4) Mobile coverage gates
npm --prefix mobile run test:coverage:check

# Full chain
npm run test:all
```

### DB test environment

`test:db` loads `.env.local` first, then `.env`, requires `TEST_DATABASE_URL`, and remaps:
- `DATABASE_URL = TEST_DATABASE_URL`
- `DIRECT_URL = TEST_DATABASE_URL` (unless already set)

Recommended local setup:

```env
# .env
DATABASE_URL=<your regular local/dev db>
DIRECT_URL=<your regular local/dev db>

# .env.local
TEST_DATABASE_URL=<dedicated test database>
NEXTAUTH_SECRET=<test/dev secret>
```

### Android smoke

Android smoke is intentionally manual/local, not CI-gated:
- checklist: `mobile/scripts/android-smoke-checklist.md`
- helper: `npm --prefix mobile run test:android:smoke`

---

## CI pipeline

GitHub Actions, Node from `.nvmrc` (22), Postgres 18 (same major as `docker-compose.yml`), branches `main` and `dev`.

`.github/workflows/ci.yml`
- `web-ci`: `npm ci`, `npm audit --omit=dev --audit-level=high` (blocking), Prisma generate, type-check, lint (blocking on errors), `npm run test:coverage:check`, upload coverage artifact.
- `db-integration`: Postgres service, `scripts/release-migrate.sh`, `npm run test:db`.
- `mobile-ci`: install in `mobile/`, type-check, lint, `npm run test:coverage:check`, upload mobile coverage artifact.

`.github/workflows/playwright.yml`
- Postgres service, release migrations, `npm run db:seed`, `npm run build`, then Playwright (its `webServer` runs `npm run start`). Uses Cloudflare's always-pass Turnstile test keys and `DISABLE_RATE_LIMIT=1`.

Not yet enforced: `format:check` (the codebase has not been reformatted) and pre-commit hooks
(husky/lint-staged). Suggested once the tree is formatted: `npx prettier --write .` in one dedicated
commit, then add `npm run format:check` to `web-ci`.

---

## Deployment

The app ships as a **Docker image** (multi-stage build). The entrypoint only starts the server; database migrations run once per release as a separate job (`sh scripts/release-migrate.sh` with the same image, using the lockfile-pinned Prisma CLI baked into the image). Seeding runs on demand only (`RUN_SEED=1`). See [docs/RUNBOOK.md](./docs/RUNBOOK.md) for deploy, rollback, backups, incident response and the env var checklist. Health: `/api/health/live` (liveness), `/api/health/ready` (DB + Redis).

**Local dev:** `docker-compose.yml` provides PostgreSQL 18 + Redis 7 (localhost-only ports).

**Production:** Self-hosted on Hetzner via [Coolify](https://coolify.io). See `COOLIFY_SETUP.sh` for the full provisioning guide.

### Production Ingredient Cleanup

After rebuilding/redeploying the app image, run the compiled production cleanup script from the production container. Preview the merge plan first:

```bash
npm run db:ingredients:simplify:prod -- --db
```

If the preview looks good, apply the merge:

```bash
npm run db:ingredients:simplify:prod -- --apply
```

Then verify that no configured duplicate ingredient rows remain:

```bash
npm run db:ingredients:simplify:prod -- --db
```

The apply step rewires cocktail ingredients, pantry rows, main-alcohol references, barcodes, and derivatives before deleting duplicate ingredient rows.

---

## Conventions

- **One file = one responsibility** — Repository handles data, Service handles business logic, Route handles HTTP
- **No Prisma in services** — always go through the repository layer
- **No direct DB access from frontend** — all data flows through `/api/*` routes
- **Always validate** with Zod before calling the service
- **Typed errors** — `NotFoundError`, `ConflictError`, `ValidationError`, `ForbiddenError`, `UnauthorizedError`
- **CSRF protection** — all mutation routes validate `origin` / `content-type` headers
- **Ownership checks** — services expose `assertOwnership()` to verify the acting user
