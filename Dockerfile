# syntax=docker/dockerfile:1
# Node version must match .nvmrc / package.json "engines" (22.x).

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Install all deps (prod + dev) from the committed lockfile. `npm ci` fails if
# package.json and package-lock.json disagree, which keeps builds reproducible.
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci --include=dev

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client for linux-musl (Alpine).
RUN npx prisma generate

# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_DARK_MODE=
ARG NEXT_PUBLIC_BASE_URL=
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_DARK_MODE=$NEXT_PUBLIC_DARK_MODE
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Compile seed scripts to plain JS so the runner never needs tsx/esbuild.
RUN npx tsc \
      --outDir dist \
      --rootDir . \
      --module commonjs \
      --target es2020 \
      --esModuleInterop true \
      --skipLibCheck true \
      --resolveJsonModule true \
      prisma/seeder/seed_light.ts \
      prisma/seeder/seedCocktailDB.ts \
      prisma/seeder/simplifyIngredients.ts \
      prisma/seeder/purge-expired-tokens.ts

# Bundle the lockfile-pinned Prisma CLI (+ its dependency closure and the
# linux-musl schema engine) for the release migration job. The container never
# downloads packages at runtime.
RUN node scripts/bundle-prisma-cli.mjs /app/prisma-cli

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema/migrations + generated client (query engine)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Pinned Prisma CLI for `scripts/release-migrate.sh` (merged into node_modules)
COPY --from=builder /app/prisma-cli/node_modules ./node_modules

# Compiled seed scripts (run on demand only: RUN_SEED=1 or a one-off job)
COPY --from=builder /app/dist/prisma ./dist/prisma

COPY scripts/deploy.sh scripts/release-migrate.sh ./scripts/
RUN chmod +x ./scripts/deploy.sh ./scripts/release-migrate.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Liveness only: readiness (/api/health/ready) is for the load balancer.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/live >/dev/null || exit 1

# The app process only. Migrations run as a separate release job:
#   docker run --rm --env-file prod.env <image> sh scripts/release-migrate.sh
CMD ["sh", "scripts/deploy.sh"]
