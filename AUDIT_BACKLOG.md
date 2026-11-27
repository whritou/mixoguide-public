# MixoGuide — Prioritized Remediation Backlog

Companion to `AUDIT.md` (finding IDs refer to its section C). Items are grouped by **root cause**, not by symptom. Effort: XS < ½ day, S ≤ 2 days, M ≤ 1 week, L ≤ 3 weeks, XL > 3 weeks (one engineer).

## Status after remediation (2026-11-27)

Per-finding detail is in `AUDIT.md` section G. Changes are in the working tree and not committed.

| Item | Status |
|---|---|
| BL-01 | Done |
| BL-02 | **Open (Ops)** |
| BL-03 | Done |
| BL-04 | Done; mobile captcha is behind a flag |
| BL-05 | Done |
| BL-06 | Done (`addItemsBulk` still issues per-item queries) |
| BL-07 | Done |
| BL-08 | Done (merge flow not built) |
| BL-09 | Done |
| BL-10 | Done (DB and e2e suites not run here) |
| BL-11 | Done (manual AT check pending) |
| BL-12 | Done (first list page is not SSR) |
| BL-13 | Done (EXPLAIN pending) |
| BL-14 | Done |
| BL-15 | Done, except CSP nonce (deferred) |
| BL-16 | Done; error-tracking vendor and backups are Ops |
| BL-17 | **Open** |
| BL-18 | Mostly done; Decimal/timestamptz, QR/OG caching, husky and `noUncheckedIndexedAccess` are open |

### BL-19 · Major dependency upgrades (new)
- **Why:** removes the advisories accepted in `audit-allowlist.json`. The entries expire 2027-01-31 / 2027-02-28, after which CI fails until this is done or the entries are re-justified.
- **Action:**
  - next-auth v4 → Auth.js v5 (removes the `@auth/core` advisory).
  - Prisma 6 → 7.
  - zod 3 → 4 (shared schemas and mobile too).
- **Acceptance criteria:**
  - `node scripts/audit-gate.mjs` passes with an empty allow-list.
  - Full test suites pass.

**Implementation order:** BL-01 → BL-02 → BL-05 → BL-08 → BL-09 → BL-10 (shape/authz tests) → BL-13 → BL-06 → BL-03 → BL-04 → BL-11 → BL-14 → BL-07 → BL-12 → BL-15 → BL-16 → BL-17 → BL-18.

---

## P0 — Critical

### BL-01 · Close public data exposure through generic includes
- **Findings:** SEC-001, SEC-002, SEC-017, ARCH-001 (partial), SEC-012 (limit caps)
- **Affected files:** `src/lib/query/QueryBuilder.ts`, `src/repositories/base.repository.ts`, `src/repositories/{cocktail,bartool,user,planned-collection,suggestion,rating}.repository.ts`, `src/services/{ingredient,glass,rating}.service.ts`, ingredient-type/sub-type repositories, `src/lib/db/prisma.ts`, `src/app/api/{cocktails,ingredients,glasses,bar-tools,ingredient-types,ingredient-subtypes,ratings}/route.ts`
- **Action:**
  1. `buildIncludeArgs`: exact-match only; unknown include → 400.
  2. Allow-lists become `Record<string, Prisma select/include object>`; no `true` for any relation.
  3. Remove `favoritedBy`, `pantryItems`, `user`, `ratings`, `accounts` from allow-lists reachable by `withPublic`/`withUser`; expose `_count` instead.
  4. `rating.service.getAll`: `user: { select: { id, name, image } }`.
  5. `PrismaClient({ omit: { user: { password: true }, account: { access_token: true, refresh_token: true, id_token: true } } })`; auth paths opt back in explicitly.
  6. Cap public `limit` at 100.
- **Effort:** S
- **Dependencies:** none (ship first)
- **Expected impact:** eliminates anonymous exfiltration of hashes, emails, tokens, pantry and RSVP data.
- **Acceptance criteria:**
  - `GET /api/cocktails?include=favoritedBy.user` → 400.
  - Recursive key scan of responses from every `withPublic` route (with all allowed includes) finds none of: `password`, `email`, `access_token`, `refresh_token`, `id_token`, `fcmToken`, `shareToken`.
  - `GET /api/ratings` items contain only `id, rating, createdAt, cocktailId, user{id,name,image}`.
  - `GET /api/user/all?include=accounts` returns no token or password fields.
  - Existing UI still renders cocktail/ingredient lists and detail pages (Playwright smoke).

### BL-02 · Incident response for exposed credentials
- **Findings:** SEC-001, SEC-002, SEC-003 (consequences)
- **Affected:** production secrets, `refresh_tokens`, `accounts`, `users`, access logs, CDN
- **Action:**
  1. Search access logs for `include=` containing `.user`, `.accounts`, `.devices`, `.rsvps`, and for bulk `/api/ratings` paging.
  2. Rotate `NEXTAUTH_SECRET` (invalidates all web JWTs and mobile access tokens).
  3. `UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL`.
  4. `UPDATE accounts SET access_token = NULL, refresh_token = NULL, id_token = NULL`.
  5. Force password reset for credential users (flag + email).
  6. Purge CDN caches for `/api/cocktails*`.
  7. Assess GDPR Art. 33/34 notification (72 h).
- **Effort:** M
- **Dependencies:** BL-01 deployed first.
- **Expected impact:** neutralizes already-leaked tokens; limits damage from leaked hashes.
- **Acceptance criteria:**
  - Old sessions and refresh tokens are rejected.
  - `accounts` token columns are NULL.
  - A decision on breach notification is documented.

## P1 — High

### BL-03 · Token and session lifecycle
- **Findings:** SEC-003, SEC-004, SEC-019, DB-016 (purge), CQ-001 (`rotateRefreshToken`, `MobileOAuthExchangeCode`)
- **Affected files:** `src/services/mobile-auth.service.ts`, `src/repositories/refresh-token.repository.ts`, `src/app/api/auth/mobile/{refresh,logout}/route.ts`, `src/app/api/auth/mobile/oauth/google/{utils,id-token/route}.ts`, `src/lib/auth/{authOptions,requireAdmin}.ts`, `src/app/api/user/me/change-password/route.ts`, `src/services/auth.service.ts`, `prisma/schema.prisma` (`User.sessionVersion`)
- **Action:**
  - Stop persisting OAuth tokens; add Google ID-token replay protection (nonce, or a single-use hash with TTL).
  - Transactional refresh rotation with reuse detection (revoke the family on reuse).
  - Add `sessionVersion` to the web JWT and to mobile access tokens. Increment it on password change, password reset and admin action, and check it in the `jwt` callback and in `requireUser`.
  - Call `revokeAllTokensForUser` on password change, password reset and account deletion.
  - Lower the mobile access-token TTL to 15 min.
  - Add a scheduled purge of expired and revoked rows.
- **Effort:** M
- **Dependencies:** BL-02. The mobile app must accept a new refresh token on every refresh; deploy the server change in backward-compatible form first.
- **Expected impact:** stolen tokens become detectable and short-lived; password change actually ends sessions.
- **Acceptance criteria:**
  - Each refresh returns a new token, and reusing an old one → 401 plus all of that user's tokens revoked.
  - After change-password, both the old web JWT and old refresh tokens → 401.
  - The same Google ID token used twice → second call 401.
  - `accounts.id_token` stays NULL after login.

### BL-04 · Unified credential-endpoint policy
- **Findings:** SEC-005, SEC-008, SEC-009, SEC-016, SEC-018, ARCH-003, REL-005 (`TRUSTED_PROXY` required)
- **Affected files:** `src/app/api/auth/**`, `src/lib/auth/authOptions.ts`, `src/utils/turnstile.ts`, `src/utils/token.ts` (delete), `src/services/{auth,user}.service.ts`, `src/validations/auth.validation.ts`, `src/components/ui/TurnstileWidget.tsx`, `src/app/(auth)/*`, `src/lib/rateLimit.ts`, `src/lib/env.ts`
- **Action:**
  1. Delete `/api/auth/login`.
  2. Add a shared `enforceCredentialPolicy` (captcha or mobile attestation, per-IP plus per-email throttling) on every login, register, reset-request, resend and Google-exchange endpoint.
  3. Return uniform responses (204/201) for existing and unknown emails, and use a dummy bcrypt compare for unknown users.
  4. Make the password required in public registration.
  5. Bind token purpose (verify vs reset), and turn the verification link into a POST confirmation page.
  6. Normalize email (`loginSchema` in `authorize`, plus `lower(email)` uniqueness).
  7. Turnstile: 3 s timeout, check hostname and action, validate the token type and max length, show a widget error state, `theme: "auto"`.
  8. Require `TRUSTED_PROXY` in production, and restrict the origin to Cloudflare.
- **Effort:** M (plus a mobile release for captcha or attestation)
- **Dependencies:** BL-09 (CI) for the policy tests.
- **Expected impact:** removes the captcha bypass, enumeration oracles and account squatting.
- **Acceptance criteria:**
  - A route-inventory test shows every POST under `src/app/api/auth/**` → 403 when the captcha mock returns false.
  - Identical status and body for existing and unknown emails on register, resend and reset.
  - A reset token is rejected by verify, and vice versa.
  - Sign-in with `User@Example.com` succeeds for `user@example.com`.
  - A Turnstile siteverify that hangs fails within 3 s.

### BL-05 · Escape email templates and constrain invites
- **Findings:** SEC-006
- **Affected files:** `src/utils/mail.ts`, `src/services/mail.service.ts`, `src/app/api/planned-collections/[id]/invite/route.ts`
- **Action:**
  - Add an `esc()` helper for every interpolated value and strip CR/LF from subjects.
  - Require a verified email for the sender.
  - Add a per-user daily cap on invites.
  - Longer term, move to React Email.
- **Effort:** S
- **Dependencies:** none
- **Expected impact:** stops phishing from the product domain.
- **Acceptance criteria:**
  - Rendering an invite whose title is `<a href=x>y</a>` produces `&lt;a href=x&gt;y&lt;/a&gt;` in the HTML.
  - The subject contains no newline.

### BL-06 · Atomic, idempotent pantry and completion writes
- **Findings:** DB-001, DB-002, DB-005, DB-006, DB-008, DB-012, CQ-004 (stale comment)
- **Affected files:**
  - Repositories: `src/repositories/{pantry,planned-cocktail,planned-collection,rating,cocktail-made-log}.repository.ts`
  - Services: `src/services/{planned-cocktail,planned-collection,pantry,favorite,user}.service.ts`
  - `src/utils/apiResponse.ts`
  - `prisma/schema.prisma` (RSVP unique, rating CHECK through SQL migration)
- **Action:**
  - Repositories accept a `tx` client.
  - Claim-then-act completions inside a single `$transaction`.
  - Atomic SQL decrements, batched per collection.
  - `Idempotency-Key` on `make`.
  - Map P2002 → 409, P2003 → 409, P2025 → 404, and retry P2034.
  - Single-statement rating aggregate plus `CHECK (rating BETWEEN 1 AND 5)`.
  - RSVP `@@unique([collectionId, userId])` with upsert.
  - `createWithCocktails` as a nested write.
  - `moveToPantry` uses atomic increment.
- **Effort:** M–L
- **Dependencies:** BL-13 (real-DB test harness in CI) is recommended first.
- **Expected impact:** correct pantry quantities and statistics under concurrency.
- **Acceptance criteria:**
  - DB tests:
    - 2 parallel decrements → final quantity = initial − 2×amount.
    - 2 parallel `complete` → exactly 1 made-log and 1 deduction.
    - 10 parallel ratings → `rating_count = 10`.
    - Duplicate favorite → 409, not 500.
    - A failure injected after the first insert of a collection create leaves no rows.

### BL-07 · Correct and efficient makeable computation
- **Findings:** DB-003, DB-010, BPERF-001
- **Affected files:** `src/repositories/cocktail.repository.ts` (`findMakeable`), `src/services/{cocktail,recommendation,smart-collection}.service.ts`, `src/lib/cache/makeable-cache.ts`, `src/lib/derivations/derivation-cache.ts`, `src/app/api/cocktails/best-rated-makeable/route.ts`
- **Action:**
  - Compute coverage in SQL (`GROUP BY … HAVING`) and hydrate only the result ids.
  - Per-user Redis hash with `DEL` invalidation, plus a global catalog version key.
  - Clamp `maxMissing` to an integer 0..10.
  - Cache recommendations.
  - Call `invalidateDerivationCache` on admin edits.
- **Effort:** L
- **Dependencies:** BL-06 (decrement API), BL-13
- **Expected impact:** complete, deterministic results; lower DB and CPU per request.
- **Acceptance criteria:**
  - With more than 800 matching cocktails, a known fully makeable cocktail is always returned.
  - The same input gives the same order.
  - A pantry write issues no `SCAN`.
  - p95 latency for `/api/cocktails/makeable` < 150 ms on a 5k-cocktail seed (measured).

### BL-08 · Safe referential actions for catalog deletes
- **Findings:** DB-004
- **Affected files:** `prisma/schema.prisma`, new migration, `src/services/ingredient.service.ts`, admin ingredient UI
- **Action:**
  - `onDelete: Restrict` on `CocktailIngredient.ingredient` and `UserPantryItem.ingredient`.
  - Return 409 with usage counts.
  - Add an admin "merge into…" flow (transactional, reusing the `simplifyIngredients` logic).
- **Effort:** S
- **Dependencies:** DB-005 mapping (P2003 → 409), part of BL-06; it can ship with a local try/catch first.
- **Expected impact:** prevents irreversible catalog and pantry data loss.
- **Acceptance criteria:**
  - Deleting an ingredient referenced by any cocktail or pantry row → 409, and no rows change.

### BL-09 · Reproducible builds and working CI
- **Findings:** REL-001, DX-002, DX-003, TEST-002, DB-009 (release-job migrations), DX-004
- **Affected files:** `package-lock.json` (new), `package.json`, `.npmrc`, `.github/workflows/*.yml`, `Dockerfile`, `scripts/deploy.sh`, `playwright.config.ts`, `docker-compose.yml`, `prisma/schema.prisma` (`directUrl`)
- **Action:**
  - Choose npm, commit the lockfile and set `packageManager`/`engines`.
  - Remove the pnpm config and `legacy-peer-deps` (resolve the peer conflicts).
  - Remove unused deps and move tooling deps to devDependencies.
  - Align Node and Postgres versions.
  - CI: `npm audit`/OSV with a high-severity gate; Dependabot/Renovate.
  - Playwright job with DB, build and `webServer`.
  - Run migrations as a release job with a pinned CLI and `directUrl`; the seed runs on demand only.
  - Compose: Redis instead of MinIO, pinned tags, bind to localhost.
- **Effort:** S–M
- **Dependencies:** none
- **Expected impact:** deterministic builds; vulnerability visibility; deploys no longer fetch packages at boot.
- **Acceptance criteria:**
  - `npm ci` succeeds in CI and Docker.
  - The audit step runs and reports.
  - The Playwright workflow passes on a PR.
  - The container starts without network access to the npm registry.

### BL-10 · Meaningful quality gates and regression suites
- **Findings:** TEST-001, TEST-003, TEST-004, TEST-005, CQ-003
- **Affected files:** `vitest.config.ts`, `tests/**`, `e2e/**`, `eslint.config.mjs`, `.github/workflows/ci.yml`
- **Action:**
  - Coverage over `src/**` with ratcheting thresholds; remove the non-existent path.
  - Response-shape test for all public and user routes.
  - Authorization-matrix test (two users) for all user-owned routes.
  - Route-inventory test (every route classified as public, user or admin, with a rate-limit policy).
  - Concurrency DB tests (see BL-06).
  - `@axe-core/playwright` on key pages in both themes.
  - `eslint-plugin-jsx-a11y`.
  - `rules-of-hooks`/`exhaustive-deps` as errors, and `--max-warnings=0`.
- **Effort:** M
- **Dependencies:** BL-09
- **Expected impact:** the regressions found in this audit fail CI.
- **Acceptance criteria:**
  - Reverting the BL-01 fix makes CI fail.
  - The axe scan reports 0 serious or critical violations on the listed pages (after BL-11/BL-14).
  - ESLint exits non-zero on any warning.

### BL-11 · Accessibility blockers
- **Findings:** A11Y-001, A11Y-002, A11Y-003, A11Y-004, A11Y-023
- **Affected files:** `src/components/StarRating.tsx`, 14 modal components (listed in A11Y-002), `src/components/ui/sonner.tsx`, `src/app/(auth)/signup/page.tsx`, `src/components/AddIngredientsModal.tsx`
- **Action:**
  - Radio-group star rating.
  - Migrate the custom modals to Radix Dialog, Sheet and AlertDialog.
  - Toast duration of 6 s or more (errors persistent), plus inline form errors.
  - Make the file input `sr-only` and labelled.
  - Replace the fake checkbox with the Radix Checkbox.
- **Effort:** M
- **Dependencies:** none
- **Expected impact:** keyboard and screen-reader users can rate, use dialogs, read errors and sign up.
- **Acceptance criteria:**
  - A keyboard-only Playwright flow can rate a cocktail.
  - In every modal: Tab stays inside, Escape closes, and focus returns to the trigger.
  - The axe `aria-dialog-name` and `button-name` checks pass.
  - Manual NVDA/VoiceOver check is recorded.

### BL-12 · Server-render catalog pages and hydrate session
- **Findings:** PERF-001, PERF-002, PERF-003, ARCH-004, ARCH-005 (partial), PERF-005
- **Affected files:** `src/app/(home)/cocktails/[id]/{page,layout}.tsx`, `src/app/(home)/ingredients/[id]/page.tsx`, `src/app/(home)/{cocktails,ingredients}/page.tsx`, `src/components/AuthProvider.tsx`, layouts, `src/hooks/{useFilters,use-offset-accumulator}.ts`
- **Action:**
  - Server Components with `cache()`-shared loaders, and client islands for the interactive parts.
  - Render the first list page on the server.
  - `useInfiniteQuery` instead of offset accumulators.
  - Pass the initial session into `SessionProvider`.
  - Shared `AppShell`.
- **Effort:** L
- **Dependencies:** BL-01 (server DTOs reused for SSR)
- **Expected impact (estimate):** detail-page LCP improves by about 1 s on mobile, recipe content is indexable, and there is no auth flicker.
- **Acceptance criteria:**
  - Server HTML of `/cocktails/[id]` contains the cocktail name and ingredients.
  - Lighthouse mobile LCP < 2.5 s on the detail page (staging).
  - One DB read per detail view.
  - No `/api/auth/session` request on guarded pages at first paint.

## P2 — Medium

### BL-13 · Real-database test harness and index/migration hygiene
- **Findings:** DB-007, DB-009, DB-014, DB-015, TEST-003
- **Affected files:** `tests/integration/db/*`, `prisma/migrations/*` (new), `prisma/schema.prisma`, CI
- **Action:**
  - Postgres test harness in CI for concurrency tests.
  - Add the backed indexes with `CONCURRENTLY` (one per migration).
  - `prisma migrate diff --exit-code` drift check.
  - squawk migration linter.
  - Later: drop redundant indexes after reviewing `pg_stat_user_indexes`.
- **Effort:** M
- **Dependencies:** BL-09
- **Acceptance criteria:**
  - Drift check passes.
  - EXPLAIN on favorites-count and the collection list uses index scans on a seeded 1M-row dataset.

### BL-14 · Accessibility semantics and contrast
- **Findings:** A11Y-005 to A11Y-014, A11Y-022
- **Action:**
  - Associated labels with `useId`.
  - Fix `FormControl` placement.
  - `role="alert"` plus `aria-invalid`/`aria-describedby`.
  - `aria-label` on icon buttons.
  - `aria-pressed` and radio semantics on toggles.
  - Text status in addition to colour.
  - Extend `CONTRAST_PAIRS` and fix failing tokens.
  - Visible focus rings.
  - Skip link, single `<main>`, labelled navs, `aria-current`.
  - Stretched-link cards.
  - Fix ARIA ids.
- **Effort:** M
- **Dependencies:** BL-10 (axe in CI)
- **Acceptance criteria:**
  - axe: 0 serious or critical violations on home, cocktails, detail, auth, pantry and planner (both themes).
  - The contrast unit test covers every text token or background pair used.

### BL-15 · Remaining security hardening
- **Findings:** SEC-007, SEC-011, SEC-012, SEC-013, SEC-014, SEC-015
- **Action:**
  - Per-user barcode confirmations; GET without side effects; barcode rate limit.
  - Re-authentication for account deletion.
  - `withPublic` defaults to `public-read`; RSVP rate limit plus CSRF; `.max()` on arrays; reject on `Content-Length`.
  - Device ownership on upsert.
  - Magic-byte check on uploads.
  - Nonce-based CSP.
- **Effort:** M
- **Acceptance criteria:**
  - A non-admin cannot change the global barcode mapping.
  - DELETE `/me` without a password → 403.
  - Every `withPublic` route has a rate-limit policy (inventory test).
  - The CSP header contains no `'unsafe-inline'` in `script-src`.

### BL-16 · Observability and operational readiness
- **Findings:** REL-002, REL-003, REL-004, REL-005, REL-006, BPERF-002
- **Action:**
  - Redis reconnect, plus a fallback metric and log in production; bounded `memStore`.
  - Sentry (or equivalent) wired into `reportError`, `withErrorHandler`, `error.tsx` and `global-error.tsx`.
  - Structured logs with request ids.
  - Liveness and readiness health endpoints.
  - Production-required env validation.
  - `fetchWithTimeout` for all outbound calls; mail outbox or retry.
  - Backup, restore and rollback runbook.
- **Effort:** M
- **Acceptance criteria:**
  - Killing Redis then restoring it brings back the shared rate limiting without a restart.
  - A thrown client error appears in error tracking.
  - Boot fails with a clear message when `NEXTAUTH_SECRET` is missing in production.
  - The runbook is reviewed and a restore is tested.

### BL-17 · Architecture: explicit API contracts and shared types
- **Findings:** ARCH-001 (complete), ARCH-002, ARCH-003, CQ-002
- **Action:**
  - zod request schemas plus `select`-based response DTOs for public and user routes; generic `QueryBuilder` restricted to admin.
  - `@mixoguide/shared` workspace package as the single source of truth for DTOs; type-checked.
  - Remove the `as unknown as` casts.
  - dependency-cruiser layering rules.
- **Effort:** L
- **Dependencies:** BL-10 response-shape tests as the safety net.
- **Acceptance criteria:**
  - No route under `withPublic`/`withUser` imports `QueryBuilder`.
  - Web and mobile compile against the same DTO types.
  - 0 `as unknown as` outside `prisma.ts`.

## P3 / P4 — Low and informational

### BL-18 · Cleanup and performance polish
- **Findings:** CQ-001, CQ-004, CQ-005, CQ-006, PERF-004, PERF-006, PERF-007, PERF-008, PERF-009, PERF-010, BPERF-003, BPERF-004, DB-011, DB-013, DB-016, A11Y-015 to A11Y-021, A11Y-024, DX-001, DX-005, SEC-019
- **Action:**
  - Delete dead files and fonts; add knip.
  - Remove `/makeable` from the sitemap and JSON-LD.
  - Fix stale comments.
  - Fix the wake-lock race and timer cleanup.
  - Strip the BOM.
  - CSS loader instead of `motion`.
  - Drop the Geist fonts.
  - Narrow and await invalidations.
  - Single makeable query.
  - Decide on the proxy (remove it, or use it for the CSP nonce).
  - `content-visibility` on cards.
  - Upload pre-check.
  - Cache the QR and OG images.
  - Compute stats aggregates in SQL with the user's timezone.
  - Type migrations (Decimal, timestamptz, citext) via expand/contract.
  - Token purge job.
  - Remaining a11y items: scroll-padding, autocomplete, chart alternatives, admin h1, `role="status"` loaders, reduced motion, target sizes, avatar alt, locale strings.
  - `git rm --cached .idea`; lint-staged.
- **Effort:** M overall (many XS items)
- **Acceptance criteria:**
  - knip reports 0 unused files and deps.
  - The sitemap contains no 404 URLs.
  - First-load JS of `/` shrinks (measured with `@next/bundle-analyzer`).
  - No `.idea` in `git ls-files`.

---

## Traceability matrix (finding → backlog)

| Finding | Backlog | Finding | Backlog | Finding | Backlog |
|---|---|---|---|---|---|
| SEC-001 | BL-01, BL-02 | DB-001 | BL-06 | A11Y-001–004 | BL-11 |
| SEC-002 | BL-01, BL-02 | DB-002 | BL-06 | A11Y-005–014 | BL-14 |
| SEC-003 | BL-02, BL-03 | DB-003 | BL-07 | A11Y-015–021 | BL-18 |
| SEC-004 | BL-03 | DB-004 | BL-08 | A11Y-022 | BL-14 |
| SEC-005 | BL-04 | DB-005 | BL-06 | A11Y-023 | BL-11 |
| SEC-006 | BL-05 | DB-006 | BL-06 | A11Y-024 | BL-18 |
| SEC-007 | BL-15 | DB-007 | BL-13 | PERF-001–003, 005 | BL-12 |
| SEC-008 | BL-04 | DB-008 | BL-06 | PERF-004, 006–010 | BL-18 |
| SEC-009 | BL-04 | DB-009 | BL-09, BL-13 | BPERF-001 | BL-07 |
| SEC-010 | BL-04* | DB-010 | BL-07 | BPERF-002 | BL-16 |
| SEC-011 | BL-15 | DB-011 | BL-18 | BPERF-003–004 | BL-18 |
| SEC-012 | BL-01, BL-15 | DB-012 | BL-06 | ARCH-001 | BL-01, BL-17 |
| SEC-013 | BL-15 | DB-013 | BL-18 | ARCH-002–003 | BL-17, BL-04 |
| SEC-014 | BL-15 | DB-014 | BL-13 | ARCH-004–005 | BL-12 |
| SEC-015 | BL-15 | DB-015 | BL-13 | CQ-001–006 | BL-18, BL-10, BL-17 |
| SEC-016 | BL-04 | DB-016 | BL-03, BL-18 | REL-001 | BL-09 |
| SEC-017 | BL-01 | TEST-001, 003–005 | BL-10, BL-13 | REL-002–006 | BL-16 |
| SEC-018 | BL-04 | TEST-002 | BL-09 | DX-001, DX-005 | BL-18 |
| SEC-019 | BL-03 | DX-002–004 | BL-09 | | |

\* SEC-010 (session cookie name on HTTPS) belongs with BL-04, because it lives in the same verify/reset routes. Acceptance criterion: after clicking the verification link on HTTPS staging, `/api/auth/session` returns the user.
