# # #!/bin/sh
# # set -e

# # echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
# # until nc -z "$DB_HOST" "$DB_PORT"; do
# #   sleep 1
# # done
# # echo "Postgres is up."
# # sleep 1

# # if [ -f "prisma/schema.prisma" ]; then
# #   echo "Running prisma generate..."
# #   npx prisma generate

# #   echo "Applying migrations..."
# #   npx prisma migrate deploy
# # fi

# # echo "Starting API..."
# # exec npm run dev
# #!/bin/sh
# set -e

# echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
# until nc -z "$DB_HOST" "$DB_PORT"; do
#   sleep 1
# done
# echo "Postgres is up."

# # Always safe
# echo "Running prisma generate..."
# npx prisma generate || true

# # ❌ DO NOT run migrate deploy here (it will crash on non-empty DB)
# # npx prisma migrate deploy

# echo "Starting API..."
# npm run dev
#!/bin/sh
set -e

echo "Starting API (production)..."

# Run prisma generate at runtime (Cloud Run env vars available)
npx prisma generate || true

exec npm start
