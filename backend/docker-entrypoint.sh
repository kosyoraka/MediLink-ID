#!/bin/sh
set -e

echo "Running prisma generate..."
npx prisma generate || true

# Keep local Docker development on the hot-reload server, but allow
# production hosts to run the compiled app with the same entrypoint.
if [ "$NODE_ENV" = "production" ]; then
  echo "Building API for production..."
  npm run build

  echo "Starting API in production mode..."
  exec npm start
fi

echo "Starting API in development mode..."
exec npm run dev
