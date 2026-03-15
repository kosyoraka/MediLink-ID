#!/bin/sh
set -e

echo "Running prisma generate..."
npx prisma generate || true

# ❌ DO NOT run migrate deploy here (it will crash on non-empty DB)
# npx prisma migrate deploy

echo "Starting API..."
exec npm run dev
