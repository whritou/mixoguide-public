# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Why: Install all deps (prod + dev) needed for the build in an isolated layer.
# The final image won't carry this bloat.
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --include=dev

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
# Why: Run `next build` in a clean layer. Output goes to `.next/standalone`
# which contains only what's needed to run — no source, no dev deps.
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Why: The local Prisma client targets your dev OS. The container needs a fresh
# generate targeting linux-musl (Alpine).
RUN npx prisma generate

# Why: NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_DARK_MODE=
ARG NEXT_PUBLIC_BASE_URL=
ENV NEXT_PUBLIC_DARK_MODE=$NEXT_PUBLIC_DARK_MODE
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Why: Compile seed scripts to plain JS at build time so the runner stage
# doesn't need tsx, esbuild, or any dev dependencies at runtime.
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
      prisma/seeder/simplifyIngredients.ts

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
# Why: Copy only the standalone output (~50 MB) — no full build tree.
# Results in a much smaller image and faster deploys.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Why: Running as root inside a container is a security risk.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + generated client so runtime migrations work
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled seed scripts (plain JS, no tsx/esbuild needed at runtime)
COPY --from=builder /app/dist/prisma ./dist/prisma

# Copy the deploy entrypoint
COPY scripts/deploy.sh ./scripts/deploy.sh
RUN chmod +x ./scripts/deploy.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Why: Run migrations + seed before starting the app, all in the same container
# with the same env — eliminates Coolify post-deploy timing issues entirely.
CMD ["sh", "scripts/deploy.sh"]
