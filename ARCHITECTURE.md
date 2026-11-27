# MixoGuide Architecture

This document describes the technical architecture of MixoGuide, a cocktail management and discovery application built with Next.js, React Native (Expo), Prisma, and PostgreSQL.

---

## Monorepo Overview

MixoGuide is a **pnpm workspace** monorepo with three workspaces:

| Workspace | Path | Description |
|-----------|------|-------------|
| Web app | `/` (root) | Next.js 16 App Router — the primary web application |
| Mobile app | `mobile/` | React Native with Expo SDK 54 — iOS and Android |
| Shared | `packages/shared/` | TypeScript types and Zod auth schemas consumed by both apps |

The `packages/shared` package exports:
- **Entity types** — `Cocktail`, `Ingredient`, `PantryItem`, `PlannedCocktail`, `PlannedCollection`, `Rating`, `Glass`, `BarTool`, and others
- **Auth validation schemas** — Zod schemas for registration and login forms used identically by web and mobile

---

## High-Level Overview

```
Web (Next.js/React)                   Mobile (React Native/Expo)
  └─ React Query hooks                   └─ React Query + Zustand + Secure Store
      └─ fetch(/api/...)                      └─ fetch(/api/...)
          └─────────────────────┐─────────────────────────────┘
                                ↓
                    /api/* Route Handlers
                        └─ Middleware wrappers
                            └─ Services (business logic)
                                └─ Repositories (Prisma)
                                    └─ PostgreSQL
```

Each layer has a single responsibility. Data flows from left to right on writes and right to left on reads. The frontend never touches Prisma directly; all data access goes through the API layer.

---

## Layers

### Frontend — Web

**Framework:** Next.js App Router with two route groups:
- `(home)` — public-facing pages (cocktail browsing, pantry, makeable, planned cocktails)
- `admin` — CRUD management for all entities

**Key components:**
- **GenericForm / GenericView** — schema-driven form rendering and detail views used across all admin entity pages
- **DataTable** — sortable, filterable table with pagination and column visibility controls
- **CocktailCard** — card component for cocktail browsing with rating, favorite toggle, and makeable badge
- **IngredientRepeater** — dynamic repeater for adding/removing cocktail ingredients with amounts and substitutes
- **LocalIngredientSelect** — autocomplete ingredient picker with type/subtype grouping

**Design system:** bronze palette (`#7a5830` / `#bc9366`), cream background (`#fbf9f6`), warm border tones. Built on shadcn/ui components with Tailwind CSS v4.

### Frontend — Mobile

**Framework:** React Native with Expo SDK 54 and Expo Router for file-based navigation.

**Key characteristics:**
- Portrait-only orientation; supports iOS 15.1+ and Android with edge-to-edge enabled
- `newArchEnabled: true` — uses the new React Native architecture
- OTA updates via Expo Updates (`checkAutomatically: ON_LOAD`)
- EAS builds configured for iOS and Android distribution

**State management (mobile-specific):**
- **TanStack React Query** — server state (shared with web)
- **Zustand** — persistent app-level state (e.g., filter preferences, local settings)
- **Expo Secure Store** — encrypted credential storage for auth tokens
- **MMKV** — high-performance key-value storage for non-sensitive persistence

**Additional mobile features:**
- Sentry integration for crash reporting and error tracking
- Camera permission — barcode scanning when adding pantry items
- Face ID / biometric unlock support
- Deep linking: `mixoguide://` scheme, Android intent filters for `mixoguide.com/reset-password` and `mixoguide.com/auth/google`

### State Management — Web

TanStack React Query is the application data layer for the web app. There is no global CRUD store; React Query manages all server state.

**1. Server-state cache**

Entity and domain reads live in `src/hooks/queries/` and call API routes with `fetch`. Query keys are centralized in `src/lib/query-keys.ts`, and the default client options are in `src/lib/query-client.ts`.

- Stable query-key factories for lists, details, stats, makeable cocktails, pantry, favorites, and planner data
- Global defaults for retry/stale behavior, with mutable domains overriding stale time and focus refetch where needed
- Pagination metadata returned from API list endpoints is preserved in hook results

**2. Mutations and invalidation**

Write hooks live in `src/hooks/mutations/`. Mutations call API routes, then invalidate related query families using `src/lib/invalidation.ts`.

- `onMutate`/`onError` are used where optimistic UI is valuable, especially pantry and favorites
- `onSettled` or mutation success handlers invalidate affected query keys
- Cross-feature invalidation is centralized so pantry writes refresh makeable/recommendation views consistently

**3. Local UI state**

- Filter controls sync with URL params through hooks such as `useFilters`
- Dialogs, form drafts, and tab state use React state or form libraries
- Reusable API reads should become React Query hooks instead of raw `fetch` + `useEffect`

### Hooks

**Query hooks** (`src/hooks/queries/`):
- `useCocktailsQuery`, `useIngredientsQuery`, `useGlassesQuery`, `useBarToolsQuery` — paginated public/admin lists
- `usePantryQuery`, `usePantryStatsQuery`, `useFavoritesQuery` — user-scoped mutable data
- `useMakeableQuery`, `useBestRatedMakeableQuery`, `useRecommendationsQuery` — derived cocktail discovery
- `useAdminStatsQuery`, `useUserStatsQuery` — dashboard/stat views

**Mutation hooks** (`src/hooks/mutations/`): wrap `useMutation` for creates, updates, deletes, toggles, and domain actions. They import query keys/invalidation helpers instead of hard-coding cache families.

**URL-synced filter hooks:**
- `useFilters` — syncs cocktail page filters (search, tags, difficulty, technique, flavors, occasions) to URL params
- `useIngredientFilters` — syncs ingredient page filters (search, type, subtype, alcoholic) to URL params

### API Routes

**Pattern:**
- `/api/{entity}/route.ts` — `GET` (list with query params) and `POST` (create)
- `/api/{entity}/[id]/route.ts` — `GET` (single), `PUT` (update), `DELETE` (remove)

**Specialized endpoints:**
- `/api/cocktails/makeable` — cocktails the user can make from pantry
- `/api/cocktails/best-rated-makeable` — top-rated makeable cocktails
- `/api/cocktails/[id]/make` — mark a cocktail as made (pantry decrement + log)
- `/api/derivations` — ingredient derivation rules
- `/api/ratings/[cocktailId]` — per-cocktail rating operations
- `/api/planned-collections/[id]/grocery` — grocery list for a collection
- `/api/planned-collections/[id]/add-to-shopping` — add missing ingredients to shopping list
- `/api/admin/stats` — dashboard statistics
- `/api/auth/mobile/oauth/google/id-token` — mobile Google ID-token sign-in

**Infrastructure:**
- `withErrorHandler` — catches errors, returns uniform JSON responses with appropriate HTTP status codes
- `withPublic`, `withUser`, `withAdmin` — compose error handling, CSRF/auth checks, and optional rate limits
- `parseQueryParams` — translates URL search params into a structured object for QueryBuilder
- CSRF token validation for all mutating authenticated routes

### Services

**BaseService** provides standard CRUD operations (`getAll`, `getById`, `create`, `update`, `delete`) that delegate to the corresponding repository. Entity-specific services extend or compose on top of this.

**Domain services:**
- **CocktailService** — makeable cocktail computation, ingredient derivation logic, best-rated queries
- **PantryService** — pantry item management, shopping list operations
- **PlannedCocktailService** — planned cocktail status management, completion
- **PlannedCollectionService** — collection management, grocery list generation, add-to-shopping

### Repositories

**BaseRepository** wraps Prisma operations and integrates with QueryBuilder for all list queries.

**RepositoryConfig** defines per-entity query capabilities:
- `allowedSortFields` — fields the client can sort by
- `allowedFilters` — fields that accept filter operators
- `arrayFields` — Prisma array fields that use `hasSome` overlap matching
- `allowedIncludes` — relations the client can request
- `searchFields` — fields searched by the `search` parameter (case-insensitive contains)
- `defaultOrderBy` — default sort when none is specified

**QueryBuilder** translates structured query params into Prisma `findMany` arguments:
- **Pagination:** offset-based (`skip`/`take`) with page and limit (max 500)
- **Sorting:** multi-field support, configurable nulls handling (`first`/`last`)
- **Filtering:** exact match, array overlap (`hasSome`), between ranges, comparison operators (`gt`, `gte`, `lt`, `lte`, `in`, `like`)
- **Search:** case-insensitive `contains` across multiple fields (OR combined)

### Database

**PostgreSQL** accessed via Prisma ORM v6.

Seeding is supported from two sources:
- `prisma/seed_light.ts` — minimal seed data
- `prisma/seedCocktailDB.ts` — bulk import from TheCocktailDB API

---

## Data Flow

### Standard CRUD Read (list)

```
Page component
  --> useEntityQuery(params)
    --> React Query cache lookup by queryKeys.entity.list(params)
      --> GET /api/{entity}?page=1&limit=20&search=...
        --> withPublic/withUser/withAdmin
          --> parseQueryParams(request)
            --> service.getAll(params)
              --> repository.findMany(params)
                --> QueryBuilder.build(params, config)
                  --> Prisma findMany + count
                    --> PostgreSQL
      <-- Response { success, data, meta }
    <-- React Query stores data under the query key
  <-- hook returns data, meta, loading/error state
Page renders list
```

### Standard CRUD Write (create)

```
Form submit
  --> useCreate().mutate(data)
    --> POST /api/{entity} { body }
      --> withUser/withAdmin
        --> CSRF/auth/rate-limit checks
          --> Zod validation
            --> service.create(validated)
              --> repository.create(data)
                --> Prisma create
                  --> PostgreSQL
    <-- Response { success, data }
    <-- mutation invalidates related query keys
  Form redirects or resets
```

### Optimistic Update (pantry)

```
User toggles pantry item
  --> usePantryMutations().mutate(...)
    --> onMutate: patch React Query cache optimistically
      --> PUT /api/user-pantry-items/{id}
        --> service.update(data)
          --> repository.update(data)
            --> Prisma update
    <-- On success: invalidate pantry/makeable/recommendation keys
    <-- On failure: rollback cached value from onMutate context
```

---

## Entities

| Entity | Table | Key Relations |
|--------|-------|---------------|
| Cocktail | `cocktails` | ingredients (M2M with amounts), tags (M2M), bar tools (M2M), glass (FK), main alcohol (FK), ratings, favorites |
| Ingredient | `ingredients` | type (FK), subtype (FK), derivatives (self-referential M2M) |
| IngredientType | `ingredient_types` | subtypes (1:N), ingredients (1:N) |
| IngredientSubType | `ingredient_sub_types` | type (FK), ingredients (1:N) |
| Glass | `glasses` | cocktails (1:N) |
| BarTool | `bar_tools` | cocktails (M2M) |
| Tag | `tags` | cocktails (M2M) |
| Rating | `ratings` | user (FK), cocktail (FK); unique per user+cocktail |
| User | `users` | pantry items, favorites, planned cocktails, ratings, collections |
| UserPantryItem | `user_pantry_items` | user (FK), ingredient (FK); tracks quantity, shopping list, expiration |
| UserFavoriteCocktail | `user_favorite_cocktails` | user (FK), cocktail (FK) |
| PlannedCocktail | `planned_cocktails` | user (FK), cocktail (FK); status (planned/done) |
| PlannedCollection | `planned_collections` | user (FK), cocktails (M2M); party/event planning with servings |
| IngredientDerivative | `ingredient_derivatives` | base ingredient (FK), derived ingredient (FK); yield amount/unit |

---

## Key Features

### Makeable Cocktails

The makeable system determines which cocktails a user can prepare based on their pantry:

1. **Direct matching** — ingredient in pantry matches cocktail ingredient
2. **Derivation matching** — pantry has a base ingredient that derives into the required ingredient (e.g., lime → lime juice) with yield calculation
3. **Substitute checking** — cocktail ingredients can declare substitutes; if the user has any substitute, the ingredient is considered covered
4. **Quantity awareness** — checks that the pantry has sufficient quantity, accounting for derivation yields
5. **Optional ingredients** — ingredients marked optional do not block makeability

### Rating System

- Users rate cocktails 1–5 stars (one rating per user per cocktail)
- `avgRating` and `ratingCount` are precomputed on the `Cocktail` model
- Updated transactionally on every rating write/delete for fast read performance

### Pantry Management

- Optimistic updates for instant UI feedback
- Shopping list integration (toggle `isInShoppingList`)
- Expiration date tracking
- Essential item flagging

### Planned Collections

- Group cocktails into event/party collections
- Per-collection grocery list generation (computes missing ingredients across all cocktails)
- Add-to-shopping-list bulk action
- Servings multiplier for quantity scaling

### Admin CRUD

- **GenericForm** renders create/edit forms from a field configuration array (text, number, select, multi-select, boolean, datetime, tags)
- **GenericView** renders detail pages from the same field configuration
- **DataTable** provides sortable columns, search, pagination, and column visibility

---

## API Query Parameters

All list endpoints (`GET /api/{entity}`) accept a uniform set of query parameters:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `page` | `?page=2` | Page number (default: 1) |
| `limit` | `?limit=50` | Results per page (max: 500) |
| `sortBy` | `?sortBy=name` | Sort field |
| `sortOrder` | `?sortOrder=asc` | `asc` or `desc` |
| `search` | `?search=mojito` | Full-text search across configured fields |
| `include` | `?include=ingredients&include=tags` | Relations to include |
| `filter[field]` | `?filter[difficulty]=easy` | Exact filter |
| `filter[field][op]` | `?filter[abv][gte]=20` | Filter with operator |

**Filter operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `like`, `between`

**Response format:**
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

---

## Authentication and Security

- **NextAuth** for authentication (credentials + Google OAuth)
- **JWT sessions** with 30-day max age; role embedded in JWT, refreshed every 15 minutes
- **CSRF protection** via wrapper-level token validation on mutating authenticated requests
- **Rate limiting** via `src/lib/rateLimit.ts`, backed by Redis when configured and by an in-memory fallback in local/test contexts; credential login limited to 5 attempts per IP per 15 minutes
- **Zod validation** on incoming request bodies before service calls
- **Role-based access:** `USER` and `ADMIN` roles; admin routes restricted to `ADMIN`
- **Route wrappers:** `withPublic`, `withUser`, and `withAdmin` compose error handling, optional rate limits, auth checks, and CSRF checks so API routes do not call auth/CSRF primitives directly
- **Environment validation:** server-side environment variables are parsed in `src/lib/env.ts` with Zod; server code imports `env` instead of reading `process.env` directly
- **Security headers:** HSTS, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy configured in `next.config.ts`
- **Ownership checks:** services expose `assertOwnership()` to verify the acting user owns the resource

### Mobile OAuth

The mobile app uses native Google Sign-In with a backend ID-token exchange:
1. Native Google Sign-In returns a Google ID token to the app
2. `/api/auth/mobile/oauth/google/id-token` verifies the token signature, issuer, audience, and expiry
3. The backend links or creates the same Prisma `Account` record used by web Google OAuth
4. The backend returns mobile `accessToken`, `refreshToken`, and `user` payloads
5. Tokens are stored in Expo Secure Store; refresh tokens remain device-bound through `X-Device-Id`

---

## Testing

**Vitest** (unit + integration):

```
tests/
  factories/       # Test data builders (makeUser, makeCocktail, makeIngredient, …)
  services/        # Service-layer tests (Prisma mocked via vi.hoisted)
  unit/
    repositories/  # Repository tests (Prisma client mocked)
    utils/         # Pure-function tests
  integration/     # Route-handler tests: auth, CSRF, ownership, IDOR, admin-only,
                   #   conflict, not-found, validation error paths
  __mocks__/       # Shared mock utilities
```

**Playwright** (E2E):
- Config: `playwright.config.ts`
- Tests: `e2e/`
- Desktop chromium by default; multi-browser only when Playwright is run with `CI=true`
- HTML reporter + trace on retry

**Mobile (Jest)**:
- Config: `mobile/jest.config.js`
- React Native + Testing Library
- Coverage gates via `npm --prefix mobile run test:coverage:check`

New route behavior should include at least one happy-path test and one representative failure test when the wrapper, auth, validation, or ownership behavior changes.

### Current test command model

- `npm run test:coverage:check`: web/api coverage gates, excludes `tests/integration/db/**`
- `npm run test:db`: DB integration tests only (`tests/integration/db/**`) with `TEST_DATABASE_URL`
- `npm run test:webapp`: Playwright E2E (`e2e/**`)
- `npm --prefix mobile run test:coverage:check`: mobile coverage gates
- `npm run test:all`: full local chain (web/api coverage -> db -> webapp -> mobile coverage)

DB integration runner behavior (`tests/integration/db/run-db-tests.ts`):
- loads `.env.local` then `.env`
- fails fast if `TEST_DATABASE_URL` is missing
- remaps `DATABASE_URL` (and default `DIRECT_URL`) to `TEST_DATABASE_URL`
- executes DB suites serially (`--fileParallelism=false`, `--sequence.concurrent=false`)

Android smoke is manual/local by design:
- checklist: `mobile/scripts/android-smoke-checklist.md`
- helper command: `npm --prefix mobile run test:android:smoke`

### Current CI workflow

`.github/workflows/ci.yml` defines three jobs:
- `web-ci`: type-check, lint, web/api coverage gates
- `db-integration`: Postgres service + migration deploy + DB integration tests
- `mobile-ci`: mobile type-check, lint, mobile coverage gates

Playwright E2E is currently run locally (via `test:webapp` / `test:all`) and is not CI-gated in this workflow.

---

## Deployment

### Docker

Multi-stage `Dockerfile`:
1. **deps** — install all dependencies
2. **builder** — compile Next.js (standalone output)
3. **runner** — minimal runtime image (~50 MB); includes Prisma client and compiled seed scripts

Entrypoint (`scripts/deploy.sh`) only runs `node server.js`. Migrations run as a separate release job (`scripts/release-migrate.sh`, pinned Prisma CLI, `DIRECT_URL`). `RUN_MIGRATIONS_ON_BOOT=1` and `RUN_SEED=1` exist as opt-in escape hatches. See `docs/RUNBOOK.md`.

### Local Development

`docker-compose.yml` provides:
- **PostgreSQL 18** on port 5432
- **MinIO** (S3-compatible object storage) on port 9000, console on port 9001
- MinIO buckets are auto-bootstrapped with a setup container on first start
- Healthchecks ensure services are ready before dependent containers start

### Production (Coolify on Hetzner)

- Self-hosted via [Coolify](https://coolify.io) on a Hetzner CX33
- Provisioning guide in `COOLIFY_SETUP.sh` (Ubuntu 24.04, firewall, DNS, Let's Encrypt SSL)
- Cloudflare CDN in front for DDoS protection and caching
- MinIO for object storage in production; Cloudinary for optimized image delivery

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled, port 6543 for serverless) |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection for Prisma migrations (port 5432) |
| `NEXTAUTH_URL` | Yes | Public URL of the app (e.g., `https://mixoguide.com`) |
| `NEXTAUTH_SECRET` | Yes | Random secret for NextAuth JWT signing |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Cloudflare Turnstile site key (CAPTCHA) |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret key |
| `REDIS_USERNAME` | No | Upstash Redis username (falls back to in-memory) |
| `REDIS_PASSWORD` | No | Upstash Redis password |
| `ANDROID_CERT_SHA256_FINGERPRINTS` | No | Android app signing fingerprints for asset links |
| `TEST_DATABASE_URL` | Test only | Dedicated PostgreSQL database for DB integration suites (`npm run test:db`) |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Web framework | Next.js 16 (App Router) | TypeScript, SSR, standalone Docker output |
| Mobile framework | React Native + Expo SDK 54 | Expo Router, new architecture enabled |
| Shared package | `packages/shared` | Entity types + Zod auth schemas |
| UI components | shadcn/ui + Radix UI | Tailwind CSS v4, bronze/cream design system |
| State (web) | TanStack React Query v5 | Server state only; no global store on web |
| State (mobile) | React Query + Zustand + MMKV | Persistent app state; Expo Secure Store for credentials |
| API layer | Next.js Route Handlers | REST, ~77 endpoints |
| ORM | Prisma v6 | PostgreSQL adapter |
| Database | PostgreSQL 18 | Via Supabase in production |
| Authentication | NextAuth v4 | JWT sessions, Prisma adapter, email + Google OAuth |
| Validation | Zod | Client, server, and environment variable validation |
| Forms | React Hook Form v7 | With Zod resolver |
| Tables | TanStack React Table v8 | Sortable, filterable, paginated |
| Charts | Recharts v3 | Admin dashboard |
| Image storage | Cloudinary + MinIO | Cloudinary in production, MinIO for local/staging |
| Email | Resend | Email verification and password reset |
| CAPTCHA | Cloudflare Turnstile | On credential login and registration |
| Rate limiting | Upstash Redis | In-memory fallback for local/test |
| Error tracking | Sentry | Mobile app crash reporting |
| Testing (web) | Vitest v2 + Playwright | Unit, integration, and E2E |
| Testing (mobile) | Jest + React Native Testing Library | Unit and component tests |
| Mobile builds | EAS (Expo Application Services) | iOS and Android distribution |
| Mobile updates | Expo Updates | OTA updates, `appVersion` runtime policy |
| Linting | ESLint v9 | Next.js config |
| Formatting | Prettier v3 | All workspaces |
| Deployment | Docker + Coolify | Self-hosted on Hetzner; Vercel-compatible |
