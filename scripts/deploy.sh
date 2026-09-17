#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
npx prisma@6.19.0 migrate deploy

echo "▶ Running seed..."
node dist/prisma/seeder/seed_light.js

echo "▶ Starting Next.js..."
exec node server.js