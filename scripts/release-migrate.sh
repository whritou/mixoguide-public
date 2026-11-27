#!/bin/sh
# One-off release / pre-deploy job: apply pending Prisma migrations.
#
# Run it ONCE per release, before the new app version receives traffic, e.g.
#   docker run --rm --env-file prod.env <image> sh scripts/release-migrate.sh
# or as the Coolify "pre-deployment command" / a CI job with the same image.
#
# Uses the Prisma CLI pinned by package-lock.json that is baked into the image
# (no `npx prisma@x` registry download). Migrations must be expand/contract
# compatible with the currently running version (see docs/RUNBOOK.md).
#
# Env:
#   DATABASE_URL  required
#   DIRECT_URL    recommended: direct (non-pooled) connection used for migrations.
#                 When set, it overrides DATABASE_URL for this process only, because
#                 `migrate deploy` is not supported through a transaction-mode pooler.
#   RUN_SEED=1    also run the idempotent light seed after migrating.
set -eu

cd "$(dirname "$0")/.."

if [ -n "${DIRECT_URL:-}" ]; then
  DATABASE_URL="$DIRECT_URL"
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "release-migrate: DATABASE_URL (or DIRECT_URL) is required" >&2
  exit 1
fi

if [ -f node_modules/prisma/build/index.js ]; then
  PRISMA="node node_modules/prisma/build/index.js"
elif [ -x node_modules/.bin/prisma ]; then
  PRISMA="node_modules/.bin/prisma"
else
  echo "release-migrate: local Prisma CLI not found (expected node_modules/prisma)" >&2
  exit 1
fi

echo "release-migrate: prisma migrate deploy"
$PRISMA migrate deploy --schema prisma/schema.prisma

if [ "${RUN_SEED:-0}" = "1" ]; then
  if [ -f dist/prisma/seeder/seed_light.js ]; then
    echo "release-migrate: running light seed (RUN_SEED=1)"
    node dist/prisma/seeder/seed_light.js
  else
    echo "release-migrate: RUN_SEED=1 but dist/prisma/seeder/seed_light.js is missing" >&2
    exit 1
  fi
fi

echo "release-migrate: done"
