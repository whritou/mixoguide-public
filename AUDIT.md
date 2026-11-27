# MixoGuide — Production Technical Audit

| | |
|---|---|
| **Repository** | `MixoGuide/` (web app; `mobile/` React Native app out of scope except where it calls web APIs) |
| **Commit audited** | `e1e7738` (branch HEAD, working tree as of 2026-11-27) |
| **Stack (installed)** | Next.js 16.2.6 (App Router, Turbopack, `output: "standalone"`), React 19, TypeScript 5.9.3, Prisma 6.19.3 / PostgreSQL (16 in CI, 18 in docker-compose), NextAuth 4.24 (JWT strategy, Google + Credentials), TanStack Query 5, Tailwind 4, ioredis (rate limit + makeable cache), Resend (mail), Cloudinary (uploads), Cloudflare Turnstile, Node 22 (Docker) / Node 20 (CI) |
| **Audit type** | Read-only static review + non-destructive tooling. No code, dependency, or database changes. No secrets reproduced. |
| **Companion file** | `AUDIT_BACKLOG.md` — prioritized, root-cause-grouped backlog |

---

## A. Executive summary

### Overall assessment

MixoGuide is a well-intentioned, reasonably layered codebase (route → service → repository → Prisma) with good hygiene in several places: strict TypeScript with zero `any`, a clean type-check, 549 passing unit/integration tests, bcrypt cost 12, hashed single-use email tokens, a careful Google ID-token verifier, CSRF origin checks on authenticated mutations, open-redirect-safe callback handling, and server-only PDF rendering.

However, **the application is not production-ready**. A generic "query language" layer (`QueryBuilder` + `BaseRepository`) forwards client-supplied `include` paths directly to Prisma. Combined with permissive allow-lists on **public, unauthenticated** list endpoints, this lets any anonymous visitor dump every user's **bcrypt password hash, email, role, stored Google OAuth tokens, device push tokens, pantry contents and private event invite tokens**. A second public endpoint (`GET /api/ratings`) leaks the same user rows without any crafted parameter. Stored Google `id_token`s are replayable against the mobile Google login endpoint for ~1 hour, making the leak an **account-takeover chain (including admins)**.

Beyond that, the auth layer has non-rotating 180-day refresh tokens that survive password changes, a Turnstile captcha that is bypassable through sibling endpoints, and HTML injection in emails sent from the product's domain to arbitrary recipients. The data layer has real lost-update and double-deduction races on the core "make a cocktail" flow, a makeable-cocktail algorithm that silently truncates results, and cascading deletes that can wipe ingredients out of every recipe and user pantry. CI and Docker builds cannot be reproduced because **no lockfile exists** (`npm ci` fails).

### Production readiness verdict

**NOT READY — blocking.** Two P0 data-exposure vulnerabilities must be fixed, and exposed credentials rotated, before (continued) public exposure. If this code is already deployed, treat it as a probable breach: see SEC-001 "Impact" for the incident steps.

### Most significant risks

1. **SEC-001 / SEC-002 (P0)** — anonymous mass exfiltration of password hashes, emails, OAuth tokens, FCM tokens via `?include=` and `/api/ratings`.
2. **SEC-003 (P1, P0 while SEC-001 is open)** — replay of leaked Google `id_token`s → access + 180-day refresh token for any Google-login user, admins included.
3. **SEC-004 (P1)** — refresh tokens never rotate and are never revoked on password change/reset; web JWT sessions are unrevocable for 30 days.
4. **DB-001 / DB-002 (P1)** — lost updates and non-idempotent completions corrupt pantry quantities (the product's core data).
5. **REL-001 (P1)** — no lockfile: `npm ci` (CI and Dockerfile) fails; builds are non-reproducible and `npm audit` cannot run.

### Architectural strengths

- Clear layering (routes → services → repositories), consistent `withUser`/`withAdmin`/`withPublic` wrappers, consistent `ApiResponse` envelope that never leaks stack traces or Prisma errors.
- Ownership checks on every user-owned resource were traced and found correct (no IDOR on pantry, planned cocktails/collections, made-logs, favorites, ratings writes, devices delete, `user/[userId]/*`).
- Thoughtful defensive code: open-redirect-safe callback normalization, trusted-proxy-aware IP resolution, Google avatar host allow-list, admin role re-verified from DB on every admin request, atomic email-token consumption.
- TanStack Query key factories, sensible stale times, server-only PDF generation, lazy-loaded charts.

### Architectural weaknesses

- **A generic, client-driven query DSL exposed to public endpoints** (`include`, nested filters, `limit` up to 500) — convenient, but it turned the persistence model into the public API contract. This is the root cause of the most severe findings.
- Security-relevant output shaping (mappers) happens **only in the browser** (`src/lib/api/*`), never on the server.
- Multi-step business operations (make/complete cocktail, collection completion, RSVP, move-to-pantry) run as separate writes without transactions or idempotency.
- Duplicated auth flows (web vs mobile login/register/reset, two `createEmailToken` implementations) drift apart (captcha, revocation, normalization).
- Most product pages are fully client-rendered (196 `'use client'` files, 43 client pages/layouts), including SEO-critical cocktail/ingredient detail pages.

### Five highest-priority actions

1. **Close the data leak (SEC-001/002):** exact-match include allow-lists, remove user-reaching relations from public allow-lists, enforce server-side `select` DTOs for any `User` relation; then **rotate**: force password resets, revoke all refresh tokens, delete stored OAuth tokens, rotate `NEXTAUTH_SECRET`.
2. **Stop storing replayable Google tokens and fix token lifecycle (SEC-003/004):** don't persist `id_token`/`access_token`; rotate refresh tokens with reuse detection; revoke all sessions on password change/reset; add a session version to JWTs.
3. **Make the "make/complete" flow atomic and idempotent (DB-001/002/005):** claim-then-act inside a single transaction, atomic SQL decrements, map Prisma P2002/P2003/P2034 to 4xx/retry.
4. **Unify and harden auth entry points (SEC-005/006/008):** Turnstile (or an equivalent proof) on every credential/registration endpoint, escape all email template values, remove account-enumeration oracles.
5. **Restore build reproducibility and real quality gates (REL-001, TEST-001/002):** commit a lockfile, make the coverage gate cover the security-critical code, add response-shape/authorization regression tests that would have caught SEC-001.

### Audit limitations

Static analysis only: the app was not run, no database was queried, no `EXPLAIN` was executed, no production build or bundle analysis was possible (no `.next` production output), no browser/assistive-technology testing was performed, and `npm audit` could not run (no lockfile). Exploitability of SEC-001/002/003 was established by tracing code paths end to end, not by live exploitation. See section F.

---

## B. Technical scorecard

| Category | Score | Critical (P0) | High (P1) | Medium (P2) | Low (P3) | Confidence |
|---|---:|---:|---:|---:|---:|---|
| Security | **0** | 2 | 4 | 6 | 6 | High (traced; not exploited live) |
| Accessibility | **27** | 0 | 4 | 11 | 8 | Medium (static only; manual AT testing required) |
| Frontend performance | **76** | 0 | 1 | 4 | 4 | Medium (no build output; impacts estimated) |
| Backend performance | **92** | 0 | 0 | 2 | 2 | Medium (DB-side query cost is scored under Database) |
| Database and Prisma | **48** | 0 | 4 | 5 | 5 | High (schema/queries confirmed; no live DB/EXPLAIN) |
| Architecture | **91** | 0 | 0 | 2 | 3 | High |
| Code quality | **95** | 0 | 0 | 0 | 5 | High (tsc + eslint run) |
| Reliability | **81** | 0 | 1 | 3 | 2 | High |
| Testing | **82** | 0 | 1 | 3 | 1 | High (suite executed) |
| Developer experience | **91** | 0 | 0 | 2 | 3 | High |

**Scoring methodology.** Each category starts at 100; deductions per finding whose *primary* category it is: P0 −25, P1 −8, P2 −3, P3 −1, P4 0; clamped to [0, 100]. Each finding is counted once (in its primary category); cross-cutting findings are referenced, not double-counted — e.g. the Backend performance score excludes database query cost (DB-003, DB-010–012), and Architecture excludes SEC-001 although ARCH-001 is its root cause. Scores are heuristic indicators of remaining risk relative to this codebase, not certifications, and are not comparable across projects. A high Code-quality score means few local defects were found, not that the code is well designed (see Architecture/Security).

---

## C. Detailed findings

Findings are grouped by category and ordered by severity. "Confirmed" = the full code path was traced and the behavior follows deterministically from the code; "High" = traced but depends on runtime configuration or was not executed; "Medium/Low" = plausible risk requiring verification.

### C.1 Security

---

**ID:** SEC-001
**Title:** Nested `include` query parameter lets anonymous users dump every user's password hash, email, OAuth tokens, device tokens and private data
**Severity:** P0 — Critical
**Confidence:** Confirmed (static trace; not executed against a live instance)
**Category:** Security (CWE-200, CWE-213, CWE-639; OWASP A01:2021 Broken Access Control, ASVS V4.1/V8.3)
**Location:** `src/lib/query/QueryBuilder.ts:183-217` (`buildIncludeArgs`, `setNestedInclude`); `src/repositories/base.repository.ts:61-82` (`findMany`); allow-lists: `src/repositories/cocktail.repository.ts:63-71` (`favoritedBy`), `src/services/ingredient.service.ts:26` (`pantryItems`) and its `findMany` (`:43-63`), `src/services/glass.service.ts:21` (`cocktails`), `src/repositories/bartool.repository.ts:19` (`cocktails`), ingredient-type/sub-type repositories (`subTypes`, `ingredients`); public routes `src/app/api/{cocktails,ingredients,glasses,bar-tools,ingredient-types,ingredient-subtypes}/route.ts` (GET, `withPublic`)
**Effort:** S (fix) + M (incident response)
**Blast radius:** Application (all users)

**Evidence:**
```ts
// QueryBuilder.ts:192 — any path that STARTS WITH an allowed relation is accepted, at any depth
if (!allowedIncludes.some((allowed) => includeStr === allowed || includeStr.startsWith(allowed + '.'))) {
  continue
}
const parts = includeStr.split('.')
QueryBuilder.setNestedInclude(includes, parts)   // → { favoritedBy: { include: { user: { include: { accounts: true } } } } }
```
```ts
// cocktail.repository.ts — public allow-list includes a join table that reaches User
allowedIncludes: ['glass','mainAlcohol','ingredients','ingredients.type','ingredients.subType','barTools','favoritedBy'],
```
```ts
// api/cocktails/route.ts — public, params straight from the query string
export const GET = withPublic(async (req) => {
  const params = parseQueryParams(req.nextUrl.searchParams)   // include = searchParams.getAll('include')
  ...
  const result = await cocktailService.getAll(params)          // → BaseRepository.findMany → prisma.findMany({ include })
  return ApiResponse.paginated(result, { 'Cache-Control': cacheControl(CACHE_DURATIONS.SHORT) })
}, { rateLimit: 'public-read' })
```
There is no Prisma `omit`, result extension, or server-side mapper; `src/lib/mappers/*` run only in the browser (`src/lib/api/*.api.ts`).

**Problem:** The allow-list is a prefix check, so any relation path reachable from an allowed relation is permitted. Prisma `include: { x: true }` returns *all scalar columns* of the related model. From public catalog models one can reach `User` through join tables (`UserFavoriteCocktail.user`, `UserPantryItem.user`) and from `User` every relation (`accounts`, `devices`, `plannedCollections.rsvps`, …).

**Impact:** Unauthenticated requests such as
- `GET /api/cocktails?limit=500&include=favoritedBy.user` → `User.password` (bcrypt hash), `email`, `role`, `emailVerified`
- `…&include=favoritedBy.user.accounts` → Google `access_token`, `refresh_token`, `id_token` (see SEC-003)
- `…&include=favoritedBy.user.devices` → FCM push tokens (see SEC-013)
- `…&include=favoritedBy.user.plannedCollections.rsvps` → private `shareToken`s and guest names/emails
- `GET /api/ingredients?include=pantryItems.user` → every user's pantry and account row

Paging (`limit` ≤ 500) enumerates the full user base in minutes. Offline cracking of bcrypt(12) hashes is slow but feasible for weak passwords; emails enable targeted phishing; leaked tokens enable takeover (SEC-003). GDPR personal-data breach notification obligations likely apply. `Cache-Control` on `/api/cocktails` may also cause shared caches/CDNs to store leaked responses.

**Trigger conditions:** Any anonymous HTTP client; only the `public-read` rate limit (60/min per IP, or a global bucket if `TRUSTED_PROXY` is unset) applies; `glasses`, `bar-tools`, `ingredient-types`, `ingredient-subtypes` have no rate limit.

**Root cause:** Persistence-layer query shape is exposed as the public API contract; output shaping (DTO mapping) exists only client-side; allow-list matching is prefix-based; no defense-in-depth (`omit` of `password` and token columns).

**Recommended remediation:**
1. Exact-match include allow-lists; reject (400) unknown includes instead of silently ignoring.
2. Remove every relation that can reach `User` (`favoritedBy`, `pantryItems`, `user`, `ratings`, …) from allow-lists on public routes; expose counts instead (`_count`).
3. Represent each allowed include as an explicit Prisma `select` tree, never `true`.
4. Add a global Prisma `omit` (Prisma ≥ 6.2 GA) for `User.password` and `Account.{access_token,refresh_token,id_token}`, and project responses through server-side DTO mappers.
5. **Incident response:** check access logs for `include=` containing `.user`; rotate `NEXTAUTH_SECRET` (invalidates all JWTs); revoke all refresh tokens; null out stored OAuth tokens; force password resets for credential users; notify users/regulator as required; purge CDN caches.

**Corrected implementation:**
```ts
// QueryBuilder.ts
static buildIncludeArgs(params: QueryParams, allowed: Record<string, object>) {
  if (!params.include?.length) return {}
  const include: Record<string, object> = {}
  for (const key of params.include) {
    const shape = allowed[key]
    if (!shape) throw new BadRequestError(`Unsupported include: ${key}`)
    include[key] = shape
  }
  return { include }
}

// cocktail.repository.ts
allowedIncludes: {
  glass:       { select: { id: true, name: true, image: true } },
  mainAlcohol: { select: { id: true, name: true } },
  ingredients: { include: { ingredient: { select: { id: true, name: true, image: true } } } },
  barTools:    { include: { barTool: { select: { id: true, name: true } } } },
  // favoritedBy removed — use _count.favoritedBy
},

// lib/db/prisma.ts — defense in depth
new PrismaClient({ omit: { user: { password: true }, account: { access_token: true, refresh_token: true, id_token: true } } })
// (read `password` explicitly with `omit: { password: false }` only in userRepository.findByEmailForAuth)
```

**Regression prevention:** (a) Unit test for `buildIncludeArgs` rejecting `favoritedBy.user`, `x.y` for non-listed paths. (b) Integration "response-shape" test: for every `withPublic` route, assert the JSON never contains keys `password`, `email`, `access_token`, `refresh_token`, `id_token`, `fcmToken`, `shareToken` (recursive key scan). (c) Type-level: allow-lists typed as `Record<string, Prisma.XInclude>` so `true` cannot be used. (d) ESLint `no-restricted-syntax` on `include: { user: true }`.

**References:** CWE-200, CWE-213; OWASP API3:2023 Broken Object Property Level Authorization; OWASP ASVS 4.0.3 V8.3.4; Prisma docs "Excluding fields" (`omit`), Prisma 6.x.

---

**ID:** SEC-002
**Title:** `GET /api/ratings` (public) returns full `User` rows (password hash, email, role) for every rater
**Severity:** P0 — Critical
**Confidence:** Confirmed
**Category:** Security (CWE-200; OWASP API3:2023)
**Location:** `src/app/api/ratings/route.ts:7-11`; `src/services/rating.service.ts:8` (`getAll`)
**Effort:** XS
**Blast radius:** Application

**Evidence:**
```ts
// ratings/route.ts
export const GET = withPublic(async (req) => {
  const params = parseQueryParams(req.nextUrl.searchParams)
  const result = await ratingService.getAll(params)
  return ApiResponse.paginated(result)               // raw Prisma rows
}, { rateLimit: 'public-read' })

// rating.service.ts
async getAll(params) { return ratingRepository.findMany({ ...params, include: ['user'] }) }  // → include: { user: true }
```
`mapRating` (which keeps only `user.id`/`user.name`) is applied only in `src/lib/api/ratings.api.ts` in the browser.

**Problem:** The service hard-codes a full `user` include on a public endpoint.

**Impact:** `GET /api/ratings?limit=500&page=N` enumerates the hash, email and role of every user who ever rated a cocktail — no crafted include needed. Same incident-response obligations as SEC-001.

**Trigger conditions:** Any anonymous request.

**Root cause:** Same as SEC-001 (no server-side projection; `true` includes).

**Recommended remediation:** Use an explicit `select` for the user relation, and stop accepting arbitrary filters on this route (e.g. `userId=` enumerates one user's ratings — decide if that is intended).

**Corrected implementation:**
```ts
async getAll(params: QueryParams) {
  return ratingRepository.findManyPublic(params) // select: { id, rating, createdAt, cocktailId, user: { select: { id: true, name: true, image: true } } }
}
```

**Regression prevention:** Covered by SEC-001 (b) response-shape test; add a specific test for `/api/ratings`.

**References:** CWE-200; OWASP API3:2023.

---

**ID:** SEC-003
**Title:** Raw Google `id_token`s are persisted and replayable against the mobile Google login → account takeover chain
**Severity:** P1 — High (P0 while SEC-001 is unfixed)
**Confidence:** High (every hop traced; not executed)
**Category:** Security (CWE-294 Authentication Bypass by Capture-replay, CWE-312)
**Location:** `src/app/api/auth/mobile/oauth/google/id-token/route.ts:25-35`; `src/app/api/auth/mobile/oauth/google/utils.ts` (`googleAccountData`, `getOrCreateGoogleUserFromVerifiedProfile`, `verifyGoogleIdToken`)
**Effort:** S
**Blast radius:** Application (all Google-login users, including admins)

**Evidence:**
```ts
// id-token/route.ts
const profile = await verifyGoogleIdToken(idToken)
const linkedUser = await getOrCreateGoogleUserFromVerifiedProfile(profile, { id_token: idToken })  // stored in Account.id_token
...
const [accessToken, refreshToken] = await Promise.all([
  mobileAuthService.createAccessToken(user), mobileAuthService.createRefreshToken(user.id, deviceId) ])
```
`verifyGoogleIdToken` checks signature, `iss`, `aud`, `exp`, `iat` — but no nonce and no single-use tracking. NextAuth's Prisma adapter additionally stores web-login `access_token`/`id_token`/`refresh_token` in `Account`.

**Problem:** A bearer credential that can mint sessions is stored in plaintext and is reusable until `exp` (~1 h).

**Impact:** With SEC-001, an attacker polls `include=favoritedBy.user.accounts`, takes a victim's fresh `id_token`, posts it to `/api/auth/mobile/oauth/google/id-token` with any `x-device-id`, and receives a 24 h access token plus a non-rotating 180-day refresh token (SEC-004). Admin accounts included.

**Trigger conditions:** Victim logged in via Google within the last hour; any token disclosure (SEC-001, DB backup leak, logs).

**Root cause:** Storing OAuth tokens that the app never uses; no replay protection on token exchange.

**Recommended remediation:** Don't persist `id_token`/`access_token`/`refresh_token` (strip them in a NextAuth `events.linkAccount`/adapter wrapper and in `googleAccountData`); null existing columns via migration. Require a nonce in the mobile flow (Google Sign-In supports `nonce`) or record `jti`/hash of consumed ID tokens with TTL = `exp` and reject reuse. Optionally check `azp` against the Android client ID.

**Corrected implementation:**
```ts
function googleAccountData(_tokenData: GoogleTokenResponse, profile: Pick<VerifiedGoogleProfile,'sub'>) {
  return { type: 'oauth', provider: 'google', providerAccountId: profile.sub } // no tokens persisted
}
// replay guard
const key = `gid:${crypto.createHash('sha256').update(idToken).digest('hex')}`
if (!(await redis.set(key, '1', 'EX', 3600, 'NX'))) throw new UnauthorizedError('Token already used')
```

**Regression prevention:** Test that a second exchange of the same ID token returns 401; DB test asserting `Account.id_token IS NULL` after Google login.

**References:** CWE-294; OWASP ASVS V3.5; Google Identity "Verify the Google ID token" (nonce).

---

**ID:** SEC-004
**Title:** Refresh tokens never rotate and survive password change/reset; web JWT sessions are unrevocable for 30 days
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Security (CWE-613 Insufficient Session Expiration; OWASP A07:2021)
**Location:** `src/services/mobile-auth.service.ts:63-77` (`renewRefreshToken`), `:52-61` (`rotateRefreshToken`, unused), `:84` (`revokeAllTokensForUser`, no callers); `src/app/api/auth/mobile/refresh/route.ts:19`; `src/app/api/user/me/change-password/route.ts:12`; `src/services/auth.service.ts:92-101` (`resetPassword`); `src/lib/auth/authOptions.ts` (`session.strategy: "jwt"`, `maxAge` 30 d); `src/repositories/refresh-token.repository.ts`
**Effort:** M
**Blast radius:** Application

**Evidence:**
```ts
async renewRefreshToken(rawToken, deviceId) {
  const record = await refreshTokenRepository.findValid(hashed)
  ...
  const updated = await refreshTokenRepository.extendExpiry(hashed, deviceId, expiresAt) // +180 days, same token
  return { refreshToken: rawToken, userId: record.userId }
}
```
```ts
// change-password/route.ts — hash updated, nothing revoked
await userService.update(session.user.id, { password: body.newPassword });
```
`grep revokeAllTokensForUser` → only its definition.

**Problem:** (1) A refresh token is a permanent credential while used at least every 180 days; theft is undetectable (no rotation/reuse detection); `deviceId` is overwritten so it is not device-bound. (2) Password change/reset — the standard user remedy after compromise — does not end any session. (3) Web sessions are stateless JWTs (30 days) with no session version, so they cannot be revoked; role demotion is honored only for admin routes and after 15 min elsewhere. (4) Expired/revoked rows are never purged.

**Impact:** An attacker holding a refresh token (SEC-001/003, device theft, logs) keeps access indefinitely even after the victim resets their password.

**Trigger conditions:** Any refresh-token disclosure.

**Root cause:** Token lifecycle implemented as "extend on use"; no centralized "invalidate all sessions" primitive.

**Recommended remediation:**
1. Rotate on every refresh inside a transaction with a conditional claim; on presentation of an already-revoked token, revoke the whole token family for that user (reuse detection).
2. Add `User.sessionVersion Int @default(0)`; embed it in web JWT and mobile access tokens; increment on password change/reset/account compromise; compare in the `jwt` callback (already doing a periodic DB read) and in `requireUser`.
3. Call `revokeAllTokensForUser` on password change/reset and account deletion.
4. Scheduled purge of expired/revoked `refresh_tokens`.

**Corrected implementation:**
```ts
async rotate(raw: string, deviceId: string) {
  const hashed = this.hash(raw)
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { hashedToken: hashed, revokedAt: null, expiresAt: { gt: new Date() } },
      data:  { revokedAt: new Date() },
    })
    if (claimed.count !== 1) {
      const prior = await tx.refreshToken.findUnique({ where: { hashedToken: hashed } })
      if (prior) await tx.refreshToken.updateMany({ where: { userId: prior.userId, revokedAt: null }, data: { revokedAt: new Date() } })
      throw new UnauthorizedError('Invalid refresh token')
    }
    const { userId } = (await tx.refreshToken.findUnique({ where: { hashedToken: hashed } }))!
    const next = crypto.randomBytes(40).toString('hex')
    await tx.refreshToken.create({ data: { userId, deviceId, hashedToken: this.hash(next), expiresAt: addDays(new Date(), 60) } })
    return { refreshToken: next, userId }
  })
}
```

**Regression prevention:** Tests: (a) refresh returns a *different* token and the old one is rejected; (b) reusing an old token revokes all user tokens; (c) after change-password, previous refresh tokens and web JWTs are rejected.

**References:** CWE-613; OWASP ASVS V3.3; OAuth 2.0 Security BCP (RFC 9700) §4.14 refresh token rotation.

---

**ID:** SEC-005
**Title:** Turnstile captcha is bypassable — sibling credential/registration endpoints don't require it; rate limits degrade to a global bucket
**Severity:** P1 — High
**Confidence:** Confirmed (bypass) / High (rate-limit degradation depends on `TRUSTED_PROXY` in production)
**Category:** Security (CWE-307 Improper Restriction of Excessive Authentication Attempts, CWE-804; OWASP A07:2021)
**Location:** Turnstile enforced only in `src/lib/auth/authOptions.ts:45-50` (NextAuth credentials) and `src/app/api/auth/register/route.ts:21-24`. Not enforced in: `src/app/api/auth/login/route.ts` (no in-repo caller; sets a session cookie), `src/app/api/auth/mobile/login/route.ts`, `src/app/api/auth/mobile/register/route.ts`, `src/app/api/auth/mobile/oauth/google/id-token/route.ts`, `src/app/api/auth/resend-verification/route.ts`, `src/app/api/auth/request-reset-password/route.ts`, `src/app/api/auth/mobile/request-reset/route.ts`. IP resolution: `src/lib/rateLimit.ts:124-140` (`getIp`).
**Effort:** M
**Blast radius:** Application

**Evidence:**
```ts
// mobile/login/route.ts — same credential check as web, no captcha
await checkRateLimit('signin', getIp(req.headers))
const { email, password } = loginSchema.parse(await req.json())
const user = await userService.verifyPassword(email, password)
```
```ts
// rateLimit.ts
export function getIp(headers) {
  const trusted = env.TRUSTED_PROXY
  if (!trusted) return "unknown"      // every anonymous client shares ONE bucket
```

**Problem:** Bots use `/api/auth/mobile/login` (or the unused `/api/auth/login`) for credential stuffing and `/api/auth/mobile/register` for mass account creation, bypassing the web captcha. Per-IP limits (10 sign-ins / 15 min) are trivially distributed across IPs. If `TRUSTED_PROXY` is unset, all anonymous traffic shares a single bucket, so ten failed logins from anyone locks out *every* user for 15 minutes (DoS); if `TRUSTED_PROXY=cloudflare` but the origin is reachable without Cloudflare, `cf-connecting-ip` is spoofable and limits are bypassed.

**Impact:** Credential stuffing against leaked emails (SEC-001), spam account creation (feeding SEC-006 email abuse), and potential global login lockout.

**Trigger conditions:** Any client calling the mobile endpoints; deployment-dependent proxy configuration.

**Root cause:** Duplicated web/mobile auth flows without a shared "credential endpoint policy".

**Recommended remediation:**
1. Delete `/api/auth/login` (dead, captcha-less session issuer) — the web uses NextAuth.
2. For mobile: Turnstile has a mobile SDK/WebView flow; alternatively use Play Integrity attestation. Apply the same check in a shared `assertHumanOrAttested(req)` helper on all credential, registration, reset and resend endpoints.
3. Add per-account (email-keyed) throttling with exponential backoff alongside per-IP limits.
4. Fail fast at boot in production if `TRUSTED_PROXY` is unset, and lock the origin to Cloudflare IP ranges (or use authenticated origin pulls) when `TRUSTED_PROXY=cloudflare`.

**Corrected implementation:**
```ts
// lib/auth/credentialPolicy.ts
export async function enforceCredentialPolicy(req: NextRequest, email?: string) {
  const ip = getIp(req.headers)
  await checkRateLimit('signin', ip)
  if (email) await checkRateLimit('signin-account', email.toLowerCase())
  const proof = req.headers.get('x-turnstile-token') ?? ''
  if (!(await verifyTurnstileToken(proof, ip))) throw new ForbiddenError('Captcha verification failed')
}
```

**Regression prevention:** Route-inventory test listing every `src/app/api/auth/**` POST and asserting it calls `enforceCredentialPolicy` (mock `verifyTurnstileToken` → false ⇒ 403).

**References:** CWE-307; OWASP ASVS V2.2.1; OWASP Automated Threats OAT-008 (Credential Stuffing); Cloudflare Turnstile docs "Server-side validation".

---

**ID:** SEC-006
**Title:** HTML injection in transactional emails sent from the product domain to arbitrary recipients
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Security (CWE-79/CWE-80 in email context, CWE-74; phishing amplification)
**Location:** `src/utils/mail.ts` — `sendCollectionInviteEmail` (`~:168-218`: `hostName`, `collectionTitle`, `location` in HTML and subject), suggestion notification (`~:127-163`: `userName`, `title`, `content`, `targetName`); caller `src/app/api/planned-collections/[id]/invite/route.ts:13-38`
**Effort:** S
**Blast radius:** Application (brand/domain reputation)

**Evidence:**
```ts
<strong>${hostName}</strong> is hosting <strong>${collectionTitle}</strong> and would love for you to come.
...
<td ...>${location}</td>
```
```ts
// invite/route.ts — any recipient address, title/location are user-controlled
await mailService.sendCollectionInvite({ to: parsed.data.email, hostName: session.user.name ?? 'A friend',
  collectionTitle: item.title, shareToken: item.shareToken, plannedFor: item.plannedFor, location: item.location })
```

**Problem:** User-controlled strings are interpolated into HTML without escaping.

**Impact:** Any registered user (accounts are free to create via SEC-005) can send emails *from MixoGuide's verified sender* to any address containing arbitrary links/markup ("Your account is suspended — verify here"), 10 per hour per account. This damages sender reputation (SPF/DKIM-aligned phishing) and can get the Resend domain blocked. The admin suggestion email lets users inject markup into admin inboxes.

**Trigger conditions:** Collection with HTML in title/location or a profile name with HTML; invite sent.

**Root cause:** Hand-built HTML templates via template literals; no escaping utility.

**Recommended remediation:** Escape every interpolated value (HTML entity encode); strip CR/LF from subjects; consider React Email or a templating engine with auto-escaping; reduce invite rate (per user per day) and require the account to be email-verified and older than N hours.

**Corrected implementation:**
```ts
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
const body = `<strong>${esc(hostName)}</strong> is hosting <strong>${esc(collectionTitle)}</strong> …`
subject: `You're invited: ${collectionTitle.replace(/[\r\n]+/g, ' ').slice(0, 120)}`,
```

**Regression prevention:** Snapshot test rendering each template with `<a href="x">` inputs and asserting no raw `<a` from user input appears; ESLint rule or code review checklist banning raw `${}` in HTML templates outside `esc()`.

**References:** CWE-80; OWASP "Email injection"; OWASP ASVS V5.3.1 (output encoding).

---

**ID:** SEC-007
**Title:** Any logged-in user can overwrite the global barcode → ingredient mapping; GET handler mutates state and calls an external API without rate limit
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Security (CWE-285 Improper Authorization; data integrity)
**Location:** `src/app/api/ingredients/by-barcode/[barcode]/route.ts:12-17`; `src/services/barcode.service.ts:225-239`
**Effort:** S
**Blast radius:** Module (barcode scanning for all users)

**Evidence:** `POST` is `withUser` with no role check; the service upserts the shared `IngredientBarcode` row with the caller-supplied `ingredientId`. The `GET` path writes to the DB and calls OpenFoodFacts.

**Problem:** A global catalog mapping is writable by every user (broken function-level authorization); state-changing GET; outbound request amplification with no limit.

**Impact:** Vandalism of scanning results for everyone (e.g. mapping a popular soda barcode to an absinthe); outbound-request abuse.

**Trigger conditions:** `POST /api/ingredients/by-barcode/<ean> {"ingredientId": "<any>"}` by any account.

**Root cause:** User-contributed data written directly to shared tables without moderation.

**Recommended remediation:** Store user confirmations per user (`UserBarcodeConfirmation`), promote to the global mapping only by admin or after N independent confirmations; make GET side-effect free (cache lookups in Redis instead of DB writes); add a `barcode-lookup` rate limit and a fetch timeout.

**Corrected implementation:**
```ts
export const POST = withUser(async (req, { params }, session) => {
  const { ingredientId } = confirmSchema.parse(await req.json())
  await barcodeService.recordUserConfirmation(session.user.id, (await params).barcode, ingredientId) // per-user table
  return ApiResponse.success({ recorded: true })
}, { rateLimit: 'barcode' })
```

**Regression prevention:** Integration test: non-admin POST must not change what another user's GET returns.

**References:** CWE-285; OWASP API5:2023 Broken Function Level Authorization.

---

**ID:** SEC-008
**Title:** Account enumeration oracles and password-less "account squatting" via public registration
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Security (CWE-204 Observable Response Discrepancy, CWE-208 timing)
**Location:** `src/app/api/auth/resend-verification/route.ts:17-18` (404 unknown / 400 already verified / 204); `src/services/user.service.ts:24-26` (register → 409); `src/services/user.service.ts:49-57` & `authOptions.ts:54-63` (bcrypt skipped for unknown email → timing); `src/validations/auth.validation.ts` `publicRegisterSchema.password` is `.optional()`; `src/app/api/auth/mobile/register/route.ts` returns `userId`; Google login conflict `utils.ts` (`ConflictError` for existing email)
**Effort:** S
**Blast radius:** Application

**Evidence:**
```ts
const user = await userService.getByEmail(email)              // throws NotFoundError → 404
if (user.emailVerified) throw new BadRequestError("Email already verified")
```
```ts
password: z.string().min(8, ...).max(100).optional(),          // public schema
```

**Problem:** Three independent oracles reveal whether an email is registered. Registration accepts no password, so anyone can create an unverified, password-less account for someone else's email; the real owner then gets a generic 409 on signup and "already registered with another provider" on Google login until they discover the reset flow.

**Impact:** Targeted phishing/stuffing lists; denial of signup for victims.

**Trigger conditions:** Unauthenticated requests.

**Root cause:** Error-driven control flow in public auth endpoints; schema reused between admin and public creation.

**Recommended remediation:** Always return 204 from resend/reset; on register with existing email return the same 201 + send a "someone tried to register with your email" mail; run a dummy `bcrypt.compare` against a fixed hash when the user doesn't exist; make `password` required in `publicRegisterSchema`; purge unverified accounts older than 7 days; don't return `userId` from mobile register.

**Corrected implementation:**
```ts
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), 12) // computed once at module load
async verifyPassword(email, password) {
  const user = await userRepository.findByEmail(email)
  const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)
  return user?.password && ok ? user : null
}
```

**Regression prevention:** Tests asserting identical status/body for existing vs non-existing emails on register, resend, reset.

**References:** CWE-204, CWE-208; OWASP ASVS V2.2.3 / V3.

---

**ID:** SEC-009
**Title:** Email-verification and password-reset tokens are interchangeable; verification is a state-changing GET that logs the user in
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Security (CWE-640 Weak Password Recovery, CWE-352-adjacent)
**Location:** `src/services/auth.service.ts:54-101`; `src/utils/token.ts` (duplicate implementation used by `authOptions.ts:66`); `src/app/api/auth/verify-email/route.ts`; `prisma/schema.prisma` `VerificationToken`
**Effort:** S
**Blast radius:** Module (auth)

**Evidence:** Both flows call `createEmailToken(email)` (identifier = bare email) and `verifyEmailToken(rawToken)`; `/api/auth/verify-email` (GET) consumes the token, sets `emailVerified`, and issues a session cookie.

**Problem:** A token minted for verification is accepted by `/reset-password` and vice versa (same mailbox, so not a direct takeover, but it violates purpose binding). Email link scanners (Outlook Safe Links, corporate proxies) follow GET links: they consume the single-use token and receive the session cookie; the real user's click then fails. Each failed credential login of an unverified user also re-sends a verification email (`authOptions.ts`), invalidating earlier links.

**Impact:** Broken verification for corporate mailboxes; purpose confusion that complicates future features (e.g. email change).

**Trigger conditions:** Prefetching mail clients; parallel verification + reset requests.

**Root cause:** One generic token table without a `purpose` column; GET used for a state change.

**Recommended remediation:** Prefix identifiers (`verify:<email>`, `reset:<email>`) or add a `purpose` column checked on consume; make the verification link land on a page that POSTs the token (one click "Confirm email"); remove `src/utils/token.ts` in favour of `authService`.

**Corrected implementation:**
```ts
createEmailToken(email: string, purpose: 'verify' | 'reset') { /* identifier: `${purpose}:${email}` */ }
verifyEmailToken(raw: string, purpose: 'verify' | 'reset') { /* consume where identifier startsWith `${purpose}:` */ }
```

**Regression prevention:** Test that a reset token is rejected by verify and vice versa.

**References:** CWE-640; OWASP Forgot Password Cheat Sheet.

---

**ID:** SEC-010
**Title:** Custom session cookie name does not match NextAuth's production (`__Secure-`) cookie — post-verification/reset auto-login silently fails in production
**Severity:** P2 — Medium
**Confidence:** High (verified against installed `next-auth/core/lib/cookie.js`; requires runtime confirmation)
**Category:** Security / Reliability (session management correctness)
**Location:** `src/app/api/auth/verify-email/route.ts:24`, `src/app/api/auth/reset-password/route.ts:21`, `src/app/api/auth/login/route.ts:25` (`res.cookies.set("next-auth.session-token", …)`); `src/services/auth.service.ts:28-52`; `node_modules/next-auth/core/init.js:60` (`useSecureCookies ?? url.base.startsWith("https://")`), `core/lib/cookie.js:18` (`__Secure-` prefix)
**Effort:** XS
**Blast radius:** Module (auth UX)

**Evidence:** NextAuth reads `__Secure-next-auth.session-token` when `NEXTAUTH_URL` is HTTPS; the app writes `next-auth.session-token`.

**Problem:** In production the hand-minted cookie is ignored, so users are not logged in after verifying email or resetting the password, and a stale non-prefixed JWT lingers in the browser (30 days) outside NextAuth's sign-out handling.

**Impact:** Broken onboarding UX; orphaned bearer cookie that sign-out does not clear.

**Trigger conditions:** Any HTTPS deployment.

**Root cause:** Bypassing NextAuth's session issuance instead of using its cookie configuration.

**Recommended remediation:** Derive the name from `useSecureCookies` (`__Secure-next-auth.session-token` on HTTPS) and set `secure` accordingly, or (better) redirect to a NextAuth sign-in with a one-time login token provider instead of minting JWTs manually.

**Corrected implementation:**
```ts
const secure = env.NEXTAUTH_URL.startsWith('https://')
res.cookies.set(`${secure ? '__Secure-' : ''}next-auth.session-token`, token, { ...cookieOptions, secure })
```

**Regression prevention:** E2E test against an HTTPS build: verify-email link results in an authenticated `/api/auth/session`.

**References:** NextAuth v4 docs "Options → cookies / useSecureCookies"; MDN cookie prefixes.

---

**ID:** SEC-011
**Title:** `DELETE /api/user/me` deletes the account without re-authentication
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Security (CWE-306 for critical function; ASVS V3.7 re-authentication)
**Location:** `src/app/api/user/me/route.ts:21-32`
**Effort:** XS
**Blast radius:** Component

**Evidence:**
```ts
const body = await req.json().catch(() => ({}));
if (typeof body.password === "string" && body.password.length > 0) { /* only checked if provided */ }
await userService.delete(session.user.id);
```

**Problem:** The comment says credential users must confirm their password, but an empty body skips the check. Also uses `session.user.email!` (OAuth users may have no email).

**Impact:** A stolen bearer token/session or any XSS permanently deletes the account and cascades all user data.

**Trigger conditions:** `DELETE /api/user/me` with an empty body.

**Root cause:** Optional check where a mandatory one was intended.

**Recommended remediation:** Require the password for users with a password; for OAuth-only users require a fresh login (session `iat` < 5 min) or a typed confirmation + emailed confirmation link.

**Corrected implementation:**
```ts
const user = await userRepository.findAuthById(session.user.id)
if (user.password) {
  if (typeof body.password !== 'string' || !(await bcrypt.compare(body.password, user.password)))
    throw new ForbiddenError('Password confirmation required')
} else if (!isRecentLogin(session)) throw new ForbiddenError('Please sign in again to delete your account')
```

**Regression prevention:** Test: DELETE without password for a credential user → 403.

**References:** OWASP ASVS V3.7.1.

---

**ID:** SEC-012
**Title:** Unthrottled, unauthenticated endpoints and unbounded inputs enable cheap resource exhaustion
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Security (CWE-770 Allocation of Resources Without Limits; OWASP API4:2023)
**Location:** No `rateLimit`: `src/app/api/{glasses,bar-tools,ingredient-types,ingredient-subtypes}/route.ts` (GET), `src/app/api/smart-collections/**`, `src/app/api/invite/[token]/route.ts`, `src/app/api/invite/[token]/rsvp/route.ts` (also no CSRF), `src/app/api/ingredients/by-barcode/[barcode]/route.ts`, `src/app/api/auth/mobile/refresh/route.ts`; `src/app/(home)/bar/og/route.tsx` (rate limit only via cached loader; image render per request); `limit` up to 500 with nested includes (`QueryBuilder.ts:12-21`); unbounded arrays `createPlannedCollectionSchema.cocktailIds/occasions` (`src/validations/index.ts:156-157`); device strings (`:242-247`); `src/app/api/upload/route.ts` buffers the full multipart body before the 5 MB check.
**Effort:** S
**Blast radius:** Application

**Evidence:** e.g. `export const GET = withPublic(async (req) => { … })` with no options on glasses/bar-tools; `const formData = await req.formData()` before size validation in upload.

**Problem:** Expensive DB queries (nested includes × 500 rows), OG image rendering (CPU), RSVP inserts and multipart parsing can be triggered without limits; anonymous RSVP rows are unbounded per collection.

**Impact:** DB/CPU exhaustion; RSVP spam on a host's event page.

**Trigger conditions:** Scripted requests.

**Root cause:** Rate limiting is opt-in per route.

**Recommended remediation:** Make `withPublic` apply `public-read` by default (opt-out explicitly); add `rsvp` (per token + IP) limit and `validateCsrf` to RSVP; cap arrays with `.max()`; reject `Content-Length` > 5 MB before `formData()`; cap `limit` at 100 on public routes; cache OG images with `Cache-Control: public, max-age=…, immutable` keyed by canonical param.

**Corrected implementation:**
```ts
export function withPublic(handler, options: RouteOptions = { rateLimit: 'public-read' }) { … }
const len = Number(req.headers.get('content-length') ?? 0); if (len > 5_242_880) throw new PayloadTooLargeError()
cocktailIds: z.array(cuid).max(50), occasions: z.array(z.string().max(40)).max(10)
```

**Regression prevention:** Route-inventory test asserting every `withPublic` route has a rate-limit policy; schema tests for `.max()` on arrays.

**References:** CWE-770; OWASP API4:2023 Unrestricted Resource Consumption.

---

**ID:** SEC-013
**Title:** Push-device registration can hijack another user's FCM token
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Security (CWE-639)
**Location:** `src/repositories/device.repository.ts:4-13`; `src/app/api/devices/route.ts` (POST)
**Effort:** XS
**Blast radius:** Component

**Evidence:** `prisma.device.upsert({ where: { fcmToken }, update: { userId, … } })`.

**Problem:** Posting a known FCM token re-assigns the device to the caller. FCM tokens are leaked by SEC-001.

**Impact:** Victim stops receiving notifications or receives the attacker's.

**Trigger conditions:** Knowledge of another user's FCM token.

**Root cause:** Upsert keyed on a client-supplied identifier without ownership semantics.

**Recommended remediation:** Only allow re-assignment when the token is currently unowned or owned by the caller; otherwise delete the old binding only after the app proves possession (FCM tokens are only obtainable on-device, so the main fix is closing SEC-001).

**Corrected implementation:** `update: {}` when `existing.userId !== userId` and log; or `deleteMany({ fcmToken })` + `create` only for the authenticated device registration flow.

**Regression prevention:** Test that user B registering user A's token does not change A's row.

**References:** CWE-639.

---

**ID:** SEC-014
**Title:** Upload validation trusts client-declared MIME type
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Security (CWE-434)
**Location:** `src/app/api/upload/route.ts`
**Effort:** XS
**Blast radius:** Component

**Evidence:** Type check uses `file.type` from the multipart part; upload goes to Cloudinary with `resource_type: 'image'`, fixed `avatars` folder, no user-controlled `public_id`.

**Problem:** Cloudinary's `image` resource type rejects non-images, so practical risk is low; the server still accepts and buffers arbitrary content.

**Impact:** Limited (mainly SEC-012 memory pressure).

**Trigger conditions:** Spoofed `Content-Type`.

**Root cause:** No magic-byte check.

**Recommended remediation:** Check magic bytes (JPEG/PNG/WebP) and dimensions before upload; set Cloudinary `allowed_formats`.

**Corrected implementation:** `if (!isImageMagic(new Uint8Array(buf.slice(0, 12)))) throw new ValidationError('Unsupported file')`.

**Regression prevention:** Unit test with a text file renamed `.png`.

**References:** CWE-434; OWASP File Upload Cheat Sheet.

---

**ID:** SEC-015
**Title:** CSP allows `'unsafe-inline'` scripts plus wildcard third-party ad origins
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Security (CWE-1021/CWE-79 defense-in-depth)
**Location:** `next.config.ts` `headers()` → `Content-Security-Policy`
**Effort:** M
**Blast radius:** Application

**Evidence:** `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net`.

**Problem:** `'unsafe-inline'` neutralizes CSP as an XSS mitigation. No XSS sink was found (both `dangerouslySetInnerHTML` uses render static content), so this is defense in depth.

**Impact:** Any future XSS becomes fully exploitable (session cookie is HttpOnly, but authenticated same-origin API calls are possible).

**Trigger conditions:** Future injection bug.

**Root cause:** Nonce-based CSP not wired.

**Recommended remediation:** Generate a nonce in `src/proxy.ts`, pass via header, use `'nonce-…' 'strict-dynamic'` (Next.js supports nonces for its inline scripts in dynamic rendering); scope ad scripts to pages that show ads; add `report-to`.

**Corrected implementation:** See Next.js docs "Content Security Policy → Adding a nonce with Proxy/Middleware".

**Regression prevention:** Header assertion test in Playwright.

**References:** Next.js 16 docs (CSP guide); OWASP CSP Cheat Sheet.

---

**ID:** SEC-016
**Title:** Turnstile server-side verification lacks timeout, hostname/action checks and input typing
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Security (CWE-345, CWE-400)
**Location:** `src/utils/turnstile.ts:32-80`; `src/app/api/auth/register/route.ts:21`; `src/components/ui/TurnstileWidget.tsx:107-126`; `src/app/(auth)/signin/page.tsx:158-168`, `signup/page.tsx:255-265`
**Effort:** XS
**Blast radius:** Module

**Evidence:**
```ts
const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", … }) // no signal/timeout
if (data.success === true) return true                                                                     // hostname/action unchecked
```
```ts
const turnstileToken = body.turnstileToken as string | undefined   // a non-string (e.g. {}) → token.trim() throws → 500
```
Widget: `if (!siteKey) return null` → submit button permanently disabled with no message; `options={{ theme: "light" }}` in a dark-theme UI; no `action` set.

**Problem:** A slow siteverify response stalls login requests indefinitely; tokens minted for another hostname using the same sitekey (or for a different widget action) are accepted; malformed input yields 500s; configuration errors lock users out silently.

**Impact:** Availability and minor validation weaknesses; accessibility (3.3.8 cannot be fully assessed statically — see A11Y manual list).

**Trigger conditions:** Cloudflare latency; misconfiguration; malformed body.

**Root cause:** Minimal integration of the siteverify contract.

**Recommended remediation:** `AbortSignal.timeout(3000)` and fail closed; validate `typeof token === 'string' && token.length <= 2048`; verify `data.hostname` ∈ expected hosts and `data.action` matches (`signin` / `signup`) by passing `action` to the widget; pass `idempotency_key` if retries are added; render an error message and retry button when the widget errors or the sitekey is missing; use `theme: "auto"`.

**Corrected implementation:**
```ts
export async function verifyTurnstileToken(token: unknown, remoteIp?: string, expectedAction?: string) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false
  …
  const res = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(3000) })
  const data = await res.json() as TurnstileSiteverifyResponse
  return data.success === true
      && (!expectedAction || data.action === expectedAction)
      && ALLOWED_HOSTNAMES.has(data.hostname ?? '')
}
```

**Regression prevention:** Extend `tests/unit/utils/turnstile.test.ts` with timeout, wrong-hostname and wrong-action cases.

**References:** Cloudflare Turnstile docs "Server-side validation" (hostname, action, error codes, token max length 2048).

---

**ID:** SEC-017
**Title:** Password hashes and OAuth tokens returned to admins and to users about themselves
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Security (least privilege, CWE-200)
**Location:** `src/app/api/user/all/route.ts` + `src/repositories/user.repository.ts:14` (`allowedIncludes: ['accounts', …]`, full rows); `src/repositories/planned-collection.repository.ts:52,65` (`user: true` on `?include=user`); `user.repository.ts:24-45` (`findWithStats` selects `password` — stripped by the profile route, but the delete-account page also loads it server-side)
**Effort:** XS
**Blast radius:** Module

**Evidence:** `GET /api/user/all?include=accounts` returns `password`, `access_token`, `refresh_token`, `id_token` for every user to any admin.

**Problem:** Secrets reach browsers that never need them; one compromised admin session (or XSS in admin) exposes everything.

**Impact:** Amplifies any admin compromise.

**Trigger conditions:** Admin listing; users listing their collections with `include=user`.

**Root cause:** Same as SEC-001.

**Recommended remediation:** Fixed by SEC-001 (global `omit` + explicit selects); replace `findWithStats` `password: true` with `hasPassword` computed in SQL (`password IS NOT NULL`).

**Corrected implementation:** `select: { …, password: false }` and `hasPassword: Boolean(row.passwordSetAt)` or a raw `password IS NOT NULL` projection.

**Regression prevention:** Response-shape test (SEC-001 b) extended to `withUser`/`withAdmin` routes.

**References:** OWASP ASVS V8.3.

---

**ID:** SEC-018
**Title:** Login email not normalized in NextAuth credentials; email in URL query strings
**Severity:** P3 — Low
**Confidence:** Confirmed (code) / Medium (impact depends on stored casing)
**Category:** Security / correctness (CWE-178 Improper Handling of Case Sensitivity, CWE-598)
**Location:** `src/lib/auth/authOptions.ts:54-56` (`findUnique({ where: { email: credentials.email } })` — raw); registration lowercases (`emailSchema.toLowerCase()`); `src/app/(auth)/signin/page.tsx:45` (`/check-email?email=…`); Prisma `User.email` is case-sensitive `@unique`
**Effort:** XS
**Blast radius:** Module

**Evidence:** Register stores `john@x.com`; sign-in with `John@x.com` → `findUnique` misses → "Invalid email or password".

**Problem:** Users who type capitals cannot log in on the web (mobile path lowercases); emails placed in URLs end up in logs, history and Referer headers. Password policy: max 100 chars but bcrypt truncates at 72 bytes; no breached-password check.

**Impact:** Login failures/support load; minor PII leakage.

**Trigger conditions:** Mixed-case input.

**Root cause:** Validation schemas not reused in NextAuth `authorize`.

**Recommended remediation:** `loginSchema.parse(credentials)` inside `authorize`; store `email` as `citext` or add a functional unique index on `lower(email)`; pass the email via `sessionStorage` instead of the query string; cap passwords at 72 bytes or pre-hash; optionally check HIBP k-anonymity API.

**Corrected implementation:** `const { email, password } = loginSchema.parse(credentials)`.

**Regression prevention:** Test sign-in with upper-case email.

**References:** OWASP ASVS V2.1.

---

**ID:** SEC-019
**Title:** Mobile access tokens trust embedded role for 24 h; deleted users keep valid tokens
**Severity:** P4 — Informational
**Confidence:** Confirmed
**Category:** Security
**Location:** `src/lib/auth/requireAdmin.ts` (`sessionFromBearerToken`, `requireUser`)
**Effort:** S
**Blast radius:** Module

**Evidence:** `requireUser` returns the decoded payload without a DB check; admin routes do re-check the DB (good).

**Problem/Impact:** A deleted or demoted user's mobile token keeps working for up to 24 h on user routes.

**Trigger conditions:** Account deletion/demotion.

**Root cause:** Stateless tokens without a session version.

**Recommended remediation:** Shorten access-token TTL to 15 min once refresh rotation (SEC-004) exists, and include `sessionVersion`.

**Corrected implementation:** See SEC-004.

**Regression prevention:** Test: deleted user's access token → 401.

**References:** OWASP ASVS V3.5.

### C.2 Database and Prisma

Volume assumptions used for impact estimates: ~5k cocktails, ~1k ingredients, 100k users, ~1M pantry rows, ~2M favorites, ~1M made-logs. No `EXPLAIN` was run (no authorized database); plan predictions are based on schema indexes.

---

**ID:** DB-001
**Title:** Pantry decrement is a lost-update race; the "serializable" comment is false
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Database (CWE-362 Race Condition, CWE-367)
**Location:** `src/repositories/pantry.repository.ts:206-305` (`decrementForCocktail`; transaction at `:226`, absolute writes at `:264` and `:305`)
**Effort:** M
**Blast radius:** Module (pantry quantities for all users)

**Evidence:**
```ts
// comment claims serializable isolation, but:
return prisma.$transaction(async (tx) => {             // no isolationLevel → READ COMMITTED
  const items = await tx.userPantryItem.findMany({ where: { userId, … } })   // read
  …
  await tx.userPantryItem.update({ where: { id }, data: { quantity: newQty } }) // absolute write
})
```

**Problem:** Two concurrent "make"/"complete" requests read the same quantity (e.g. 70 cl) and both write 64 cl; one deduction is lost.

**Impact:** Pantry quantities drift upward; "low stock"/makeable results become wrong. Probability rises with mobile retries and double taps.

**Trigger conditions:** Two decrements for the same user overlapping in time (double submit, two devices, collection completion + single completion).

**Root cause:** Read-modify-write with absolute values at READ COMMITTED.

**Recommended remediation:** Use relative atomic updates per row (`quantity = GREATEST(0, quantity - $amount)`), or lock the user's rows (`SELECT … FOR UPDATE`) first, or set `isolationLevel: Serializable` with P2034 retry. Fix the comment.

**Corrected implementation:**
```ts
await tx.$executeRaw`
  UPDATE user_pantry_items
     SET quantity = ROUND(GREATEST(0, quantity - ${amount})::numeric, 3)
   WHERE id = ${item.id} AND NOT is_infinite`
```

**Regression prevention:** DB integration test firing two concurrent decrements with `Promise.all` and asserting the final quantity equals initial − 2×amount.

**References:** PostgreSQL docs §13.2 Transaction Isolation; Prisma "Transactions → isolation levels"; CWE-362.

---

**ID:** DB-002
**Title:** Cocktail/collection completion is not idempotent or atomic — double logs and double ingredient deductions
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Database (data integrity; CWE-362)
**Location:** `src/services/planned-cocktail.service.ts:43-106` (`makeNow`, `complete`); `src/services/planned-collection.service.ts:60-129` (`complete`, `completeCocktail`); `src/app/api/cocktails/[id]/make/route.ts`
**Effort:** M
**Blast radius:** Module

**Evidence:** `complete` doesn't check `status === 'done'`, then runs `update` → `madeLog.create` → `decrementForCocktail` → cache invalidation as four independent writes. Collection completion decrements for each `entry.status !== 'done'` from a stale read, then calls `completeAllCocktails`.

**Problem:** Retries/double taps produce duplicate made-logs and repeated deductions; a failure mid-sequence leaves a made-log without deduction (or vice versa).

**Impact:** Corrupted pantry and statistics (streaks, top cocktails); user-visible inconsistency.

**Trigger conditions:** Network retry, double click, two devices.

**Root cause:** Check-then-act across multiple statements without a claim step or transaction; repository functions don't accept a transaction client.

**Recommended remediation:** Claim first (`updateMany where status='planned' → 'done'`, require `count === 1`), then create the log and decrement inside the same `$transaction` (pass `tx` into repositories). For collections, claim the specific `PlannedCollectionCocktail` rows and decrement only for claimed rows in one batched call. Accept an `Idempotency-Key` header for `make`.

**Corrected implementation:**
```ts
await prisma.$transaction(async (tx) => {
  const claimed = await tx.plannedCocktail.updateMany({
    where: { id, userId, status: 'planned' }, data: { status: 'done', completedAt: new Date() } })
  if (claimed.count !== 1) throw new ConflictError('Already completed')
  await tx.cocktailMadeLog.create({ data: { userId, cocktailId, servings } })
  await pantryRepository.decrementForCocktail(tx, userId, cocktailId, servings)
})
await invalidateMakeableCache(userId)  // after commit
```

**Regression prevention:** Concurrency test calling `complete` twice in parallel → exactly one made-log and one deduction.

**References:** Prisma "Interactive transactions"; Stripe-style idempotency keys pattern.

---

**ID:** DB-003
**Title:** "Makeable cocktails" is computed by loading up to 800 unordered cocktails into memory — results are silently truncated and nondeterministic
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Database (correctness + query performance)
**Location:** `src/repositories/cocktail.repository.ts:316-369` (`findMakeable`); `src/services/cocktail.service.ts:22-38` (`getMakeable`, uncached path); `src/services/recommendation.service.ts:28-34`
**Effort:** L
**Blast radius:** Module (core feature)

**Evidence:**
```ts
const candidates = await prisma.cocktail.findMany({
  where: { ingredients: { some: { ingredientId: { in: satisfiableIds } } } },
  take: Math.min(resultLimit * 4, 800),           // no orderBy
  include: { ingredients: { include: { ingredient: { include: { type: true, subType: true } } } } },
})
// missing-count filtering and sorting happen afterwards in JS
```

**Problem:** For a typical pantry (lime, sugar, gin, vodka) most of the catalogue matches the `some` filter; Postgres returns an arbitrary 800 rows, so fully makeable cocktails can be omitted and results vary between calls. Each call hydrates ~800 × ~5 ingredients × type/subtype, and adds every derivation base id into an `IN (…)` list. Recommendations call this on every request.

**Impact:** Wrong answers for the product's headline feature; high DB I/O and Node CPU per request (estimated tens to hundreds of ms at 5k cocktails; grows linearly with catalogue).

**Trigger conditions:** Catalogue larger than `resultLimit*4` matching cocktails.

**Root cause:** Set-coverage computed in application memory instead of in SQL.

**Recommended remediation:** Compute coverage in SQL and hydrate only the qualifying ids, then apply quantity checks to that small set; cache per user (DB-010).

**Corrected implementation:**
```sql
SELECT ci.cocktail_id,
       count(*) FILTER (WHERE NOT ci.optional)                                         AS required,
       count(*) FILTER (WHERE NOT ci.optional AND ci.ingredient_id = ANY($1::text[]))   AS have
FROM cocktail_ingredients ci
GROUP BY ci.cocktail_id
HAVING count(*) FILTER (WHERE NOT ci.optional)
     - count(*) FILTER (WHERE NOT ci.optional AND ci.ingredient_id = ANY($1::text[])) <= $2
ORDER BY 2 - 3, ci.cocktail_id
LIMIT $3;
```
(use `Prisma.sql` with bound parameters; `cocktail_ingredients(ingredient_id)` index already exists per migration `20260411094707`).

**Regression prevention:** DB test with > 800 matching cocktails asserting a known fully-makeable cocktail is returned; deterministic ordering assertion.

**References:** PostgreSQL aggregate `FILTER` clause; Prisma `$queryRaw` with `Prisma.sql`.

---

**ID:** DB-004
**Title:** Deleting an ingredient cascades into every recipe and every user pantry
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Database (dangerous referential actions)
**Location:** `prisma/schema.prisma:395` (`CocktailIngredient.ingredient … onDelete: Cascade`), `:446` (`UserPantryItem.ingredient … onDelete: Cascade`); `src/services/ingredient.service.ts:127` (`delete`); `CocktailIngredient.substitutes String[]` (no FK)
**Effort:** S
**Blast radius:** Application (catalog + all users' pantries)

**Evidence:** `ingredient Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)`.

**Problem:** One admin click on an ingredient used by 300 cocktails silently removes it from 300 recipes and from every user's pantry; substitutes arrays keep dangling ids. Related: user deletion keeps RSVP rows (`SetNull`) with guest name/email on others' events (GDPR consideration); cocktail deletion silently drops entries from users' planned events; `IngredientType` delete is `Restrict` but raises P2003 → 500 (DB-005).

**Impact:** Irreversible catalog corruption and user data loss without backups.

**Trigger conditions:** Admin deletes an in-use ingredient.

**Root cause:** Cascade chosen for convenience on catalog → user-data relations.

**Recommended remediation:** `onDelete: Restrict` on `CocktailIngredient.ingredient` and `UserPantryItem.ingredient`; service returns 409 with usage counts; provide a "merge ingredient" admin flow (reuse the transactional `simplifyIngredients` seeder logic); validate `substitutes` ids or move to a join table.

**Corrected implementation:**
```prisma
model CocktailIngredient { ingredient Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Restrict) … }
```

**Regression prevention:** DB test: deleting a referenced ingredient fails with 409.

**References:** Prisma "Referential actions"; PostgreSQL FK `ON DELETE RESTRICT`.

---

**ID:** DB-005
**Title:** Prisma known-request errors (P2002/P2003/P2034) surface as HTTP 500; check-then-create races
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Database / API design
**Location:** `src/utils/apiResponse.ts:38-54` (`fromError`); races in `src/services/favorite.service.ts:16-20`, `src/services/user.service.ts:24-33`, `src/services/planned-collection.service.ts` (`addCocktail`), `src/services/pantry.service.ts:83-161` (Serializable tx without P2034 retry)
**Effort:** S
**Blast radius:** Application

**Evidence:** `fromError` maps only `AppError` and `ZodError`; everything else → 500 "Internal server error".

**Problem:** Duplicate favorites/registrations under concurrency, FK violations from bad ids, and serialization failures all become 500s (and are retried by clients/TanStack Query).

**Impact:** Misleading errors, noisy alerts, unnecessary retries.

**Trigger conditions:** Concurrent duplicate requests; invalid foreign keys; serialization conflicts.

**Root cause:** No Prisma error translation layer.

**Recommended remediation:** Map `PrismaClientKnownRequestError` codes: P2002 → 409, P2003 → 409/422, P2025 → 404, P2034 → retry ×3 then 409. Prefer `upsert`/`createMany({ skipDuplicates: true })` for idempotent creates.

**Corrected implementation:**
```ts
if (err instanceof Prisma.PrismaClientKnownRequestError) {
  if (err.code === 'P2002') return ApiResponse.error('Already exists', 409, 'CONFLICT')
  if (err.code === 'P2003') return ApiResponse.error('Related resource missing or in use', 409, 'CONSTRAINT')
  if (err.code === 'P2025') return ApiResponse.error('Not found', 404, 'NOT_FOUND')
}
```

**Regression prevention:** Unit tests for `fromError` with each code.

**References:** Prisma error reference (P2002, P2003, P2025, P2034).

---

**ID:** DB-006
**Title:** Rating aggregate cache recompute races; no DB check on rating range
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Database
**Location:** `src/repositories/rating.repository.ts:97-108`, `:113-130` (`hardDelete` swallows all errors), `:138-152`
**Effort:** S
**Blast radius:** Module

**Evidence:** Aggregate (`avg`, `count`) read then `UPDATE cocktails SET avg_rating=…, rating_count=…` in a READ COMMITTED transaction.

**Problem:** Two users rating the same cocktail concurrently can store a stale aggregate. Rating range (1–5) enforced only in the service.

**Impact:** Incorrect `avgRating`/`ratingCount` (used for sorting and "best rated") until the next rating.

**Trigger conditions:** Concurrent ratings on the same cocktail.

**Root cause:** Two-statement aggregate maintenance.

**Recommended remediation:** Single-statement update from a subquery (with `SELECT … FOR UPDATE` on the cocktail row to fully serialize); add `CHECK (rating BETWEEN 1 AND 5)`; let `hardDelete` rethrow non-P2025 errors.

**Corrected implementation:**
```sql
UPDATE cocktails c SET avg_rating = s.avg, rating_count = s.cnt
FROM (SELECT avg(rating)::float AS avg, count(*)::int AS cnt FROM ratings WHERE cocktail_id = $1) s
WHERE c.id = $1;
```

**Regression prevention:** Concurrency test with N parallel ratings asserting `rating_count = N`.

**References:** PostgreSQL `UPDATE … FROM`; CHECK constraints.

---

**ID:** DB-007
**Title:** Missing indexes backed by existing query patterns
**Severity:** P2 — Medium
**Confidence:** High (query patterns confirmed; plans not measured)
**Category:** Database (performance)
**Location:** `prisma/schema.prisma` models `PlannedCollection`, `UserFavoriteCocktail`, `PlannedCollectionCocktail`, `UserPantryItem`, `PlannedCocktail`
**Effort:** S
**Blast radius:** Module

**Evidence / query pattern → index:**
| Model | Query pattern (file) | Proposed index | Expected effect |
|---|---|---|---|
| `PlannedCollection` | list filtered by `userId`, ordered by `plannedFor` (`planned-collection.repository.ts:47-77`); user-delete cascade | `@@index([userId, plannedFor])` | avoids seq scan + sort per user |
| `UserFavoriteCocktail` | `_count.favoritedBy` on every cocktail detail (`cocktail.repository.ts:193-195`); cocktail-delete cascade | `@@index([cocktailId])` | count over ~2M rows → index-only count |
| `PlannedCollectionCocktail` | cocktail-delete cascade | `@@index([cocktailId])` | P3 |
| `UserPantryItem` | ingredient-delete cascade (~1M rows) | `@@index([ingredientId])` | P3 |
| `PlannedCocktail` | admin recent completions `status='done' ORDER BY completedAt DESC` (`admin-stats.repository.ts:134-144`) | `@@index([status, completedAt])` | P3 |

**Problem / Impact:** Sequential scans on large tables per page view (favorites count) and on deletes.

**Trigger conditions:** Growth beyond ~100k rows.

**Root cause:** Indexes added reactively; FK columns on the "many" side not indexed (PostgreSQL does not auto-index FKs).

**Recommended remediation:** Add the indexes via migrations using `CREATE INDEX CONCURRENTLY` (hand-edited migration, one index per migration, outside a transaction). Balance against DB-015 (drop redundant ones to offset write cost).

**Corrected implementation:**
```sql
-- prisma/migrations/2026xxxx_fav_cocktail_idx/migration.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_favorite_cocktails_cocktail_id_idx" ON "user_favorite_cocktails"("cocktail_id");
```

**Regression prevention:** CI check with a seeded DB running `EXPLAIN` on the hot queries (e.g. via `pg_stat_statements` review), or a schema lint rule "every FK column has an index".

**References:** PostgreSQL docs "Indexes on foreign keys"; `CREATE INDEX CONCURRENTLY`; Prisma "Customizing migrations".

---

**ID:** DB-008
**Title:** Integrity gaps in multi-step writes: RSVP duplicates, `moveToPantry` lost updates, `createWithCocktails` partial writes
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Database (integrity)
**Location:** `src/repositories/planned-collection.repository.ts:90-123` (`createWithCocktails`, no tx), `:172-214` (RSVP find-then-create, unbounded `rsvps` load); `src/services/pantry.service.ts:167-215` (`moveToPantry`); `src/services/planned-collection.service.ts:178-191` (`addRsvp` loads full collection)
**Effort:** M
**Blast radius:** Module

**Evidence:** RSVP: `findFirst({ collectionId, userId })` then `create`/`update` with no unique constraint; `createWithCocktails`: `create` → `createMany` → re-fetch, separate statements.

**Problem / Impact:** Duplicate RSVPs on concurrent submits; a failed second step leaves an empty collection; concurrent move-to-pantry loses quantity updates; RSVP view loads all cocktails/ingredients and all RSVPs to read an id.

**Trigger conditions:** Concurrent requests; transient DB errors.

**Root cause:** Missing transactions and unique constraints.

**Recommended remediation:** `@@unique([collectionId, userId])` on RSVPs + `upsert` (NULL userIds remain distinct for guests; add a per-token guest cap); wrap `createWithCocktails` in `$transaction` using nested `create`; use `increment` or the same Serializable+retry path for `moveToPantry`; `select` only needed fields for RSVP views and `take` on `rsvps`.

**Corrected implementation:**
```ts
prisma.plannedCollection.create({ data: { …, cocktails: { createMany: { data: cocktailIds.map((cocktailId, i) => ({ cocktailId, position: i })) } } } })
```

**Regression prevention:** Concurrency tests for RSVP and move-to-pantry; failure-injection test for collection creation.

**References:** Prisma nested writes (atomic).

---

**ID:** DB-009
**Title:** Migrations through a transaction-mode pooler, no `directUrl`, default pool size; migrations + seed run on every container start
**Severity:** P2 — Medium
**Confidence:** High (config read; production URL not verified)
**Category:** Database / Reliability
**Location:** `prisma/schema.prisma:5-8` (datasource without `directUrl`); `.env.example` (`DATABASE_URL` points at a Supabase pooler on port 6543 with `pgbouncer=true`); `scripts/deploy.sh:5` (`npx prisma@6.19.0 migrate deploy` + seed on every boot); `Dockerfile:87`
**Effort:** S
**Blast radius:** Infrastructure

**Evidence:**
```sh
npx prisma@6.19.0 migrate deploy     # downloads Prisma CLI from the registry at container start; client is 6.19.3
node dist/prisma/seeder/seed_light.js
exec node server.js
```

**Problem:** (1) `migrate deploy` through PgBouncer transaction mode is unsupported (advisory locks/DDL); Prisma requires `directUrl` for migrations. (2) Every replica start runs migrations and the seed concurrently (advisory lock serializes migrations, but the seed is unsynchronized); a slow/failed migration blocks startup and health. (3) `npx prisma@6.19.0` fetches a package at runtime (supply chain + registry dependency at boot, and version skew vs 6.19.3). (4) Fan-out `Promise.all` (admin dashboard ~16 queries; smart collections N×5) risks P2024 pool timeouts with the default pool (`num_cpus*2+1`).

**Impact:** Failed or hung deploys, inconsistent seed data, boot-time network dependency.

**Trigger conditions:** Every deployment; scaling out.

**Root cause:** Migration step embedded in the application entrypoint.

**Recommended remediation:** Add `directUrl = env("DIRECT_URL")`; run `prisma migrate deploy` as a separate one-off release job (CI/CD or Coolify pre-deploy) using the pinned local CLI (`node_modules/.bin/prisma`), with expand/contract migrations; make the seed idempotent and run it only on demand; set `connection_limit`/`pool_timeout` explicitly in `DATABASE_URL`.

**Corrected implementation:**
```prisma
datasource db { provider = "postgresql"  url = env("DATABASE_URL")  directUrl = env("DIRECT_URL") }
```

**Regression prevention:** Deployment runbook; CI job that runs `prisma migrate diff --exit-code` against a shadow DB.

**References:** Prisma docs "Configure Prisma Client with PgBouncer" (`directUrl`), "Deploying database changes with Prisma Migrate", "Connection pool".

---

**ID:** DB-010
**Title:** Makeable cache invalidation scans the entire Redis keyspace; unbounded key cardinality; missing invalidations
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Database (cache)
**Location:** `src/lib/cache/makeable-cache.ts:38-49` (`SCAN … COUNT 20` per pantry write); `src/app/api/cocktails/best-rated-makeable/route.ts:7` (`Math.min(Number(q), 10)` accepts NaN/negatives/fractions); `src/lib/derivations/derivation-cache.ts` (`invalidateDerivationCache` never called)
**Effort:** S
**Blast radius:** Module

**Evidence:** Each pantry write iterates the whole keyspace in batches of 20; cocktail create/update/delete and derivation edits don't invalidate.

**Problem / Impact:** At 100k users the SCAN costs thousands of round trips per write; stale makeable results up to 30 min after catalog changes; cache pollution from arbitrary `maxMissing` values. Per-user keys prevent cross-user leakage (verified).

**Trigger conditions:** Any pantry write; catalog edits.

**Root cause:** Key layout not designed for targeted invalidation.

**Recommended remediation:** Store one hash per user (`makeable:{userId}` with field = maxMissing) and `DEL` it; clamp `maxMissing` to integer 0–10; bump a global catalog version key on cocktail/derivation changes and include it in the cache key; call `invalidateDerivationCache()` from admin edits.

**Corrected implementation:** `await redis.del(\`makeable:${userId}\`)`; `const v = Number.isInteger(n) ? Math.min(Math.max(n, 0), 10) : 0`.

**Regression prevention:** Unit tests for key building and clamping.

**References:** Redis `SCAN` complexity docs.

---

**ID:** DB-011
**Title:** Unbounded per-user loads and in-memory aggregation in server-local timezone
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Database (performance/correctness)
**Location:** `src/repositories/cocktail-made-log.repository.ts:126-141` (`findAllByUserForStats`, no `take`); `src/services/user-stats.service.ts:102-105` (plus redundant `findByUserSince`); recommendations (`findCocktailIdsByUser` ×2, `findHighRatedCocktailIdsByUser`); `favorite.findAllByUser`; `admin-stats.repository.ts:66` (all cocktails for technique distribution); `src/utils/mail.ts` (`plannedFor.getHours()`)
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Heavy users load all logs per stats view; streaks/trends computed with the server's timezone (timestamps are `TIMESTAMP(3)` without time zone) are wrong for users elsewhere; invite emails show server-local times.

**Trigger conditions:** Power users; non-server timezones.

**Root cause:** Aggregation in JS; no user timezone stored.

**Recommended remediation:** `groupBy`/SQL aggregates with `date_trunc(... AT TIME ZONE $tz)`; store user timezone (from the browser) and pass it; dedupe repeated id loads within a request.

**Corrected implementation:** `prisma.cocktailMadeLog.groupBy({ by: ['cocktailId'], where: { userId }, _count: true, orderBy: { _count: { cocktailId: 'desc' } }, take: 5 })`.

**Regression prevention:** Unit tests for streak computation across DST/timezone boundaries.

**References:** PostgreSQL `AT TIME ZONE`.

---

**ID:** DB-012
**Title:** N+1 write loops in bulk pantry add and collection completion
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Database (performance)
**Location:** `src/services/pantry.service.ts:237-269` (`addItemsBulk` → per-item Serializable `upsert`, cache invalidated twice); `src/services/planned-collection.service.ts:60-91` (`decrementForCocktail` per cocktail, each reloading all pantry rows + derivation map)
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** A 40-item demo-bar import = 40 transactions × 2-4 queries; a 10-cocktail collection completion reloads the pantry 10 times. Latency in the hundreds of ms to seconds (estimate).

**Trigger conditions:** Bulk operations.

**Root cause:** Single-item primitives reused in loops.

**Recommended remediation:** Batch: load pantry once, compute all changes, apply with one transaction (`createMany({ skipDuplicates })` + per-row atomic updates); invalidate cache once.

**Corrected implementation:** `decrementForCocktails(tx, userId, [{cocktailId, servings}, …])`.

**Regression prevention:** Query-count assertion in tests (Prisma `$on('query')` counter).

**References:** Prisma "Bulk operations".

---

**ID:** DB-013
**Title:** Data-type and constraint weaknesses (Float quantities, no CHECKs, timestamp without time zone, case-sensitive email, untyped strings)
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Database (schema)
**Location:** `prisma/schema.prisma` — `Float` for `quantity`, `shoppingQuantity`, `amount`, `yield`; all `DateTime` default `timestamp(3)`; `User.email @unique` (case-sensitive); `Device.platform String`; `Suggestion.targetId` polymorphic without FK; `RefreshToken.deviceId` no FK; `CocktailIngredient.subUnit/subAmount/subShow` parallel arrays with camelCase column names (not `@map`ped)
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Rounding drift compensated with `toFixed` (`pantry.repository.ts:18-21`); negative quantities possible; duplicate accounts by email case (SEC-018); ambiguous instants around DST; inconsistent naming.

**Trigger conditions:** Ongoing.

**Root cause:** Prisma defaults accepted without review.

**Recommended remediation:** `Decimal @db.Decimal(10,3)` (or integer ml); `CHECK (quantity >= 0)`; `@db.Timestamptz(3)` for new columns (migrate existing with `ALTER … TYPE timestamptz USING … AT TIME ZONE 'UTC'`, which rewrites the table: schedule it); `citext` or unique index on `lower(email)`; enums for `platform`; normalize substitutes into a join table.

**Corrected implementation:** `quantity Decimal @db.Decimal(10, 3)`; `email String @unique @db.Citext` (requires `citext` extension).

**Regression prevention:** Schema review checklist; DB tests for constraint violations.

**References:** PostgreSQL "Don't Do This" wiki (timestamp without time zone, money/float); Prisma native types.

---

**ID:** DB-014
**Title:** Migration practices: destructive changes, blocking index builds, possible drift
**Severity:** P3 — Low
**Confidence:** Confirmed (practices) / Medium (drift)
**Category:** Database (operations)
**Location:** `prisma/migrations/20260409000001_*` (deletes duplicate pantry rows instead of merging quantities), `20260406095840_*` (enum value removal), several `DROP COLUMN/TABLE` migrations, `20260514130000_*` and `20260520102000_*` (index creation without `CONCURRENTLY`), `20260520090000_*` (full-table backfill + FK re-add without `NOT VALID`), `20260512131542_*` (inline `UNIQUE` constraint vs Prisma's unique index; `IF NOT EXISTS` hints at out-of-band DDL)
**Effort:** S (process)
**Blast radius:** Infrastructure

**Problem / Impact:** Already applied, but the same patterns on a large production table will lock writes or lose data.

**Trigger conditions:** Future migrations on large tables.

**Root cause:** No migration review guidelines.

**Recommended remediation:** Adopt expand/contract; `CONCURRENTLY` for indexes; `NOT VALID` + `VALIDATE CONSTRAINT` for FKs/CHECKs; backfills in batches; run `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url $SHADOW --exit-code` in CI to detect drift; take a backup before each deploy.

**Corrected implementation:** n/a (process).

**Regression prevention:** CI drift check; `squawk` (Postgres migration linter) on `prisma/migrations/**/migration.sql`.

**References:** Prisma "Troubleshooting migrations / drift"; PostgreSQL `ALTER TABLE … NOT VALID`.

---

**ID:** DB-015
**Title:** Redundant indexes increase write amplification on hot tables
**Severity:** P4 — Informational
**Confidence:** Confirmed
**Category:** Database
**Location:** `prisma/schema.prisma`: `refresh_tokens(hashed_token)` & `mobile_oauth_exchange_codes(hashed_code)` duplicate their `@unique`; `planned_collections(share_token)` duplicates unique; `user_pantry_items(user_id)` and `(user_id, is_in_pantry)` are prefixes of other indexes; `planned_cocktails(user_id)` prefix of unique `(user_id, cocktail_id)`; `ratings(cocktail_id)`, `ingredients(type_id)`, `cocktail_made_logs(user_id)` are left prefixes of composites; low-selectivity `planned_cocktails(status)`, `suggestions(status)`
**Effort:** S
**Blast radius:** Module

**Problem / Impact:** Extra write cost and storage on the hottest tables (pantry, made-logs).

**Recommended remediation:** Drop after confirming with `pg_stat_user_indexes.idx_scan` in production (`DROP INDEX CONCURRENTLY`).

**Corrected implementation / Regression prevention:** Periodic unused-index review.

**References:** PostgreSQL `pg_stat_user_indexes`.

---

**ID:** DB-016
**Title:** Token tables never purged; dead `MobileOAuthExchangeCode` table
**Severity:** P4 — Informational
**Confidence:** Confirmed
**Category:** Database
**Location:** `refresh_tokens`, `verification_tokens` (expired rows remain until the same identifier requests a new token); `MobileOAuthExchangeCode` model (no references in `src`)
**Effort:** XS
**Blast radius:** Module

**Problem / Impact:** Unbounded table growth; dead schema surface.

**Recommended remediation:** Scheduled purge job (`DELETE … WHERE expires_at < now() - interval '7 days'`); drop the unused table in a contract migration.

**References:** —

### C.3 Backend performance

---

**ID:** BPERF-001
**Title:** Heavy per-request computations without caching or concurrency limits
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Backend performance
**Location:** `src/services/recommendation.service.ts:28-34` (calls uncached `getMakeable`); `src/services/smart-collection.service.ts:80-84` (up to 5 queries × N themes concurrently, `ORDER BY RANDOM()` at `:180-185`); `src/services/admin-stats.service.ts` (~16 parallel queries); `src/app/sitemap.ts` (all cocktails + ingredients per request, no revalidate)
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Expensive endpoints scale linearly with traffic and catalogue; parallel fan-outs exhaust the default Prisma pool (P2024) under load.

**Recommended remediation:** Cache recommendations and smart collections (per user / global with short TTL); limit fan-out concurrency (e.g. `p-limit` 4); `export const revalidate = 3600` on `sitemap.ts`; precompute random sampling via `TABLESAMPLE` or random offset.

**Regression prevention:** Load test (k6) on recommendations and smart collections before launch.

**References:** Next.js `revalidate` route segment config.

---

**ID:** BPERF-002
**Title:** No timeouts on outbound HTTP calls (Turnstile, Google JWKS, OpenFoodFacts, Resend, Cloudinary)
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Backend performance / Reliability
**Location:** `src/utils/turnstile.ts:53`; `src/app/api/auth/mobile/oauth/google/utils.ts` (`fetchGoogleJwks`); `src/services/barcode.service.ts` (OpenFoodFacts); `src/utils/mail.ts` (Resend SDK); `src/app/api/upload/route.ts` (Cloudinary). Only the OG font fetch uses `AbortSignal.timeout`.
**Effort:** S
**Blast radius:** Application

**Problem / Impact:** A slow third party holds Node request slots and DB-independent latency grows unbounded; sign-in/registration hang when Cloudflare or Google is degraded; registration fails *after* the user row is created if Resend fails (no retry/outbox).

**Recommended remediation:** Shared `fetchWithTimeout` (2–5 s) for all outbound calls; send mail via an outbox table + retry worker or at least catch and allow "resend verification".

**Corrected implementation:** `fetch(url, { …, signal: AbortSignal.timeout(3000) })`.

**Regression prevention:** Unit tests with a never-resolving fetch mock asserting timeout handling.

**References:** MDN `AbortSignal.timeout()`.

---

**ID:** BPERF-003
**Title:** Upload route buffers the entire multipart body before size validation
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Backend performance
**Location:** `src/app/api/upload/route.ts`
**Effort:** XS
**Blast radius:** Component

**Problem / Impact:** Large bodies are fully read into memory (20 uploads/hour/user limit applies only after auth).

**Recommended remediation:** Reject on `Content-Length` > limit before `req.formData()`; configure the reverse proxy body limit.

**References:** —

---

**ID:** BPERF-004
**Title:** Landing QR SVG and OG images regenerated per request
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Backend performance
**Location:** `src/components/home/landing/LandingPage.tsx:12` (`qrcode` per render); `src/app/(home)/bar/og/route.tsx` (no `Cache-Control` on the image response)
**Effort:** XS
**Blast radius:** Component

**Problem / Impact:** Avoidable CPU on the most visited page and on social-crawler traffic.

**Recommended remediation:** Memoize the QR at module scope; return `Cache-Control: public, max-age=86400, s-maxage=86400, immutable` from the OG route.

**References:** Next.js `ImageResponse` docs.

### C.4 Accessibility (WCAG 2.2 AA)

Static code review only. **No compliance claim is made**; a manual keyboard + screen reader (NVDA/VoiceOver/TalkBack) + zoom pass is required (list in section F). Already correct: `<html lang="en">`, no positive `tabIndex`, Radix-based `Dialog`/`Sheet`/`DropdownMenu`, data-table pagination labels, `aria-pressed` on BottleToggle and CocktailCard favorite, `aria-live` on cocktail/ingredient result counts, decorative `alt=""` images.

---

**ID:** A11Y-001
**Title:** Interactive star rating is mouse-only and has no accessible name/role/state
**Severity:** P1 — High
**Confidence:** High
**Category:** Accessibility — WCAG 2.1.1 Keyboard, 4.1.2 Name, Role, Value, 2.5.8 Target Size (Minimum)
**Location:** `src/components/StarRating.tsx:38-54`; used by `src/app/(home)/cocktails/[id]/page.tsx:296`, `src/components/home/cocktails/CocktailHero.tsx:98`
**Effort:** S
**Blast radius:** Component (all rating UIs)

**Evidence:** `<Star … onMouseEnter={…} onClick={() => { … onChange(starValue …) }} />` — bare SVGs, 18 px, `gap-0.5`.

**Problem:** Not focusable, no role, no name, no checked state; target < 24 px.

**Impact:** Keyboard and screen-reader users cannot rate cocktails.

**Trigger conditions:** Always.

**Root cause:** Icon used as control.

**Recommended remediation / Corrected implementation:**
```tsx
<div role="radiogroup" aria-label="Your rating">
  {[1,2,3,4,5].map(n => (
    <button key={n} type="button" role="radio" aria-checked={value === n}
      aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-1"
      onClick={() => onChange?.(n === value ? 0 : n)}>
      <Star aria-hidden size={size} … />
    </button>))}
</div>
// display-only: <div role="img" aria-label={`Rated ${avg.toFixed(1)} out of 5`}>…</div>
```
(arrow-key roving focus per WAI-ARIA radio group pattern).

**Regression prevention:** Testing Library test `getByRole('radio', { name: '4 stars' })` + keyboard; axe in Playwright.

**References:** WCAG 2.2 SC 2.1.1, 4.1.2, 2.5.8; WAI-ARIA APG Radio Group.

---

**ID:** A11Y-002
**Title:** 14 hand-rolled modals/drawers lack dialog semantics, focus management and Escape
**Severity:** P1 — High
**Confidence:** High
**Category:** Accessibility — 2.1.2 No Keyboard Trap (inverse: focus escapes), 2.4.3 Focus Order, 4.1.2, 1.3.1
**Location:** `ui/ConfirmDialog.tsx:37`, `home/cocktails/MakeCocktailDialog.tsx:45`, `home/cocktails/MobileFilterSheet.tsx:95`, `home/ingredients/FilterBanner.tsx:215`, `home/pantry/dialog/EditPantryItemDialog.tsx:142`, `home/pantry/dialog/MoveToPantryDialog.tsx:76`, `home/pantry/PantryFilterBar.tsx:227`, `home/pantry/PantrySidebar.tsx:76`, `home/planned-cocktails/card/CollectionDetailsModal.tsx:141`, `…/card/ShareCollectionModal.tsx:174`, `…/dialog/PlanCocktailDialog.tsx:54`, `…/dialog/RescheduleCollectionDialog.tsx:38`, `…/dialog/RescheduleDialog.tsx:58`, `…/view/PlannerCalendarView.tsx:597` (all under `src/components/`)
**Effort:** M
**Blast radius:** Application

**Evidence:** Fixed-position `<div>` overlays without `role="dialog"`, `aria-modal`, `aria-labelledby`; no focus move/trap/restore; Escape handled only in PlannerCalendarView.

**Problem / Impact:** Keyboard focus moves behind the modal; screen readers don't announce a dialog; destructive confirmations can't be dismissed with Escape.

**Trigger conditions:** Opening any of these modals.

**Root cause:** Radix primitives exist (`ui/dialog.tsx`, `ui/sheet.tsx`) but weren't used.

**Recommended remediation:** Migrate to `Dialog`/`Sheet`; `ConfirmDialog` → Radix `AlertDialog` with initial focus on Cancel.

**Corrected implementation:**
```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>{title}</AlertDialogTitle>
    <AlertDialogDescription>{message}</AlertDialogDescription>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

**Regression prevention:** ESLint `no-restricted-syntax` for `fixed inset-0` overlays outside `ui/`; Playwright keyboard test (Tab stays inside, Escape closes, focus returns).

**References:** WCAG 2.4.3, 4.1.2; WAI-ARIA APG Dialog (Modal) pattern.

---

**ID:** A11Y-003
**Title:** Toasts auto-dismiss after 1 second and are the only error feedback in several flows
**Severity:** P1 — High
**Confidence:** High
**Category:** Accessibility — 2.2.1 Timing Adjustable, 3.3.1 Error Identification, 4.1.3 Status Messages
**Location:** `src/components/ui/sonner.tsx:13` (`duration={1000}`, ~153 `toast.*` call sites); toast-only errors e.g. `src/app/invite/[token]/RsvpForm.tsx:63`, `src/components/home/cocktails/MakeCocktailDialog.tsx:38`
**Effort:** XS
**Blast radius:** Application

**Problem / Impact:** Users with low vision, cognitive disabilities or screen readers can't read or hear messages in 1 s; failures go unnoticed.

**Recommended remediation / Corrected implementation:** `<Toaster duration={6000} … />`, `toast.error(msg, { duration: Infinity })` with a close button; render form errors inline (`role="alert"`).

**Regression prevention:** Unit test asserting Toaster default duration ≥ 5000.

**References:** WCAG 2.2.1, 3.3.1, 4.1.3; Sonner docs.

---

**ID:** A11Y-004
**Title:** Signup avatar file input is unreachable by keyboard
**Severity:** P1 — High
**Confidence:** High
**Category:** Accessibility — 2.1.1, 4.1.2
**Location:** `src/app/(auth)/signup/page.tsx:136-155`
**Effort:** XS
**Blast radius:** Component

**Evidence:** `<label><img …/><input type="file" className="hidden" …/></label>` — `display:none` removes it from the tab order; label has no text.

**Problem / Impact:** Keyboard users cannot add a profile photo (optional field, but it's part of the auth flow).

**Recommended remediation / Corrected implementation:** `className="sr-only"` + `aria-label="Upload profile photo (optional)"`; `has-[:focus-visible]:ring-2` on the label.

**Regression prevention:** Playwright: Tab reaches the file input.

**References:** WCAG 2.1.1.

---

**ID:** A11Y-005
**Title:** Form controls without programmatically associated labels (~70 controls)
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, 4.1.2
**Location:** `(auth)/signin/page.tsx:115,130`; `(auth)/signup/page.tsx:160-215`; `(auth)/request-reset-password/page.tsx:66`; `(auth)/reset-password/page.tsx:71,89`; `invite/[token]/RsvpForm.tsx:83-155`; `components/user/ChangePasswordSection.tsx:51-62`; `EditProfileSection.tsx:48,62`; `DangerZone.tsx:59,73`; `AddPantryItemDialog.tsx:313,327,342,402`; `EditPantryItemDialog.tsx:169,185,202,266`; `MoveToPantryDialog.tsx:108,124`; `CreatePlannedCollectionDialog.tsx:186-418`; `PlanCocktailDialog.tsx:82`; `RescheduleDialog.tsx:92`; `RescheduleCollectionDialog.tsx:63`; `SuggestionDialog.tsx:143,163`; `MakeCocktailDialog.tsx` (servings); placeholder-only search inputs: `CocktailFilterBar.tsx:126`, `FilterBanner.tsx:130,240`, `PantryFilterBar.tsx:81,232`, `MobileTopSearchBar.tsx:37`, `MobileFilterSheet.tsx:121`, `CollectionDetailsModal.tsx:225`, `data-table/data-table.tsx:147`, `admin/suggestions/view/[id]/page.tsx:153`; admin `IngredientRepeater.tsx:108-183`, `BaseIngredientInput.tsx:51-107`, `data-table-pagination.tsx:29`
**Effort:** M
**Blast radius:** Application

**Evidence:** `<label className=…>Email</label><input name="email" …/>` with no `htmlFor`/`id` (and not nested).

**Problem / Impact:** Screen readers announce unnamed "edit text"; clicking labels doesn't focus inputs; voice control can't target fields.

**Recommended remediation / Corrected implementation:**
```tsx
const id = useId()
<label htmlFor={id}>Email</label><input id={id} name="email" autoComplete="email" />
// search: <input type="search" aria-label="Search cocktails" … />
// repeated rows: aria-label={`Quantity for ${ingredientName}`}
```

**Regression prevention:** `eslint-plugin-jsx-a11y` (`label-has-associated-control`, `control-has-associated-label`); axe in Playwright.

**References:** WCAG 1.3.1, 3.3.2, 4.1.2.

---

**ID:** A11Y-006
**Title:** shadcn `FormControl` wraps a `<div>`, so label/description/error IDs land on the wrong element
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 1.3.1, 3.3.1, 4.1.2
**Location:** `src/components/crud/fields/MultiSelectField.tsx:60-61`, `TagsField.tsx:46-47`, `FileField.tsx:31-32`
**Effort:** S
**Blast radius:** Module (admin CRUD)

**Problem / Impact:** `FormLabel htmlFor`, `aria-describedby`, `aria-invalid` target the `div`; the actual input is unlabeled and errors aren't announced.

**Recommended remediation:** Place `<FormControl>` directly around the focusable input, or spread `useFormField()` ids manually.

**Corrected implementation:** `<FormControl><Input … /></FormControl>` with chips rendered outside the slot.

**Regression prevention:** Component test `getByLabelText('Tags')` resolves to the input.

**References:** shadcn/ui Form docs; WCAG 1.3.1.

---

**ID:** A11Y-007
**Title:** Errors in hand-rolled forms are neither announced nor linked to fields
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 3.3.1 Error Identification, 4.1.3 Status Messages, 3.3.3 Error Suggestion
**Location:** `(auth)/signin/page.tsx:177-187`, `(auth)/signup/page.tsx:275`, `components/user/ChangePasswordSection.tsx:76-80`, `components/user/DangerZone.tsx`, `components/BaseIngredientInput.tsx:122`
**Effort:** S
**Blast radius:** Module (auth, account)

**Problem / Impact:** No `role="alert"`, `aria-invalid`, `aria-describedby`; screen-reader users don't learn that sign-in failed.

**Corrected implementation:** `<p id="signin-error" role="alert">{error}</p>` + `aria-invalid={!!error} aria-describedby="signin-error"` on the relevant inputs.

**Regression prevention:** Testing Library `getByRole('alert')` after failed submit.

**References:** WCAG 3.3.1, 4.1.3.

---

**ID:** A11Y-008
**Title:** Icon-only buttons/links without accessible names (20 locations)
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 4.1.2, 2.4.4 Link Purpose, 1.1.1
**Location:** `src/app/pantry/page.tsx:152`, `src/app/pantry/PantryClientView.tsx:143`, `components/crud/fields/FileField.tsx:36`, `MultiSelectField.tsx:102`, `TagsField.tsx:57`, `TypeSubTypeSelector.tsx:198`, `home/cocktails/MakeCocktailDialog.tsx:51,74,86`, `home/cocktails/MobileFilterSheet.tsx:128`, `home/MobileTopSearchBar.tsx:44`, `home/pantry/dialog/MoveToPantryDialog.tsx:82`, `home/planned-cocktails/dialog/PlanCocktailDialog.tsx:60,98,110`, `home/planned-cocktails/view/MyRsvpsSection.tsx:64` (external link), `IngredientRepeater.tsx:139,193`
**Effort:** S
**Blast radius:** Application

**Corrected implementation:** `<button aria-label="Close"><X aria-hidden /></button>`, `aria-label={`Remove ${tag}`}`, `<a … aria-label="Open invite in a new tab">`.

**Regression prevention:** jsx-a11y `control-has-associated-label`; axe `button-name`, `link-name`.

**References:** WCAG 4.1.2, 2.4.4.

---

**ID:** A11Y-009
**Title:** Toggle/selection state conveyed only visually
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 4.1.2, 1.4.1
**Location:** `components/home/cocktails/FilterChipPanel.tsx:42,56,70,84,102`; `app/invite/[token]/RsvpForm.tsx:102-113` (Yes/Maybe/No); `components/home/planned-cocktails/view/PlannerCalendarView.tsx:380` (month/week)
**Effort:** XS
**Blast radius:** Module

**Corrected implementation:** `aria-pressed={active}` on filter chips/view toggles; RSVP as `role="radiogroup"` + `role="radio" aria-checked`.

**Regression prevention:** Component tests on `aria-pressed`.

**References:** WCAG 4.1.2; APG Button (toggle).

---

**ID:** A11Y-010
**Title:** Makeable status distinguished only by dot color
**Severity:** P2 — Medium
**Confidence:** Medium-High
**Category:** Accessibility — 1.4.1 Use of Color, 1.4.11 Non-text Contrast
**Location:** `src/components/home/cocktails/CocktailCard.tsx:11-15,69`; planner legend `PlannerCalendarView.tsx:~590` (verify manually)
**Effort:** XS
**Blast radius:** Component

**Evidence:** "full", "withSubstitutes", "withDerivates" all render "MAKEABLE"; only the dot color differs (dots measure ~1.7–2.3:1 on light surfaces).

**Corrected implementation:** Distinct text: "Makeable", "Makeable · substitute", "Makeable · derivative"; or an icon + sr-only text.

**References:** WCAG 1.4.1.

---

**ID:** A11Y-011
**Title:** Text and focus-ring color pairs that fail contrast and are not covered by the contrast test
**Severity:** P2 — Medium
**Confidence:** High (computed from `src/styles/tokens.css`, light theme)
**Category:** Accessibility — 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast
**Location:** `src/styles/contrast-pairs.ts` / `tests/unit/design/contrast.test.ts` (coverage gap); usages: `text-brand-soft-strong` as small text (72 uses, e.g. `PantryTableRow.tsx:181,189`, `PantrySidebar.tsx:114`) ≈ 3.04–3.20:1; white on brand gradient CTAs (45, incl. Sign in/Sign up/Send RSVP/Update password) 4.13:1 mid / 2.80:1 at `#bc9366` end; `text-brand-soft` 2.66–2.80:1 (`TonightDashboard.tsx:208,381`); opacity variants `text-fg/40` 2.46, `text-fg-secondary/50` 2.49, `text-fg-muted/60` 2.36 (11 uses), `text-fg-muted/70` 2.81 (10 uses, incl. FormDescription), `text-fg/50` 3.25 (policy pages); focus ring `ring-ring/50` ≈ 1.66:1 on canvas
**Effort:** M
**Blast radius:** Application

**Problem / Impact:** Low-vision users can't read secondary text, warnings ("Out of stock") or primary CTAs; focus position invisible for many.

**Recommended remediation:** Add the actually used pairs to `CONTRAST_PAIRS` (including composited opacity variants); ban `/40`–`/70` opacity on text tokens via a lint rule (the repo already has `scripts/design/find-raw-colors.ts` — extend it); darken `--brand-gradient-to` (light); use a 3:1 solid focus ring (`ring-ring` not `/50`). Re-verify dark theme.

**Regression prevention:** Extended contrast unit test + axe `color-contrast` in Playwright for both themes.

**References:** WCAG 1.4.3, 1.4.11.

---

**ID:** A11Y-012
**Title:** Focus indicator removed without replacement
**Severity:** P2 — Medium
**Confidence:** High (Appbar) / Medium (others)
**Category:** Accessibility — 2.4.7 Focus Visible
**Location:** `src/components/layout/Appbar.tsx:120` (avatar menu `focus:outline-none`, name falls back to alt text or a single letter); `PantryFilterBar.tsx:238`, `CreatePlannedCollectionDialog.tsx:384`, `ShareCollectionModal.tsx:211`
**Effort:** XS
**Blast radius:** Component

**Corrected implementation:** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` and `aria-label="Account menu"`.

**References:** WCAG 2.4.7.

---

**ID:** A11Y-013
**Title:** No skip link; nested/duplicate `<main>`; unlabeled navigation; no `aria-current`
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 2.4.1 Bypass Blocks, 1.3.1, 4.1.2
**Location:** `src/app/layout.tsx:121-135` (no skip link); duplicate `<main>`: `(home)/layout.tsx:11` + `cocktails/[id]/page.tsx:221`, `cookie-policy`, `privacy-policy`, `terms-of-use` (`:10`), `ingredients/[id]/page.tsx:63,79`; `pantry/layout.tsx:13` + `PantryClientView.tsx:179` + `pantry/page.tsx:188`; `admin/layout.tsx:55` inside `SidebarInset` (`ui/sidebar.tsx:309` is `<main>`); `(auth)/layout.tsx` has none; `Appbar.tsx:173` mobile bar is a `<div>`, navs unlabeled, no `aria-current` (`:91,248`), "More" toggle lacks `aria-expanded` (`:261`)
**Effort:** S
**Blast radius:** Application

**Corrected implementation:**
```tsx
<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 …">Skip to content</a>
<main id="main" tabIndex={-1}>…</main>
<nav aria-label="Primary">… <Link aria-current={active ? 'page' : undefined}>
```
Change inner `<main>` to `<div>`/`<article>`.

**References:** WCAG 2.4.1, 1.3.1.

---

**ID:** A11Y-014
**Title:** Nested interactive elements (button inside link; buttons inside `role="button"`)
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 4.1.2
**Location:** `src/components/home/cocktails/CocktailCard.tsx:50/76`; `src/components/home/planned-cocktails/card/PlannedCollectionCard.tsx:237` (wraps buttons at `:287-441`)
**Effort:** S
**Blast radius:** Component

**Corrected implementation:** Stretched-link pattern: `<article class="relative"><h3><Link className="after:absolute after:inset-0">…</Link></h3><button className="relative z-10">♥</button></article>`.

**References:** HTML spec (interactive content), WCAG 4.1.2.

---

**ID:** A11Y-015
**Title:** Fixed/sticky bars may obscure focused elements
**Severity:** P3 — Low
**Confidence:** Medium
**Category:** Accessibility — 2.4.11 Focus Not Obscured (Minimum)
**Location:** `Appbar.tsx:76` (fixed ~72 px), `:173`; `cocktails/[id]/page.tsx:729`; sticky `CocktailFilterBar.tsx:122`, `FilterBanner.tsx:126`, `PantryFilterBar.tsx:75`, `MobileTopSearchBar.tsx:33`; no `scroll-padding` in `globals.css`
**Effort:** XS
**Blast radius:** Application

**Corrected implementation:** `html { scroll-padding-top: 136px; scroll-padding-bottom: 180px }` per breakpoint.

**References:** WCAG 2.4.11 (new in 2.2).

---

**ID:** A11Y-016
**Title:** Missing `autocomplete` tokens on password/email/name fields
**Severity:** P3 — Low
**Confidence:** High
**Category:** Accessibility — 1.3.5 Identify Input Purpose (supports 3.3.8 Accessible Authentication)
**Location:** `reset-password/page.tsx:74,92`, `ChangePasswordSection.tsx:55`, `DangerZone.tsx:73`, `request-reset-password/page.tsx:69`, `RsvpForm.tsx:87,137`, `EditProfileSection.tsx:48`
**Effort:** XS
**Blast radius:** Module

**Corrected implementation:** `autoComplete="new-password"` / `"current-password"` / `"email"` / `"name"`. (No paste blocking found — good.)

**References:** WCAG 1.3.5, 3.3.8.

---

**ID:** A11Y-017
**Title:** Charts lack text alternatives
**Severity:** P3 — Low
**Confidence:** Medium
**Category:** Accessibility — 1.1.1 Non-text Content
**Location:** `src/components/charts/AdminDashboardCharts.tsx:99-250`; `src/components/charts/StatsActivityCharts.tsx:28`
**Effort:** S
**Blast radius:** Component

**Corrected implementation:** Wrap with `<figure>` + `<figcaption>` summary, or an sr-only `<table>` of the series next to each chart.

**References:** WCAG 1.1.1.

---

**ID:** A11Y-018
**Title:** Admin pages have no `<h1>`; ConfirmDialog heading is `<h3>`
**Severity:** P3 — Low
**Confidence:** High
**Category:** Accessibility — 1.3.1, 2.4.6 Headings and Labels
**Location:** all `src/app/admin/**` pages (`data-table.tsx:132` uses `<h2>`; `GenericForm`/`GenericView` `CardTitle` renders a `div`); `ui/ConfirmDialog.tsx`
**Effort:** XS
**Blast radius:** Module

**Corrected implementation:** Page title as `<h1>`; `CardTitle asChild` with `<h1>` where it is the page title.

**References:** WCAG 1.3.1, 2.4.6.

---

**ID:** A11Y-019
**Title:** Loading states are silent to assistive technology
**Severity:** P3 — Low
**Confidence:** High
**Category:** Accessibility — 4.1.3 Status Messages
**Location:** `src/components/ui/Loader.tsx`; `loading.tsx` skeletons; `data-table.tsx:139` ("Updating…")
**Effort:** XS
**Blast radius:** Application

**Corrected implementation:** `<div role="status" aria-live="polite"><span className="sr-only">Loading…</span>…</div>`.

**References:** WCAG 4.1.3.

---

**ID:** A11Y-020
**Title:** No reduced-motion handling; infinite loader animations
**Severity:** P3 — Low
**Confidence:** High
**Category:** Accessibility — 2.2.2 Pause, Stop, Hide (AA); 2.3.3 Animation from Interactions (AAA, advisory)
**Location:** no `prefers-reduced-motion`/`useReducedMotion` anywhere; `ui/Loader.tsx`, `ui/skeleton.tsx` (infinite `motion` loops); `app/(home)/bar-tools/page.tsx` reveal animations; `hover:scale` CTAs
**Effort:** XS
**Blast radius:** Application

**Corrected implementation:** `<MotionConfig reducedMotion="user">` in the root providers; `motion-reduce:animate-none` on `animate-pulse`/`animate-spin`.

**References:** WCAG 2.2.2; MDN `prefers-reduced-motion`.

---

**ID:** A11Y-021
**Title:** Undersized touch targets
**Severity:** P3 — Low
**Confidence:** High
**Category:** Accessibility — 2.5.8 Target Size (Minimum)
**Location:** chip remove ≈12 px (`MultiSelectField.tsx:102`, `TagsField.tsx:57`); search clear ≈13 px (`MobileTopSearchBar.tsx:44`, `MobileFilterSheet.tsx:128`); 16 px checkbox in `AddIngredientsModal.tsx:176` (see A11Y-023)
**Effort:** XS
**Blast radius:** Component

**Corrected implementation:** `className="p-1.5 min-h-6 min-w-6"`.

**References:** WCAG 2.5.8 (new in 2.2).

---

**ID:** A11Y-022
**Title:** Broken ARIA references and unlabeled comboboxes
**Severity:** P3 — Low
**Confidence:** High
**Category:** Accessibility — 4.1.2, 1.3.1
**Location:** `src/components/LocalIngredientSelect.tsx:46` (`aria-controls="ingredient-list"` → non-existent, duplicated id; `aria-label` hides the selected value); `src/components/crud/fields/TypeSubTypeSelector.tsx:98,152`
**Effort:** XS
**Blast radius:** Component

**Corrected implementation:** `useId()` for list ids; `aria-labelledby={`${labelId} ${valueId}`}`.

**References:** APG Combobox pattern.

---

**ID:** A11Y-023
**Title:** Fake checkbox in AddIngredientsModal
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Accessibility — 4.1.2, 2.5.8
**Location:** `src/components/AddIngredientsModal.tsx:176`
**Effort:** XS
**Blast radius:** Component

**Evidence:** `<button onClick={toggle}><Check …/></button>` (16 px, no name, no state).

**Corrected implementation:** `<Checkbox checked={row.selected} onCheckedChange={…} aria-label={`Select ${g.ingredientName}`} />`.

**References:** WCAG 4.1.2.

---

**ID:** A11Y-024
**Title:** Minor: avatar image without `alt`; French placeholder in English UI
**Severity:** P4 — Informational
**Confidence:** High
**Category:** Accessibility — 1.1.1, 3.1.2 Language of Parts
**Location:** `src/components/user/ProfileHeader.tsx:44` (`<AvatarImage>` no alt → use `alt=""`); `src/components/data-table/data-table-filters.tsx:59` ("Rechercher…"); French server error strings in `auth.service.ts` ("Token invalide ou expire", "Utilisateur introuvable") surface to English users
**Effort:** XS
**Blast radius:** Component

**References:** WCAG 1.1.1, 3.1.2.

### C.5 Frontend performance and React

No production build exists, so **all impact figures are estimates**; no Lighthouse/Web Vitals were measured.

---

**ID:** PERF-001
**Title:** Cocktail and ingredient detail pages are fully client-rendered; LCP image waits for hydration + API round trip; double DB fetch
**Severity:** P1 — High
**Confidence:** Confirmed (code) / Estimate (impact)
**Category:** Frontend performance (LCP, TTFB→LCP, SEO)
**Location:** `src/app/(home)/cocktails/[id]/page.tsx:1` (`'use client'`, 783 lines; `useCocktailQuery` → `/api/cocktails/:id`; hero `priority` at `:244`); `src/app/(home)/cocktails/[id]/layout.tsx:9` (`cocktailService.getById` for metadata); `src/app/(home)/ingredients/[id]/page.tsx:1,105`
**Effort:** L
**Blast radius:** Module (highest-traffic pages)

**Problem:** HTML contains no recipe content; the hero image is discovered only after JS executes and the client fetch completes (`priority` is ineffective); the layout already loaded the same cocktail on the server for metadata, so each view costs two DB reads.

**Impact (estimate):** LCP +0.8–2 s on mid-range mobile; weaker indexing of recipe content; higher DB load.

**Recommended remediation:** Server Component page that calls the service (wrapped in React `cache()` shared with `generateMetadata`), renders hero + recipe server-side, and mounts small client islands (rating, plan, make, unit picker, wake lock); optionally hydrate TanStack Query via `HydrationBoundary`.

**Corrected implementation:**
```tsx
// cocktails/[id]/page.tsx (server)
const getCocktail = cache((id: string) => cocktailService.getById(id))
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const cocktail = await getCocktail((await params).id)
  return (<><CocktailHeroServer cocktail={cocktail} /><RecipeServer cocktail={cocktail} /><CocktailActions id={cocktail.id} /></>)
}
```

**Regression prevention:** Lighthouse CI budget (LCP < 2.5 s on the detail page); test that the server HTML contains the cocktail name.

**References:** Next.js docs "Server and Client Components", "Fetching data"; web.dev LCP.

---

**ID:** PERF-002
**Title:** Cocktail and ingredient list pages are client-only with a favorites → list request waterfall
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Frontend performance (LCP, INP)
**Location:** `src/app/(home)/cocktails/page.tsx:1,63-125` (5 client queries incl. `useIngredientsQuery({ limit: 300 })` for filter options at `:80`; `effectiveParams` waits for `favoriteIds` at `:101-113`); `src/app/(home)/ingredients/page.tsx:1`
**Effort:** L
**Blast radius:** Module

**Recommended remediation:** Server-render the first page from `searchParams`; keep filters/infinite scroll client-side; load filter options lazily on popover open or from a cached server payload; pass favorites as a server-side filter rather than a client-computed id list.

**Regression prevention:** Lighthouse CI; request-count assertion in Playwright.

**References:** Next.js "Streaming and Suspense".

---

**ID:** PERF-003
**Title:** `SessionProvider` receives no initial session → client `/api/auth/session` fetch and signed-out flicker on every page
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Frontend performance (CLS, request count)
**Location:** `src/components/AuthProvider.tsx:7`; `src/components/layout/Appbar.tsx:39` (+ 11 other `useSession()` callers); guarded layouts already have the session (`guardUser()` in planner/pantry/stats/user layouts)
**Effort:** S
**Blast radius:** Application

**Corrected implementation:** `const session = await getServerSession(options); <AuthProvider session={session}>…` (→ `<SessionProvider session={session}>`), at least in guarded layouts.

**References:** NextAuth v4 `SessionProvider` `session` prop.

---

**ID:** PERF-004
**Title:** `motion` animation library shipped in the shared bundle for loader dots
**Severity:** P2 — Medium
**Confidence:** High (inclusion) / Estimate (size ≈ 30–40 KB gz)
**Category:** Frontend performance (JS size, INP)
**Location:** `src/components/ui/Loader.tsx:3` (imported by 14 files), `src/components/ui/skeleton.tsx`
**Effort:** XS
**Blast radius:** Application

**Corrected implementation:** CSS keyframes (`tw-animate-css` is installed) with `motion-reduce:animate-none`; keep `motion` only in bar-tools cards (dynamic import).

**References:** web.dev "Reduce JavaScript payloads".

---

**ID:** PERF-005
**Title:** Offset reset via `useEffect` fires a wrong-page request on every filter change; JSON.stringify dependency hacks
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Frontend performance / React engineering
**Location:** `src/app/(home)/cocktails/page.tsx:96-125` (`useEffect(() => setOffset(0), [filterKey])`, deps `[JSON.stringify(rawParams), favoriteIds.join(',')]` with `exhaustive-deps` disabled); `src/hooks/use-offset-accumulator.ts:41-46`; `src/hooks/useFilters.ts:11-23` (mirrors `searchParams` into state); `src/app/(home)/ingredients/page.tsx:59`; `src/hooks/mutations/use-rate-mutation.ts:43-75`
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Extra render + extra API call per filter change; two sources of truth for filters; rating mutation fetches stats twice and copies props into state.

**Recommended remediation:** `useInfiniteQuery` keyed by filters (removes manual offsets); derive filters from `useSearchParams()` with `useMemo([searchParams.toString()])`; rating mutation uses `setQueryData` from the response.

**Regression prevention:** Re-enable `react-hooks/exhaustive-deps` as error; test counting fetches per filter change.

**References:** React docs "You Might Not Need an Effect"; TanStack Query `useInfiniteQuery`.

---

**ID:** PERF-006
**Title:** Unused font families preloaded; dead font files in repo
**Severity:** P3 — Low
**Confidence:** High (declaration) / Medium (preload behavior)
**Category:** Frontend performance (LCP)
**Location:** `src/app/layout.tsx:11-24` (`Geist`, `Geist_Mono` instantiated, not applied to `<html>`; Noto Serif 2 weights × 2 styles); `src/app/fonts/*` (≈ 0.6 MB of unreferenced font files)
**Effort:** XS
**Blast radius:** Application

**Corrected implementation:** Remove Geist imports; trim Noto weights to those used; delete `src/app/fonts/`.

**References:** Next.js `next/font` docs.

---

**ID:** PERF-007
**Title:** Over-broad, non-awaited query invalidation
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Frontend performance
**Location:** `src/lib/invalidation.ts:10-14` (ratings → `cocktails.all`), `:51-55` (ingredients → cocktails + makeable); 0 of 35 call sites await invalidation
**Effort:** S
**Blast radius:** Module

**Corrected implementation:** Return `Promise.all([...])` from invalidators and `await` in `onSuccess`; narrow to `detail(id)`/specific lists.

**References:** TanStack Query "Invalidations from Mutations".

---

**ID:** PERF-008
**Title:** Duplicate makeable computations (`maxMissing=3` and `=10` as separate queries)
**Severity:** P3 — Low
**Confidence:** High
**Category:** Frontend performance
**Location:** `src/components/home/dashboard/TonightDashboard.tsx:58`; `src/app/(home)/cocktails/page.tsx:67`
**Effort:** XS
**Blast radius:** Component

**Corrected implementation:** One `maxMissing=10` query + `select` filtering client-side.

**References:** TanStack Query `select`.

---

**ID:** PERF-009
**Title:** Proxy runs on every page request only to forward `x-pathname`
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Frontend performance (TTFB)
**Location:** `src/proxy.ts`; consumer `src/lib/auth/guards.ts:7`
**Effort:** S
**Blast radius:** Application

**Recommended remediation:** Either remove the proxy (build `callbackUrl` client-side on the sign-in page from `document.referrer`/a query param) or reuse the proxy for the CSP nonce (SEC-015), which would justify it.

**References:** Next.js 16 `proxy.ts` docs.

---

**ID:** PERF-010
**Title:** Infinite lists accumulate without virtualization
**Severity:** P4 — Informational
**Confidence:** Medium
**Category:** Frontend performance (INP)
**Location:** `src/hooks/use-offset-accumulator.ts`, cocktail/ingredient grids
**Effort:** S
**Blast radius:** Component

**Recommended remediation:** `content-visibility: auto; contain-intrinsic-size: …` on cards (cheap), or `@tanstack/react-virtual` if lists exceed ~300 items.

**References:** web.dev `content-visibility`.

### C.6 Architecture

---

**ID:** ARCH-001
**Title:** A generic client-driven query DSL (include/filter/sort/limit) is exposed directly on public endpoints
**Severity:** P2 — Medium (architectural root cause of SEC-001/002/017, DB-007 risk, SEC-012)
**Confidence:** Confirmed
**Category:** Architecture
**Location:** `src/lib/query/QueryBuilder.ts`, `src/repositories/base.repository.ts`, `src/utils/parseQueryParams.ts` (any non-reserved query key becomes a filter; arbitrary operator names via `filter[field][op]`), all `*.repository.ts` configs
**Effort:** L
**Blast radius:** Application

**Evidence:** `filters[field] = { ...currentObj, [op]: parseValue(value) }` — operator names come from the client and are passed into Prisma `where` for allowed fields; `include` paths likewise; `limit` up to 500 with `count(*)` on every list.

**Problem:** The Prisma data model *is* the public API contract. Every schema change (new relation, new sensitive column) silently changes what anonymous clients can read; reviewers must reason about all reachable relation graphs to know what an endpoint returns.

**Impact:** Caused the P0 leak; makes authorization review intractable; couples frontend to schema.

**Trigger conditions:** Any schema evolution.

**Root cause:** Over-generalized repository abstraction (YAGNI) chosen for CRUD speed.

**Recommended remediation:** Keep the generic builder for **admin** CRUD only. For public/user endpoints, define explicit request schemas (zod: page, pageSize ≤ 50, enumerated sort keys, enumerated filters with fixed operators) and explicit response DTOs built from `select`. Validate filter operators against an allow-list (`equals`, `in`, `lt`, `gt`, `contains`).

**Corrected implementation:**
```ts
const listCocktailsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['name','avgRating','createdAt']).default('avgRating'),
  glassId: z.string().cuid().optional(), flavors: z.array(z.string()).max(10).optional(),
})
```

**Regression prevention:** Architecture rule (dependency-cruiser) forbidding `QueryBuilder` imports from routes not under `admin`/`withAdmin`.

**References:** OWASP API3:2023; "API is a contract" — avoid exposing ORM query shapes.

---

**ID:** ARCH-002
**Title:** Domain types duplicated and diverged; `packages/shared` effectively unused by web; layering inversions
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Architecture
**Location:** `packages/shared/src/types/*` (9 files) vs `src/types/models/*` (11 files) — e.g. `cocktail.ts` 209 vs 89 lines; web imports shared only in `src/constants/validation-limits.ts:1` (relative path); `src/types/models/cocktail.ts:1` imports from `@/components/IngredientRepeater`; `glass.ts:1` from `@/components/crud/types`; `rating.ts:1-4` redeclares `Cocktail`; `tsconfig.json` excludes `packages` (never type-checked from web)
**Effort:** M
**Blast radius:** Application (web + mobile contracts)

**Problem / Impact:** Web and mobile can disagree on API shapes without a compile error; model types depend on UI components (inverted layering).

**Recommended remediation:** Make `@mixoguide/shared` a workspace dependency (npm workspaces) holding DTOs + zod schemas; generate/derive response types from the server DTO mappers; move UI-only types into components; include the package in type-checking.

**Regression prevention:** dependency-cruiser rule: `src/types/**` must not import `src/components/**`.

**References:** npm workspaces docs.

---

**ID:** ARCH-003
**Title:** Duplicated, drifting auth flows and business logic in route handlers
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Architecture
**Location:** web vs mobile login/register/reset (`src/app/api/auth/**`), two token creators (`src/utils/token.ts` and `AuthService.createEmailToken`), two mail entry points (`src/utils/mail.ts` direct calls vs `src/services/mail.service.ts`), `process.env.NEXT_PUBLIC_BASE_URL` vs `env.NEXT_PUBLIC_BASE_URL` (`mobile/register/route.ts:26`); orchestration inside routes (`planned-collections/[id]/invite/route.ts`, `auth/register/route.ts`)
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Security controls applied to one copy but not the other (captcha SEC-005, normalization SEC-018, revocation SEC-004).

**Recommended remediation:** One `AuthService` with `login({ channel: 'web'|'mobile' })`, `register`, `requestReset`, `resetPassword`, each applying the shared policy; routes become thin adapters.

**References:** —

---

**ID:** ARCH-004
**Title:** Layout shell duplicated across five layouts; `(home)/layout.tsx` needlessly client
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Architecture
**Location:** `src/app/(home)/layout.tsx:1`, `pantry/layout.tsx`, `planner/layout.tsx`, `stats/layout.tsx`, `user/layout.tsx` (AppBar + main + Footer copy-paste; `globals.css` re-imported)
**Effort:** S
**Blast radius:** Module

**Recommended remediation:** Shared server `<AppShell>`; route groups `(app)` with one layout + `guardUser()`.

**References:** Next.js route groups.

---

**ID:** ARCH-005
**Title:** ~25 raw `fetch('/api/…')` calls and `useEffect` data loading bypass the API client and query cache
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Architecture
**Location:** e.g. `src/app/user/page.tsx:18-29`, `src/app/(home)/cocktails/[id]/page.tsx:121-130` (duplicates `usePlannedCocktailExists`), `src/app/admin/suggestions/page.tsx:53`, `…/view/[id]/page.tsx:50`, `MakeCocktailDialog.tsx:26`, `components/user/*Section.tsx`, `use-rate-mutation.ts:58-71`, `useMakeablePreview.ts:35`
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Inconsistent error handling, no abort on unmount, no caching/invalidation.

**Recommended remediation:** Use `src/lib/api/*` + hooks in `src/hooks/queries`; ESLint `no-restricted-globals` for `fetch` in `src/components/**` and `src/app/**/page.tsx`.

**References:** —

### C.7 Code quality

---

**ID:** CQ-001
**Title:** Dead code (11 files) including a 316-line duplicate of the cocktails page
**Severity:** P3 — Low
**Confidence:** Confirmed (zero importers in `src`, `tests`, `e2e`)
**Category:** Code quality
**Location:** `src/app/(home)/cocktails/CocktailsClientView.tsx`, `src/components/team-switcher.tsx`, `nav-projects.tsx`, `BaseIngredientInput.tsx`, `home/cocktails/CocktailDetail.tsx`, `home/cocktails/CocktailIngredients.tsx`, `home/pantry/dialog/MoveToPantryDialog.tsx`, `icons/Availability.tsx`, `icons/Favorite.tsx`, `ui/navigation-menu.tsx`; `src/app/api/auth/login/route.ts` (no in-repo caller; see SEC-005); `MobileOAuthExchangeCode` model; `rotateRefreshToken`; empty `src/shared/*` dirs
**Effort:** S
**Blast radius:** Module

**Recommended remediation:** Delete; add `knip` to CI to detect unused files/exports/deps.

**References:** knip docs.

---

**ID:** CQ-002
**Title:** Type-safety escape hatches hide model/DTO mismatches
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Code quality
**Location:** `as unknown as` in `admin/cocktails/edit/[id]/page.tsx:48`, `admin/ingredients/view/[id]/page.tsx:107`, `admin/ingredient-subtypes/view/[id]/page.tsx:69`, `api/cocktails/[id]/pdf/route.tsx:22`, `crud/GenericForm.tsx:93`, `lib/query/QueryBuilder.ts:93`; non-null `session.user.email!` (`api/user/me/route.ts:25`, `change-password/route.ts:9`), `session!.user!.id` (`invite/[token]/page.tsx:60`); unchecked casts of request bodies (`register/route.ts:21`); tsconfig lacks `noUncheckedIndexedAccess`
**Effort:** M
**Blast radius:** Module

**Recommended remediation:** Server DTO mappers (ARCH-002) remove the need for casts; parse every body with zod; enable `noUncheckedIndexedAccess` incrementally.

**References:** TypeScript handbook (strictness flags).

---

**ID:** CQ-003
**Title:** React hook lint rules downgraded to warnings; 14 `eslint-disable`s; index keys on a removable list
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Code quality
**Location:** `eslint.config.mjs` (`react-hooks/rules-of-hooks: "warn"`, `set-state-in-effect`, `refs`, `purity`, `use-memo` all `warn`); 5 `exhaustive-deps` disables (e.g. `cocktails/page.tsx:112,123`); `crud/fields/TagsField.tsx:52` (`key={index}` with `removeTag(index)`); ESLint run: 0 errors, 4 warnings (unused vars in `PlannedCocktailCard.tsx:13,63`, `PlannedCollectionCard.tsx:250`; `ConfirmDialog.tsx:30` set-state-in-effect)
**Effort:** S
**Blast radius:** Application

**Problem / Impact:** Rules-of-hooks violations are runtime bugs, not style; warnings don't fail CI.

**Recommended remediation:** `rules-of-hooks: "error"`, `exhaustive-deps: "error"`, `--max-warnings=0` in CI; `key={tag}`.

**References:** React docs "Rules of Hooks".

---

**ID:** CQ-004
**Title:** Stale/misleading comments, no-op compatibility shims and dead links
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Code quality
**Location:** `pantry.repository.ts` ("serializable" comment vs READ COMMITTED, DB-001); `auth.service.ts:83-85` (`consumeToken` no-op still called by routes); `src/app/sitemap.ts` and JSON-LD in `src/app/layout.tsx` reference `/makeable` — no such page exists (404 in sitemap); `src/app/error.tsx` says "We've logged the issue" while `reportError` is a no-op in production (REL-003); `.env.example`/README describe MinIO which the app doesn't use
**Effort:** XS
**Blast radius:** Module

**Recommended remediation:** Fix or remove each; remove `/makeable` from sitemap/JSON-LD (SEO: avoids 404s in Search Console).

**References:** —

---

**ID:** CQ-005
**Title:** Effect cleanup races and uncleared timers
**Severity:** P3 — Low
**Confidence:** Medium
**Category:** Code quality (React)
**Location:** `src/hooks/useWakeLock.ts:9-30` (sentinel assigned after unmount is never released); `ShareCollectionModal.tsx:126`, `(auth)/reset-password/page.tsx:42` (`setTimeout` without cleanup → state update/navigation after unmount)
**Effort:** XS
**Blast radius:** Component

**Corrected implementation:**
```ts
useEffect(() => { let cancelled = false; let s: WakeLockSentinel | null = null
  navigator.wakeLock?.request('screen').then(x => { if (cancelled) x.release(); else s = x })
  return () => { cancelled = true; s?.release() } }, [])
```

**References:** React docs "Synchronizing with Effects".

---

**ID:** CQ-006
**Title:** 109 source files start with a UTF-8 BOM
**Severity:** P4 — Informational
**Confidence:** Confirmed
**Category:** Code quality
**Location:** e.g. `src/components/ui/Loader.tsx`, `src/app/error.tsx` (`﻿'use client'`)
**Effort:** XS
**Blast radius:** Module

**Problem / Impact:** Breaks grep-based tooling and directive detection scripts; noisy diffs.

**Recommended remediation:** Normalize to UTF-8 without BOM; `.editorconfig` `charset = utf-8`.

**References:** —

### C.8 Reliability

---

**ID:** REL-001
**Title:** No lockfile committed — `npm ci` fails in CI and Docker; builds are non-reproducible; dependency audit impossible
**Severity:** P1 — High
**Confidence:** Confirmed (`ls *lock*` → none; `git ls-files` → none; `npm audit` → `ENOLOCK`)
**Category:** Reliability / Supply chain
**Location:** repository root; `.github/workflows/ci.yml:25,82` (`npm ci --legacy-peer-deps`); `.github/workflows/playwright.yml` (`npm ci`); `Dockerfile:8-9` (`COPY package.json package-lock.json* ./` then `npm ci`); `.npmrc` (`legacy-peer-deps`, `shamefully-hoist` — a pnpm option); `package.json` `pnpm.onlyBuiltDependencies`
**Effort:** S
**Blast radius:** Infrastructure

**Problem:** `npm ci` refuses to run without `package-lock.json`, so as committed, CI and the Docker image build fail; if a lockfile exists only on the build host, builds resolve whatever `^` ranges allow at build time (e.g. `next ^16.1.6`), so two deploys of the same commit can ship different dependency trees. The repo mixes npm and pnpm configuration.

**Impact:** Broken/unpredictable builds; silent introduction of vulnerable or malicious transitive versions; impossible to audit.

**Trigger conditions:** Every CI run/build.

**Root cause:** Lockfile not committed (and package manager not decided).

**Recommended remediation:** Choose one package manager (npm, given CI/Docker); generate and commit `package-lock.json`; set `"packageManager"` in `package.json`; remove pnpm-only config; resolve peer conflicts instead of `legacy-peer-deps`; add `npm audit --omit=dev --audit-level=high` (or OSV-Scanner) to CI; enable Dependabot/Renovate.

**Corrected implementation:** n/a (commit `package-lock.json`).

**Regression prevention:** CI fails if `package.json` changes without lockfile changes (`npm ci` enforces).

**References:** npm docs `npm ci`; OWASP A06:2021 Vulnerable and Outdated Components.

---

**ID:** REL-002
**Title:** Redis client never reconnects; rate limiting silently degrades to per-instance memory in production; memory store unbounded
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Reliability
**Location:** `src/lib/redis.ts` (`retryStrategy: () => null`, client created once, `getRedis()` returns `null` forever after a disconnect); `src/lib/rateLimit.ts:83-90` (warning suppressed when `NODE_ENV === "production"`), `:46-60` (`memStore` never evicts)
**Effort:** S
**Blast radius:** Application

**Problem:** After any Redis blip the process permanently falls back to an in-memory limiter (per instance, reset on restart) with no log in production; makeable cache is disabled the same way. `memStore` grows with every distinct IP/user key.

**Impact:** Rate limits weaken N× with N instances (brute-force protection degraded); slow memory growth; invisible degradation.

**Recommended remediation:** Allow ioredis reconnection with backoff (`retryStrategy: times => Math.min(times * 200, 5000)`); log/metric the fallback in all environments; evict expired `memStore` entries (or use an LRU with max size); consider failing closed for auth-sensitive limits when Redis is down.

**References:** ioredis docs (`retryStrategy`).

---

**ID:** REL-003
**Title:** No production observability: errors swallowed by `reportError`, console-only logs, no error tracking, shallow health check
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Reliability
**Location:** `src/utils/reportError.ts:1-5` (logs only in development, no-op otherwise); `src/middlewares/withErrorHandler.ts` (unstructured `console.error` with stack); no Sentry/OpenTelemetry/structured logger in `package.json`; no `src/app/global-error.tsx`; `src/app/api/health/route.ts` checks DB only (not Redis/mail), no separate liveness vs readiness
**Effort:** M
**Blast radius:** Application

**Problem / Impact:** Client- and server-side failures caught via `reportError` disappear in production; incidents are detected by users; the error page claims errors are logged.

**Recommended remediation:** Structured logger (pino) with request ids; error tracking (Sentry for Next.js) wired into `reportError`, `withErrorHandler`, `error.tsx`/`global-error.tsx`; Next.js `instrumentation.ts` for OpenTelemetry traces; `/api/health/live` (process) and `/api/health/ready` (DB + Redis, with timeouts).

**References:** Next.js docs "Instrumentation", "Error handling (global-error)".

---

**ID:** REL-004
**Title:** No documented backup/restore, rollback, or migration-failure procedure
**Severity:** P2 — Medium
**Confidence:** Medium (absence in repo; hosting may provide backups)
**Category:** Reliability
**Location:** `README.md`, `SETUP_CREDENTIALS.md`, `scripts/deploy.sh`, `Dockerfile` (migrations at boot, DB-009)
**Effort:** S
**Blast radius:** Infrastructure

**Problem / Impact:** Destructive migrations (DB-014) and cascades (DB-004) have no documented recovery path; a failed boot-time migration takes the app down with no rollback guidance.

**Recommended remediation:** Runbook: PITR/backup schedule and tested restore, pre-deploy snapshot, expand/contract migration policy, image rollback procedure, RPO/RTO targets.

**References:** PostgreSQL docs "Backup and Restore".

---

**ID:** REL-005
**Title:** Environment validation is lenient for production-critical variables
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Reliability
**Location:** `src/lib/env.ts` (`NEXTAUTH_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `AUTH_GOOGLE_*`, `TRUSTED_PROXY` all optional; `DATABASE_URL` not validated; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` read raw in the widget); `AUTH_GOOGLE_ID ?? ""` in `authOptions.ts`
**Effort:** XS
**Blast radius:** Application

**Problem / Impact:** Misconfiguration surfaces at request time (500s, silent captcha lockout, global rate-limit bucket) instead of at boot.

**Corrected implementation:**
```ts
const prodRequired = envSchema.superRefine((e, ctx) => {
  if (e.NODE_ENV !== 'production') return
  for (const k of ['NEXTAUTH_SECRET','RESEND_API_KEY','TURNSTILE_SECRET_KEY','TRUSTED_PROXY'] as const)
    if (!e[k]) ctx.addIssue({ code: 'custom', path: [k], message: 'required in production' })
})
```

**References:** —

---

**ID:** REL-006
**Title:** Missing error/loading boundaries for planner and pantry; no `global-error.tsx`
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Reliability
**Location:** `src/app/planner/`, `src/app/pantry/` (no `loading.tsx`/`error.tsx`); root lacks `global-error.tsx`
**Effort:** XS
**Blast radius:** Module

**Recommended remediation:** Add segment `loading.tsx`/`error.tsx` and a root `global-error.tsx` reporting to error tracking.

**References:** Next.js "Error Handling".

### C.9 Testing

Executed: `vitest run --exclude 'tests/integration/db/**'` → **50 files, 549 tests, all passed**. DB integration tests (`npm run test:db`) and Playwright were not run (require a database / running server).

---

**ID:** TEST-001
**Title:** Coverage gate measures 16 hand-picked files (one non-existent); no test asserts response shapes or public-route authorization
**Severity:** P1 — High
**Confidence:** Confirmed
**Category:** Testing
**Location:** `vitest.config.ts:20-50` (`coverage.include` lists 16 files incl. `src/app/api/auth/mobile/oauth/google/start/route.ts`, which does not exist; thresholds 90/85% apply only to these); `tests/integration/api-*.test.ts` (no test for `include=` or `/api/ratings` output)
**Effort:** M
**Blast radius:** Application

**Problem:** The 90% gate gives false assurance: QueryBuilder, repositories, services with concurrency issues, and most routes are outside it. No test would have caught SEC-001/002.

**Impact:** Critical regressions ship with green CI.

**Recommended remediation:** Measure coverage over `src/**` (exclude UI primitives) with modest global thresholds that ratchet up; add critical-path suites (below); add the response-shape test (SEC-001).

**Minimum effective test suite per critical journey:**
| Journey | Minimum tests |
|---|---|
| Sign up / verify / sign in (web + mobile) | captcha required on every credential endpoint; uniform responses for existing/non-existing email; mixed-case email login; verify token purpose binding; session cookie name on HTTPS (E2E) |
| Token lifecycle | refresh rotation + reuse detection; revoke-all on password change/reset; deleted user token → 401 |
| Public catalog | response-shape scan for sensitive keys on every `withPublic` route; include allow-list rejects nested paths; limit caps |
| Pantry / make cocktail | concurrent decrement correctness (DB test); idempotent complete (parallel ×2); collection completion transactional |
| Planned collections / invites | ownership (other user → 403/404); email template escaping; RSVP dedupe + rate limit |
| Ratings | concurrent ratings → correct aggregate; range CHECK |
| Admin | non-admin → 403 for every `withAdmin` route (route inventory test); ingredient delete in use → 409 |
| Accessibility | axe scan on home, cocktails, cocktail detail, signin, signup, pantry, planner (both themes); keyboard-only rating and dialog tests |

**Regression prevention:** Route-inventory tests generated from `src/app/api/**/route.ts` so new routes must be classified.

**References:** Vitest coverage config docs.

---

**ID:** TEST-002
**Title:** Playwright CI workflow cannot succeed as configured
**Severity:** P2 — Medium
**Confidence:** High
**Category:** Testing
**Location:** `.github/workflows/playwright.yml` (`npm ci` without lockfile or `--legacy-peer-deps`; no DB, env, or server start); `playwright.config.ts:106-111` (`webServer` commented out; `baseURL` localhost:3000); branch filters `main/master` vs CI's `main/dev`
**Effort:** S
**Blast radius:** Infrastructure

**Recommended remediation:** Postgres service + `migrate deploy` + seed, `next build && next start` via `webServer`, required env (test Turnstile keys from Cloudflare's documented test sitekeys), consistent branches.

**References:** Playwright docs "webServer"; Cloudflare Turnstile testing keys.

---

**ID:** TEST-003
**Title:** No concurrency, integrity or authorization-matrix tests
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Testing
**Location:** `tests/integration/db/*` (8 test cases total); service tests mock Prisma (`tests/__mocks__/prisma.ts`)
**Effort:** M
**Blast radius:** Application

**Recommended remediation:** Real-DB tests (Testcontainers or CI Postgres) for DB-001/002/006/008 with `Promise.all` races; authorization matrix tests (two users, cross-access attempts) for every user-owned route.

**References:** Testcontainers for Node.

---

**ID:** TEST-004
**Title:** No automated accessibility testing
**Severity:** P2 — Medium
**Confidence:** Confirmed (no `axe`/`@axe-core` in repo)
**Category:** Testing
**Location:** `e2e/`, `tests/`
**Effort:** S
**Blast radius:** Application

**Recommended remediation:** `@axe-core/playwright` scans on key pages in both themes; `eslint-plugin-jsx-a11y`; keyboard-flow tests for dialogs and rating.

**References:** Deque axe-core docs.

---

**ID:** TEST-005
**Title:** Service tests are mock-heavy and validate implementation details
**Severity:** P3 — Low
**Confidence:** Medium
**Category:** Testing
**Location:** `tests/services/*.test.ts` with `tests/__mocks__/prisma.ts`
**Effort:** M
**Blast radius:** Module

**Problem / Impact:** Mocked Prisma calls assert call shapes, so they can't detect wrong isolation levels, missing constraints or query semantics (e.g. DB-001 passes its unit tests).

**Recommended remediation:** Shift high-value service tests to the real-DB harness; keep mocks for pure logic.

**References:** —

### C.10 Developer experience

---

**ID:** DX-001
**Title:** IDE files tracked despite `.gitignore`; workspace clutter
**Severity:** P2 — Medium
**Confidence:** Confirmed
**Category:** Developer experience
**Location:** `.idea/*` (8 tracked files incl. `workspace.xml` containing local absolute paths); `coverage/`, `tsconfig.tsbuildinfo` present locally; build logs (`run1.log`, `scratch-next.log`, …) in the parent directory; `.claude/worktrees/*` contain copies of `.env` files (ignored, but easy to leak into archives)
**Effort:** XS
**Blast radius:** Module

**Recommended remediation:** `git rm -r --cached .idea`; keep ignores; avoid copying `.env` into worktrees; periodically run a secret scanner (gitleaks) over history.

**References:** gitleaks.

---

**ID:** DX-002
**Title:** Dependency hygiene: unused and misplaced packages
**Severity:** P2 — Medium
**Confidence:** Confirmed (grep across `src`, `prisma`, `scripts`, `tests`, `e2e`)
**Category:** Developer experience / supply chain
**Location:** `package.json` — unused: `axios`, `lucide-react-native`, `react-native-svg`, `next-cloudinary`, `js-yaml`, `pg`, `@auth/prisma-adapter`, `@svgr/webpack`, `@radix-ui/react-navigation-menu` (after CQ-001); dev tooling in `dependencies`: `prisma`, `tsx`, `prettier`, `dotenv`; both `@next-auth/prisma-adapter` and `@auth/prisma-adapter`
**Effort:** S
**Blast radius:** Infrastructure

**Problem / Impact:** Larger install/attack surface and standalone image; confusion about which adapter is authoritative. (Client bundles are unaffected — unimported packages are tree-shaken.)

**Recommended remediation:** Remove unused; move tooling to devDependencies (keep `prisma` CLI available to the release job); add `knip`/`depcheck` to CI.

**References:** knip.

---

**ID:** DX-003
**Title:** Inconsistent toolchain across environments
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Developer experience
**Location:** Node 20 (CI) vs 22 (Docker) vs `lts/*` (Playwright) vs local 22.20; Postgres 16 (CI) vs 18 (compose); `@types/node ^20`; `tsconfig.json` `target: ES2017`, `allowJs`, excludes `packages`; no `engines` field
**Effort:** XS
**Blast radius:** Infrastructure

**Recommended remediation:** Pin Node via `.nvmrc` + `engines` + CI matrix = runtime; align Postgres major; include shared package in type-check.

**References:** —

---

**ID:** DX-004
**Title:** docker-compose drift from the application
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Developer experience
**Location:** `docker-compose.yml` (MinIO + bucket bootstrap although the app uses Cloudinary; `minio/minio:latest`, `minio/mc:latest` unpinned; no Redis service although rate limiting/cache use Redis; Postgres published on all interfaces `5432:5432`)
**Effort:** XS
**Blast radius:** Module

**Recommended remediation:** Replace MinIO with Redis; pin image tags; bind to `127.0.0.1:5432:5432`.

**References:** —

---

**ID:** DX-005
**Title:** No pre-commit hooks or enforced formatting
**Severity:** P3 — Low
**Confidence:** Confirmed
**Category:** Developer experience
**Location:** `package.json` (no `format`/`format:check` script, no husky/lint-staged); Prettier installed but not run in CI
**Effort:** XS
**Blast radius:** Module

**Recommended remediation:** lint-staged (eslint --max-warnings=0, prettier --check, tsc on changed packages) and a CI `format:check` step.

**References:** lint-staged.

---

## D. Prioritized remediation backlog

The full backlog (grouped by root cause, with dependencies, effort, expected impact and acceptance criteria) is in **`AUDIT_BACKLOG.md`**. Summary of the top items:

| Backlog ID | Priority | Findings | Action | Effort |
|---|---|---|---|---|
| BL-01 | P0 | SEC-001, SEC-002, SEC-017, ARCH-001 | Close public data exposure; server-side DTOs; Prisma `omit` | S–M |
| BL-02 | P0 | SEC-001/002/003 (incident) | Credential/token rotation and breach assessment | M |
| BL-03 | P1 | SEC-003, SEC-004, SEC-019 | Token lifecycle: no stored OAuth tokens, refresh rotation, session versioning | M |
| BL-04 | P1 | SEC-005, SEC-008, SEC-016, SEC-018, ARCH-003 | Unified credential-endpoint policy (captcha, throttling, enumeration, normalization) | M |
| BL-05 | P1 | SEC-006 | Escape email templates; tighten invite sending | S |
| BL-06 | P1 | DB-001, DB-002, DB-005, DB-008, DB-012 | Atomic, idempotent pantry/completion writes + Prisma error mapping | M–L |
| BL-07 | P1 | DB-003, BPERF-001, DB-010 | SQL-side makeable computation + per-user cache | L |
| BL-08 | P1 | DB-004 | Restrict catalog cascades; merge flow | S |
| BL-09 | P1 | REL-001, DX-002, DX-003, TEST-002 | Lockfile, package manager, dependency audit, working CI | S |
| BL-10 | P1 | TEST-001, TEST-003, TEST-004 | Meaningful coverage + security/concurrency/a11y regression suites | M |
| BL-11 | P1 | A11Y-001–004, A11Y-023 | Keyboard/AT blockers: rating, dialogs, toasts, file input, checkbox | M |
| BL-12 | P1 | PERF-001, PERF-002, PERF-003 | Server-render catalog pages | L |

## E. Remediation roadmap

**Phase 1 — Immediate security and data integrity (days 0–3, stop-the-bleed)**
1. BL-01 (include allow-list exact match + remove user-reaching relations + `select` on `/api/ratings` + Prisma `omit`) — ship first, it is small.
2. BL-02 incident response immediately after BL-01 deploys (rotation must follow the fix, otherwise new secrets leak again): rotate `NEXTAUTH_SECRET`, revoke refresh tokens, null stored OAuth tokens, force credential-user password resets, review logs, notify.
3. BL-05 (email escaping) and delete `/api/auth/login`.
4. BL-08 (`onDelete: Restrict` on catalog → user data) — prevents irreversible admin mistakes.

**Phase 2 — Quick wins, high impact / low effort (week 1)**
- BL-09: commit lockfile, fix CI; add `npm audit`/OSV and response-shape tests (part of BL-10) so Phase 1 cannot regress.
- SEC-011 (re-auth for delete), SEC-007 (barcode authz), SEC-012 (default public rate limit, array caps), SEC-016 (Turnstile timeout/hostname/action), A11Y-003 (toast duration), A11Y-004, A11Y-012, PERF-004 (drop `motion` from Loader), REL-002 (Redis reconnect), REL-005 (env validation), DB-005 (Prisma error mapping), CQ-004 (sitemap `/makeable`).

**Phase 3 — Short-term reliability and performance (weeks 2–4)**
- BL-03 token lifecycle (depends on BL-02 being done; requires a mobile app release for rotation handling — ship server support backward-compatibly: accept old non-rotated tokens once, then rotate).
- BL-04 unified credential policy (mobile captcha/attestation requires a mobile release).
- BL-06 transactional/idempotent writes (depends on DB-005 mapping and repositories accepting `tx`).
- DB-007 indexes (CONCURRENTLY), DB-009 `directUrl` + release-job migrations, REL-003 observability, REL-004 runbook.
- BL-11 accessibility blockers; A11Y-005..014 in component batches.

**Phase 4 — Medium-term architecture (months 1–2)**
- ARCH-001: explicit query/response schemas for public and user routes; generic builder restricted to admin.
- ARCH-002: shared DTO package via workspaces; server-side mappers (enables removing casts, CQ-002).
- BL-07 makeable in SQL + cache redesign.
- BL-12 server-rendered catalog pages (PERF-001/002/003), AppShell (ARCH-004), API-client consolidation (ARCH-005).

**Phase 5 — Long-term scalability and maintainability**
- DB-013 type migrations (Decimal, timestamptz, citext) with expand/contract; DB-011 SQL aggregates with user timezone; DB-014 migration linting and drift checks; DB-015 index pruning from production stats.
- CSP nonces (SEC-015), virtualization (PERF-010), knip/pre-commit (CQ-001, DX-005), ratcheting coverage.

**Dependency notes:** BL-02 after BL-01. BL-06 after DB-005. BL-03 server change before mobile release. Index migrations (DB-007) after DB-009 (direct URL, release job). ARCH-001 refactor is easier after BL-10 response-shape tests exist (they act as the safety net).

## F. Audit coverage and limitations

### Files and directories inspected
- **Fully traced (security):** all 85 route files under `src/app/api/**` (82 `route.ts`, 3 `route.tsx`), `src/app/(home)/bar/og/route.tsx`, `src/app/.well-known/assetlinks.json/route.ts`, `src/proxy.ts`, `src/middlewares/*`, `src/lib/auth/*`, `src/lib/rateLimit.ts`, `src/lib/redis.ts`, `src/lib/env.ts`, `src/lib/db/prisma.ts`, `src/lib/query/*`, `src/utils/{apiResponse,errors,token,turnstile,mail,parseQueryParams,reportError}.ts`, and every service/repository called by those routes.
- **Database:** `prisma/schema.prisma`, all 36 migrations, `src/repositories/**`, `src/services/**`, `src/lib/cache/**`, `src/lib/derivations/**`; seeders reviewed briefly.
- **Frontend/a11y:** all pages/layouts under `src/app/**`, all components under `src/components/**`, `src/hooks/**`, `src/lib/{api,pdf,demo-bar,planner-dashboard}`, `src/providers/**`, `globals.css`, `tokens.css`, contrast utilities/tests.
- **Config/infra:** `package.json`, `.npmrc`, `.gitignore`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `Dockerfile`, `docker-compose.yml`, `scripts/deploy.sh`, `.github/workflows/*.yml`, `.env.example` (structure only), tests under `tests/` and `e2e/` (structure + samples).

### Areas not inspected / partially inspected
- `mobile/` (React Native app) — out of scope except API contracts; its own security (token storage, deep links) not audited.
- `packages/shared` beyond types/validation-limit duplication.
- `docs/`, `scripts/design/*` (design tooling), `public/` assets.
- Seeder internals (`prisma/seeder/**`) only skimmed.
- Admin-stats, user-stats, recommendation and smart-collection services were reviewed for authorization (session-scoped) and query shape, not line-by-line.
- Hosting/edge configuration (Coolify, Cloudflare, Supabase settings, DB user privileges, TLS, backups) — not available.

### Commands executed (all non-destructive)
| Command | Result |
|---|---|
| `node -v`, `next --version`, `prisma --version`, `tsc -v` | Node 22.20.0, Next 16.2.6, Prisma 6.19.3, TS 5.9.3 |
| `tsc --noEmit` | **exit 0** (no type errors) |
| `eslint src` | **0 errors, 4 warnings** (3 unused vars, 1 set-state-in-effect) |
| `vitest run --exclude tests/integration/db/**` | **50 files / 549 tests passed** |
| `prisma validate` | schema valid |
| `npm audit --omit=dev` | **failed: ENOLOCK** (no lockfile) — dependency vulnerability status **unknown** |
| `git log`, `git ls-files`, `git check-ignore` | repository state, tracked files |
| `grep`/read-only inspection of `node_modules/next-auth` cookie logic | confirmed `__Secure-` prefix behavior (SEC-010) |

### Tools unavailable / not used
- No live database: `EXPLAIN`/`EXPLAIN ANALYZE`, migration drift diff, and index usage stats not run.
- No production build: bundle sizes, Lighthouse/Web Vitals, and hydration behavior not measured.
- No running app: exploits (SEC-001/002/003) not executed; Playwright and DB integration suites not run.
- No assistive technology or browser for accessibility testing.
- Dependency vulnerability scanning impossible without a lockfile (REL-001). Framework CVEs for the exact resolved versions therefore could not be checked; re-run `npm audit` / OSV-Scanner after committing a lockfile.

### Findings requiring runtime verification
SEC-001/002 (confirm on staging with a test account and `include=favoritedBy.user`), SEC-003 (token replay within `exp`), SEC-005 (production `TRUSTED_PROXY` and origin exposure), SEC-010 (cookie name on HTTPS), DB-001/002/006/008 (concurrency tests), DB-003 (result truncation with real catalogue), DB-007 (EXPLAIN on production-like data), DB-009 (production `DATABASE_URL`/pooler mode), PERF-001..006 (Lighthouse/bundle analyzer), REL-002 (Redis outage behavior).

### Findings requiring manual accessibility testing
1. Turnstile challenge operability by keyboard/screen reader and failure states (3.3.8, 2.1.1).
2. Real focus visibility and contrast in light and dark themes, including over images and gradients (1.4.3, 1.4.11, 2.4.7).
3. Focus Not Obscured at real breakpoints with sticky/fixed bars (2.4.11).
4. Radix dialog/popover focus return, especially popovers inside custom modals.
5. Sonner live-region announcements before dismissal.
6. cmdk combobox announcements; planner calendar month/week grid reading order and event chips.
7. Reflow at 320 px and 200%/400% zoom with 9–10 px uppercase labels (1.4.10, 1.4.4); text spacing (1.4.12).
8. Recharts keyboard layer and hover/focus content (1.4.13).
9. Swipe-to-close sheets: non-gesture alternatives on touch devices (2.5.1/2.5.7).
10. Heading outline per rendered state with a screen-reader headings list.
11. Whether infinite loader animations meet 2.2.2.

### Assumptions
- The deployed code equals HEAD `e1e7738`; production runs behind HTTPS (`NEXTAUTH_URL` https).
- `.env.example` reflects the production topology (Supabase pooler, `TRUSTED_PROXY=cloudflare`); actual secrets were not read or reproduced.
- Volume estimates (5k cocktails, 100k users, 1M pantry rows) are planning assumptions, not measured.
- Severity reflects a public, internet-facing deployment with real user accounts.

---

## G. Remediation status (2026-11-27)

Fixes were applied to the working tree after this audit (not committed). Status per finding: **Fixed** = code changed and covered by tests or static checks; **Partial** = main risk addressed, residual noted; **Deferred** = not changed, with the reason; **Ops** = requires production action, not code.

**Verification after remediation:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint src --max-warnings=0` | 0 errors, 0 warnings |
| `npx vitest run --exclude "tests/integration/db/**" --coverage` | 65 files, 829 tests, all pass |
| Coverage gate | now measured over `src/**`; 22.2% lines, 70.7% branches, 44.7% functions, above the ratcheting thresholds |
| `npx prisma validate` | valid |
| `node scripts/audit-gate.mjs` | passes; 0 unaccepted high/critical advisories |
| `npm audit --omit=dev` | 18 → 8 (2 critical, 5 high, 1 low) |

**Not run:**
- DB integration tests, including the new concurrency suite. They need a Postgres instance; they type-check.
- Playwright end-to-end and the new axe accessibility specs.
- A `next build`: `sitemap.ts` needs the database.
- A Docker build.

| Finding | Status | Notes |
|---|---|---|
| SEC-001 | Fixed | Include allow-lists match exactly; any `user` relation is forced to `{id,name,image}`; `favoritedBy`, `pantryItems` and `accounts` are removed from allow-lists. Covered by `tests/unit/security/include-allowlist.test.ts`. Prisma global `omit` deliberately not used (it changes transaction-client types). |
| SEC-002 | Fixed | Fixed by the same include projection. |
| SEC-003 | Fixed | OAuth tokens are no longer stored (web adapter wrapper plus mobile path). Google ID tokens are single-use (Redis `SET NX`, with an in-memory fallback). **Ops:** null the existing `accounts` token columns (RUNBOOK §7). |
| SEC-004 | Fixed | Refresh tokens rotate in a transaction, with reuse detection (60-second grace). New `User.sessionVersion` is checked by the web JWT callback (re-checked every 5 minutes) and on every mobile request. Password change, reset and account delete revoke all sessions. Mobile access-token TTL is 1 hour; refresh TTL is 60 days. |
| SEC-005 | Partial | `/api/auth/login` is deleted. A shared `enforceCredentialPolicy` (per-IP plus per-account limits, Turnstile) covers web and mobile. Mobile Turnstile turns on with `MOBILE_CAPTCHA_REQUIRED=1` once a mobile build sends `x-turnstile-token`. `TRUSTED_PROXY` is required in production. |
| SEC-006 | Fixed | Every template value is HTML-escaped and subjects are sanitised. Only verified senders can send invites, and fields are length-capped. |
| SEC-007 | Fixed | Only admins can remap an already-mapped barcode; rate-limited. |
| SEC-008 | Fixed | Register returns a uniform 201 and emails the owner when the address already exists. Resend and reset always return 204. bcrypt always runs (constant work). A password is now required. Mobile register no longer returns `userId`. |
| SEC-009 | Fixed | Tokens are bound to a purpose (`verify:` or `reset:`). The verify GET has no side effects and leads to a `/verify-email` confirmation page that POSTs. |
| SEC-010 | Fixed | The cookie name now follows NextAuth's secure-prefix rule. |
| SEC-011 | Fixed | Credential users must re-enter their password to delete the account; tokens are revoked. |
| SEC-012 | Fixed | `withPublic` and `withOptionalUser` apply a default rate limit and CSRF checks. RSVP is rate-limited. Arrays and strings are capped. Upload is rejected on Content-Length before parsing. **Ops:** set a proxy body limit (RUNBOOK §10). |
| SEC-013 | Fixed | Device rows are rebound atomically and never mutated across owners; the response is minimal. |
| SEC-014 | Fixed | Magic-byte sniffing plus Cloudinary `allowed_formats`. |
| SEC-015 | Deferred | Nonce-based CSP forces per-request rendering of every page and can't be checked without running the app. Accepted risk: no XSS sinks found. The proxy is kept as the place to add a nonce. |
| SEC-016 | Fixed | 3-second timeout, hostname and widget-action checks, token type and length validation. The widget shows an error with a retry button and uses `theme: "auto"`. |
| SEC-017 | Fixed | Admin user list uses an explicit projection; `getWithStats` exposes `hasPassword` instead of the hash. |
| SEC-018 | Fixed | Login and register normalise the email, plus a `lower(email)` unique index. Passwords are capped at 72 bytes. The email is kept out of URLs (sessionStorage). |
| SEC-019 | Fixed | Covered by SEC-004 (DB check and 1-hour TTL). |
| DB-001 | Fixed | Pantry rows are locked (`FOR UPDATE`), then decremented with one relative UPDATE. |
| DB-002 | Fixed | Claim-then-act inside a single transaction. A repeat completion returns 409. Optional `Idempotency-Key` on `make`. |
| DB-003 | Fixed | Coverage computed in SQL with deterministic ordering. |
| DB-004 | Fixed | `onDelete: Restrict` (NOT VALID, then VALIDATE). Delete returns 409 with usage counts. The ingredient-merge admin flow is not built. |
| DB-005 | Fixed | P2002, P2003, P2025 and P2034 map to 409/404; `withSerializableRetry`. |
| DB-006 | Fixed | Row lock plus a single-statement aggregate; CHECK 1–5. |
| DB-007 | Fixed | 5 indexes, each created CONCURRENTLY in its own migration. |
| DB-008 | Fixed | RSVP unique and upsert, with a cap of 200 guests per collection. `createWithCocktails` is a single nested write. `moveToPantry` uses a row lock. |
| DB-009 | Fixed | `scripts/release-migrate.sh` runs the pinned CLI with `DIRECT_URL`. Nothing runs at boot by default; seeding needs `RUN_SEED=1`. |
| DB-010 | Fixed | One Redis hash per user with a direct DEL (no SCAN). `clampMaxMissing`. A catalog version is part of the key. |
| DB-011 | Fixed | SQL aggregates; optional `?tz=` on `/api/user/stats`. |
| DB-012 | Partial | Collection decrements are batched. `addItemsBulk` runs in one transaction but still issues per-item queries. |
| DB-013 | Partial | CHECK quantity ≥ 0; case-insensitive email index. Float→Decimal and timestamptz are deferred: they would break the JSON contract with the mobile app and rewrite tables. |
| DB-014 | Fixed | New migrations follow expand/contract, CONCURRENTLY, and NOT VALID/VALIDATE. |
| DB-015 | Partial | 3 exact-duplicate indexes dropped. Prefix and low-selectivity indexes are left until production usage stats are available. |
| DB-016 | Partial | `npm run db:purge-tokens` (with dry run); it needs scheduling. The dead `MobileOAuthExchangeCode` table is not dropped yet. |
| BPERF-001 | Partial | Recommendations cached (5 minutes); sitemap `revalidate=3600`. Smart-collection fan-out is not limited. |
| BPERF-002 | Fixed | Timeouts on Turnstile (3 s), Google JWKS, OpenFoodFacts and Resend (8 s). `src/lib/http.ts` helper. |
| BPERF-003 | Fixed | Covered by SEC-012. |
| BPERF-004 | Deferred | The landing QR is not memoised and the OG route has no Cache-Control yet. |
| A11Y-001 to A11Y-024 | Fixed (static) | Radio-group rating; Radix dialogs and alertdialog; 6 s/10 s toasts plus inline alerts; labels, landmarks and skip link; contrast tokens fixed and test pairs extended; reduced motion; chart tables; touch target sizes. **Manual AT/browser verification is still required** (section F). |
| PERF-001 | Fixed | Detail pages are Server Components using a `cache()` loader shared with metadata, plus client islands. |
| PERF-002 | Partial | Infinite queries, no waterfall, lazy filter options. The first list page is not server-rendered. |
| PERF-003 | Fixed | The session is passed in from guarded layouts; public layouts stay static. |
| PERF-004 to PERF-010 | Fixed | CSS loader; offset effects removed; Geist removed and Noto trimmed; invalidations narrowed and awaited; single makeable query; `content-visibility`. |
| ARCH-001 | Partial | Generic builder hardened (exact includes, safe user projection). Explicit per-route DTO schemas: BL-17. |
| ARCH-002 | Deferred | Shared DTO workspace package: BL-17. |
| ARCH-003 | Partial | Auth flows unified (credential policy, single token implementation; `utils/token.ts` removed). |
| ARCH-004, ARCH-005 | Fixed | `AppShell`; raw fetches replaced with API client and hooks. |
| CQ-001 | Fixed | 9 dead components, the unused fonts and the empty `src/shared` removed. |
| CQ-002 | Partial | Body parsing hardened; `noUncheckedIndexedAccess` not enabled. |
| CQ-003 | Fixed | `rules-of-hooks` is an error, max-warnings 0 passes, exhaustive-deps disables removed, TagsField keys fixed. |
| CQ-004, CQ-005, CQ-006 | Fixed | Stale comments fixed and sitemap `/makeable` removed; wake-lock and timer cleanup; BOM stripped (63 files) and `.editorconfig` added. |
| REL-001 | Fixed | `package-lock.json` added; npm only; `packageManager` and `engines` set; `legacy-peer-deps` removed. |
| REL-002 | Fixed | Redis reconnects with backoff; fallback is logged; in-memory store is bounded. |
| REL-003 | Partial | Structured logger, request ids, `reportError` hook, `global-error`, live/ready health checks. No error-tracking vendor is wired yet (`setErrorReporter` is ready for one). |
| REL-004 | Partial | `docs/RUNBOOK.md` written. **Ops:** backups, PITR and a restore test are checklist items. |
| REL-005, REL-006 | Fixed | Production env validation; error and loading boundaries. |
| TEST-001 | Fixed | Coverage over `src/**` with a ratchet; security regression tests (include allow-list, route inventory, auth flows). |
| TEST-002 | Fixed (unverified) | Playwright workflow with Postgres, seed, build, `webServer` and Turnstile test keys. |
| TEST-003 | Partial | DB concurrency suite written; not run here. |
| TEST-004 | Fixed (unverified) | `@axe-core/playwright` plus `e2e/a11y.spec.ts`. |
| TEST-005 | Deferred | Moving mock-heavy service tests to the real-DB harness. |
| DX-001 to DX-005 | Fixed | `.idea` untracked; dependencies pruned; Node 22 everywhere; compose uses Redis with pinned images on localhost; `format` scripts. Husky/lint-staged not added. |

**Remaining dependency advisories** (accepted with expiry in `audit-allowlist.json`; BL-19):
- `@auth/core` via next-auth v4: affected code paths unused.
- Prisma CLI config loader: build time only.
- zod 3: partially mitigated.

Each needs a major upgrade: Auth.js v5, Prisma 7 or zod 4.

**API behaviour changes clients must know about:**
- `/api/auth/mobile/refresh` returns a new refresh token every time (the shipped mobile app already stores it).
- Repeat completions return 409.
- Adding a duplicate favorite now succeeds instead of returning 409.
- Register and resend responses no longer distinguish existing emails.
- Verification links land on `/verify-email` and need a click.

**Production follow-ups that code cannot do:**
1. **Incident response (BL-02):**
   - Review access logs for include abuse.
   - Rotate `NEXTAUTH_SECRET`.
   - Revoke refresh tokens and null `accounts` tokens.
   - Force password resets.
   - Assess GDPR notification.
2. **Before applying migrations:**
   - Find and merge accounts whose emails differ only by case (`users_email_lower_unique` will fail otherwise).
   - Apply migrations through the release job.
3. **Edge settings:** set a proxy body limit and restrict the origin to Cloudflare (RUNBOOK §10).
4. **Mobile captcha:** enable `MOBILE_CAPTCHA_REQUIRED=1` after a mobile release that sends Turnstile tokens.
5. **`.env.example`:** it is git-ignored and contains what looks like a real Postgres password. Rotate that password and replace it with a placeholder before un-ignoring the file.
