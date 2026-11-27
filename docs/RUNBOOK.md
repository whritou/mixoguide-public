# MixoGuide operations runbook

Scope: the Next.js web app + API (Docker image built from `Dockerfile`), PostgreSQL, and Redis.
The mobile app ships separately (see `mobile/`).

Items marked **[ ]** are checklist items that must be verified for your hosting setup. Nothing
in this document should be read as "this is already in place" unless it is ticked.

---

## 1. Environment variable checklist

Validated at boot by `src/lib/env.ts`. In production (`NODE_ENV=production`, outside `next build`)
the process refuses to start when a **required** variable is missing.

| Variable | Required in prod | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Runtime connection. If it points at a transaction-mode pooler (PgBouncer / Supabase :6543), add `pgbouncer=true` and set `connection_limit` / `pool_timeout` explicitly. |
| `DIRECT_URL` | for migrations | Direct (non-pooled) connection used only by `scripts/release-migrate.sh`. |
| `NEXTAUTH_SECRET` | yes | ≥ 32 random bytes (`openssl rand -base64 32`). Rotating it signs everyone out (see §7). |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_BASE_URL` | recommended | Public origin, e.g. `https://mixoguide.com`. `NEXT_PUBLIC_*` are inlined at **build** time (Docker build args). |
| `RESEND_API_KEY` | yes | Transactional mail. |
| `TURNSTILE_SECRET_KEY` | yes | Server-side captcha verification. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes (build arg) | Captcha widget; build-time. |
| `TRUSTED_PROXY` | yes | `cloudflare`, `x-forwarded-for` or `x-real-ip`. Wrong value = every client shares one rate-limit bucket or IPs are spoofable. |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_USERNAME` / `REDIS_PASSWORD` | strongly recommended | Without Redis, rate limits are per-instance in-memory (see §8). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | if Google sign-in is enabled | |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | if uploads are enabled | |
| `ANDROID_CERT_SHA256_FINGERPRINTS` | for Android app links | |
| `LOG_LEVEL` | no | `debug`/`info`/`warn`/`error` (default `info`). |
| `RUN_MIGRATIONS_ON_BOOT` / `RUN_SEED` | no | Escape hatches, default off (see §3). |
| `SKIP_ENV_VALIDATION=1` | no | Emergency bypass of the production-required check. Do not leave it on. |

- **[ ]** Every required variable is set in the hosting platform (and not only in a local `.env`).
- **[ ]** Secrets are stored in the platform's secret store, not in the image or the repo.

---

## 2. Health endpoints

| Endpoint | Use | Behaviour |
|---|---|---|
| `GET /api/health/live` | container liveness (Docker `HEALTHCHECK`) | Always `200` while the process serves requests. Never restart on DB problems. |
| `GET /api/health/ready` | load balancer readiness / uptime monitor | `SELECT 1` on the DB and `PING` on Redis (when configured), 2 s timeout each. `200 {status:"ok"}` or `503` with `db`/`redis` = `ok`/`error`/`skipped`. |
| `GET /api/health` | legacy alias | Same as `/ready`. |

Every API response carries `x-request-id` (incoming value is propagated when well-formed). Use it to
find the matching structured log line (`"requestId": "..."`).

---

## 3. Deploy

The image does **not** run migrations or seeds on start (`scripts/deploy.sh` only `exec node server.js`).

1. CI is green on the commit (lint, type-check, unit/integration, audit, Playwright).
2. Build the image from the commit (`npm ci` uses `package-lock.json`; no registry access at runtime):
   ```sh
   docker build \
     --build-arg NEXT_PUBLIC_BASE_URL=https://mixoguide.com \
     --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=... \
     -t mixoguide:<git-sha> .
   ```
   Tag images with the git SHA; keep at least the last 5 for rollback.
3. **Pre-deploy snapshot** (see §5) if the release contains a migration.
4. Run the **release migration job** (§4) once, with the new image.
5. Roll out the new image. Wait for `/api/health/ready` to return `200` on the new instances.
6. Smoke test: home page, `/cocktails`, sign-in, one authenticated API call. Watch error logs for 15 min.

Single-replica fallback: setting `RUN_MIGRATIONS_ON_BOOT=1` makes `deploy.sh` run the release job
before starting. Do not use it with more than one replica (every replica would run it), and remember
that a slow migration then delays readiness.

---

## 4. Release migration job

```sh
docker run --rm --env-file prod.env mixoguide:<git-sha> sh scripts/release-migrate.sh
```

- Uses the Prisma CLI version pinned by `package-lock.json` that is baked into the image
  (`node node_modules/prisma/build/index.js migrate deploy`).
- Uses `DIRECT_URL` when set (migrations through a transaction-mode pooler are unsupported).
- `RUN_SEED=1` additionally runs the light seed (`dist/prisma/seeder/seed_light.js`). Seed **on demand
  only** (first install, new reference data); it is not part of normal deploys.
- In Coolify: configure it as the *pre-deployment command*; elsewhere: a one-off job/task in CI/CD.
- If the job fails, **do not roll out** the new image. The running version keeps serving. Inspect
  `_prisma_migrations` (`finished_at IS NULL` / `logs`) and see §6.

### Migration policy (expand / contract)

Every migration must be compatible with the version currently running (N) *and* the version being
deployed (N+1), so either can run against the migrated schema and image rollback is always possible:

1. **Expand** (release N+1): add nullable columns / new tables / new indexes (`CREATE INDEX CONCURRENTLY`
   in a hand-written migration for large tables). Backfill in batches.
2. Deploy code that writes both shapes and reads the new one.
3. **Contract** (release N+2 or later): drop old columns/tables, add `NOT NULL` / constraints.

Never combine a destructive change (drop/rename/type change) with the code change that stops using it.

---

## 5. Backups, PITR and restore test

- **[ ]** Automated daily backups are enabled for the production database (provider: ______).
- **[ ]** Point-in-time recovery (WAL archiving) is enabled; retention ≥ 7 days.
- **[ ]** Target RPO (max data loss): ____ ; target RTO (max downtime): ____ .
- **[ ]** Backups are stored in a different account/region than the primary.
- **[ ]** A pre-deploy snapshot is taken before every release that contains a migration:
  ```sh
  pg_dump --format=custom --no-owner --dbname="$DIRECT_URL" --file="pre-<git-sha>.dump"
  ```
- **[ ]** Restore test performed (date: ____, by: ____, duration: ____). Repeat quarterly:
  1. Restore the latest backup / a PITR timestamp into a **new** database (never over production).
     ```sh
     createdb mixoguide_restore_test
     pg_restore --no-owner --dbname=mixoguide_restore_test pre-<git-sha>.dump
     ```
  2. Point a staging instance at it (`DATABASE_URL`), run `prisma migrate status`, check
     `/api/health/ready`, sign in with a test account, spot-check row counts of `users`, `cocktails`,
     `pantry` tables against production.
  3. Record the duration as the measured RTO. Drop the test database.
- **[ ]** Redis holds only rate-limit counters and caches: no backup needed (loss = counters reset).

---

## 6. Rollback

**Application only (no migration, or expand-only migration):**
1. Redeploy the previous image tag (`mixoguide:<previous-sha>`). No DB action needed because migrations
   are expand/contract compatible.
2. Confirm `/api/health/ready` and smoke tests.

**Failed migration:**
1. The running version keeps serving (the job runs before rollout). Do not deploy the new image.
2. Inspect the failed row in `_prisma_migrations`. Fix the cause, then either
   `prisma migrate resolve --rolled-back <migration>` (if nothing was applied — Postgres DDL is
   transactional per migration file) and re-run the job, or write a forward-fix migration.

**Destructive migration already applied and data lost:**
1. Put the app in maintenance (scale to 0 or block traffic at the proxy).
2. Restore the pre-deploy snapshot or PITR to just before the release into a new database (§5),
   validate it, then switch `DATABASE_URL`/`DIRECT_URL` to it, and redeploy the previous image.
3. Write a post-mortem; data written between the snapshot and the switch must be reconciled manually.

---

## 7. Incident response: credential / secret leak

Triage first: which secret leaked, since when, and where (repo history, logs, CI, image)?
Record a timeline. Then, as applicable:

1. **`NEXTAUTH_SECRET`** — generate a new value, update it in the platform, redeploy. All web
   sessions and all signed tokens (verify/reset links) become invalid: users must sign in again.
2. **Revoke all mobile refresh tokens and server-side sessions** (table names per `prisma/schema.prisma`):
   ```sql
   -- inspect first
   SELECT count(*) FROM refresh_tokens WHERE revoked_at IS NULL;
   BEGIN;
   UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;
   DELETE FROM sessions;                      -- NextAuth DB sessions, if used
   DELETE FROM mobile_oauth_exchange_codes;   -- pending one-time OAuth exchange codes
   COMMIT;
   ```
   Mobile access tokens stay valid until they expire (short-lived); rotating `NEXTAUTH_SECRET`
   invalidates them immediately if they are signed with it.
3. **Null stored OAuth provider tokens** (NextAuth `accounts` table):
   ```sql
   UPDATE accounts SET access_token = NULL, refresh_token = NULL, id_token = NULL;
   ```
4. **Force password resets** if password hashes or the DB leaked: invalidate passwords (e.g. set a
   `password_reset_required` flag or replace hashes with an unusable value) and email all affected users
   a reset link. Revoke outstanding verification/reset tokens:
   ```sql
   DELETE FROM verification_tokens;
   ```
5. **Third-party keys** — rotate at the provider, then update the platform and redeploy:
   `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `AUTH_GOOGLE_SECRET`, `CLOUDINARY_API_SECRET`,
   `REDIS_PASSWORD`, database password (update `DATABASE_URL` and `DIRECT_URL`).
6. **Purge CDN / proxy caches** (Cloudflare: *Caching → Purge Everything*) so cached responses that may
   contain leaked data are dropped.
7. If the secret was committed: rotate first, then remove it from history (`git filter-repo`) and run a
   secret scanner (gitleaks) over the full history. Rotation is what matters; history rewriting is
   hygiene.
8. Review logs (by `requestId`) for use of the leaked credential during the exposure window. Assess
   whether user notification / regulatory disclosure (GDPR: 72 h) is required.

---

## 8. Redis outage behaviour

- The client reconnects automatically with backoff (200 ms × attempt, capped at 5 s); no restart is
  needed after Redis comes back. State changes are logged (`redis.ready`, `redis.error`,
  `redis.reconnecting`, `redis.close`).
- While Redis is down:
  - Rate limiting falls back to a **per-instance in-memory** store (bounded to 10k keys, expired keys
    swept every minute). With N instances, effective limits are N× looser. A
    `rateLimit.memory_fallback` warning is logged at most once per minute per instance.
  - The makeable cache is bypassed (more DB load, slower makeable pages).
  - `/api/health/ready` returns `503` with `redis: "error"`. Decide per platform whether readiness
    failure should drain traffic; if Redis is non-critical for you, point the load balancer at
    `/api/health/live` instead and alert on `/ready`.
- **[ ]** An alert fires on `rateLimit.memory_fallback` or `redis.error` log lines in production.

---

## 9. Observability checklist

- **[ ]** Logs are collected (one JSON object per line: `ts`, `level`, `msg`, `requestId`, context).
- **[ ]** Error tracking is wired via `setErrorReporter()` in `src/utils/reportError.ts`
  (e.g. Sentry `captureException`), including `error.tsx` / `global-error.tsx`.
- **[ ]** Uptime monitor on `/api/health/ready` with alerting.
- **[ ]** Alert on 5xx rate and on `level:"error"` log volume.

## 10. Edge hardening checklist

These protections live in front of the app (reverse proxy / Cloudflare) and are not enforced by Next.js itself:

- [ ] **Request body size limit** of ~6 MB on `/api/upload` and ~256 KB on every other `/api/*` route (e.g. nginx `client_max_body_size`, Traefik `buffering.maxRequestBodyBytes`, or a Cloudflare WAF rule). Route handlers parse JSON bodies without a size cap, and the zod 3 advisory in `audit-allowlist.json` relies on this limit.
- [ ] **Origin locked to the proxy** when `TRUSTED_PROXY=cloudflare`: accept traffic only from Cloudflare IP ranges or use authenticated origin pulls, otherwise `cf-connecting-ip` can be spoofed and per-IP rate limits bypassed.
- [ ] **`MOBILE_CAPTCHA_REQUIRED=1`** once a mobile build that sends `x-turnstile-token` on login/register is live (until then mobile credential endpoints rely on per-IP + per-account rate limits only).

## 11. Accepted dependency advisories

`scripts/audit-gate.mjs` (CI) fails on any high/critical production advisory that is not listed in `audit-allowlist.json`. Each entry has a reason and an expiry date; an expired entry fails CI so the risk is re-reviewed. Current entries require major upgrades (Auth.js v5, Prisma 7, zod 4).
