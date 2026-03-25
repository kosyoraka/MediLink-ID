# MediLink ID / HealthConnect ID

## Project Summary

MediLink is a patient portal and provider portal backed by a shared Express/Postgres API. The current working stack on this branch uses Supabase Postgres as the shared database and runs locally through Docker Compose.

The platform includes:

- A patient-facing portal
- A provider-facing portal
- A shared backend API
- A shared Supabase PostgreSQL database

## Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL

### Infrastructure
- Supabase
- Docker
- Docker Compose
- pgAdmin
- GitHub

## Current Status

This branch is on the Supabase path now.

- Docker/local backend config no longer depends on the Cloud SQL proxy
- Supabase is the active database target for local development
- The latest GCP dataset has been migrated into Supabase
- Google sign-in is wired locally when `GOOGLE_CLIENT_ID` is provided
- Patient onboarding now checks saved backend data instead of relying only on local browser flags

## Prerequisites

Install:

- Docker Desktop
- Git
- Node.js 18+ if you want to run commands outside Docker

## Environment Setup

The backend uses [`backend/.env.docker`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/.env.docker) for Docker-based local runs.

Start from the tracked template:

[`backend/.env.supabase.example`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/.env.supabase.example)

Required values:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=change_me

DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres"
SHADOW_DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
DATABASE_SSL_REJECT_UNAUTHORIZED=false

FRONTEND_BASE_URL="http://localhost:5173"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174"

OPENAI_API_KEY=""
GOOGLE_CLIENT_ID=""
```

Notes:

- `DATABASE_URL` should use the Supabase pooler connection string
- `SHADOW_DATABASE_URL` should use the direct database connection
- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` is currently used for local Docker connectivity to Supabase
- `GOOGLE_CLIENT_ID` is required if you want Google sign-in locally
- Do not commit real secrets

## Supabase Setup

If the project is not already prepared, run the SQL in:

[`backend/supabase_setup.sql`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/supabase_setup.sql)

This enables `pgcrypto`, which the schema expects.

## Running The System

From:

[`backend`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend)

run:

```bash
docker compose up -d --build
```

This starts:

- API on `http://localhost:4000`
- Patient app on `http://localhost:5173`
- Provider app on `http://localhost:5174`
- pgAdmin on `http://localhost:5050`

Useful commands:

```bash
docker compose ps
docker compose logs -f api
docker compose down
```

## Local URLs

- Patient portal: `http://localhost:5173`
- Provider portal: `http://localhost:5174`
- Backend API: `http://localhost:4000`
- pgAdmin: `http://localhost:5050`

## Database Migration Utilities

The backend includes migration/report scripts in [`backend/package.json`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/package.json):

```bash
npm run gcp:report
npm run gcp:migrate
```

What they do:

- `gcp:report` compares the live GCP source database against Supabase
- `gcp:migrate` copies the live GCP dataset into Supabase

These scripts were used to bring over the newer data set, including:

- patients and profiles
- emergency data
- appointments
- messaging
- provider connections
- documents
- health summaries
- medications and conditions

Use them only if you intentionally need to compare or re-run migration work.

## Prisma Guidance

Be careful with Prisma commands against the shared Supabase database.

Safe verification command:

```bash
docker compose exec api npx prisma migrate status
```

Do not run these casually against the shared database:

- `prisma migrate dev`
- `prisma migrate reset`
- `prisma db push`

## pgAdmin

pgAdmin runs locally at `http://localhost:5050`.

Default login:

- Email: `admin@medilink.com`
- Password: `admin`

To connect pgAdmin to Supabase, use the direct host from your Supabase project:

- Host: `db.<project-ref>.supabase.co`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`
- Password: your Supabase database password

## Important Notes

- You do not need the GCP Cloud SQL proxy command for normal app usage on this branch
- You only need the old GCP connection if you plan to inspect or re-migrate from the old source database
- Supabase is the current shared source of truth for this branch
