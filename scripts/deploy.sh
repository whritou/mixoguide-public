#!/bin/sh
# Container entrypoint: start the app. Migrations are NOT run here by default;
# they run once per release via scripts/release-migrate.sh (see docs/RUNBOOK.md).
#
# Escape hatches (single-replica setups only; every replica would run them):
#   RUN_MIGRATIONS_ON_BOOT=1  run the release migration job before starting
#   RUN_SEED=1                run the idempotent light seed before starting
set -eu

cd "$(dirname "$0")/.."

if [ "${RUN_MIGRATIONS_ON_BOOT:-0}" = "1" ]; then
  echo "deploy: RUN_MIGRATIONS_ON_BOOT=1 -> running release migrations"
  sh scripts/release-migrate.sh   # also seeds when RUN_SEED=1
elif [ "${RUN_SEED:-0}" = "1" ]; then
  echo "deploy: RUN_SEED=1 -> running light seed"
  node dist/prisma/seeder/seed_light.js
fi

echo "deploy: starting Next.js"
exec node server.js
