# MediLink ID / HealthConnect ID

## Project Summary

MediLink is a smart patient portal and medical ID platform that centralizes healthcare information across providers. It enables patients to manage medical records, appointments, medications, and emergency health profiles in one secure system, while also supporting instant emergency access via QR/NFC-style workflows.

The platform includes:

- A patient-facing portal
- A provider-facing portal
- A shared backend API
- A shared PostgreSQL database

All services run locally using Docker Compose. The current production/dev database migration to Supabase is being prepared in a dedicated branch; until that migration is complete, do not assume the repo is already running on Supabase.

---

## Problem Statement

### Fragmented Medical Records

Patients are forced to manage healthcare information across multiple disconnected systems such as family doctors, specialists, and walk-in clinics.

**Our Solution:**  
A centralized patient portal that aggregates records, appointments, and health data in one secure place.

---

### Emergency Access to Health Information

In emergency situations, critical health information (allergies, chronic conditions, medications) is often unavailable or delayed.

**Our Solution:**  
Instant access to emergency profiles through QR/NFC-style access, enabling faster and safer care delivery.

---

## Key Features

- Centralized patient health records
- Emergency health profile with controlled sharing
- Patient and provider portals
- Secure authentication
- AI-powered symptom guidance (non-diagnostic)
- Prisma-managed PostgreSQL database
- Dockerized local development
- Shared PostgreSQL database (single source of truth)

---

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)

### Infrastructure
- Docker
- Docker Compose
- Google Cloud SQL or Supabase during migration
- pgAdmin
- GitHub

---

## Supabase Migration Prep

### ⚠️ Important

This repo now includes the files needed to move the backend to Supabase:

- [`backend/.env.supabase.example`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/.env.supabase.example)
- [`backend/supabase_setup.sql`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/supabase_setup.sql)

But the migration is not complete until you:

1. create the Supabase project / confirm access
2. update the existing schema/data there
3. point `DATABASE_URL` and `SHADOW_DATABASE_URL` to Supabase
4. remove the remaining local Cloud SQL assumptions from your runtime setup

## Getting Started (Local Development with Supabase)

### 1. Prerequisites

Before starting, install:

- Docker Desktop
- Git
- Node.js v18+ (optional, Docker recommended)

---

## 2. Clone the Repository
```bash
git clone <REPO_URL>
cd MedilinkidPatientPrototype
```

---

### 2. Get Supabase Access

Ask the team for:

- The Supabase project reference
- The database password
- Any required Google sign-in client IDs if you need OAuth locally

### 3. Enable Required Extensions

In the Supabase SQL editor, run:
```bash
-- paste backend/supabase_setup.sql
```

This ensures `pgcrypto` is enabled before Prisma touches the schema.

---

### 4. Create Environment File

Inside `backend/`, create `.env.docker` from [`backend/.env.supabase.example`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/.env.supabase.example):
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=change_me

DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
SHADOW_DATABASE_URL="postgresql://postgres.<project-ref>:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"

OPENAI_API_KEY=YOUR_OPENAI_API_KEY
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

Notes:

- `.env.docker` is intentionally not committed
- Use the Supabase transaction pooler URL for `DATABASE_URL`
- Use the direct database host for `SHADOW_DATABASE_URL`
- Never commit secrets
- Google sign-in remains optional and separate from the database provider

---

### 5. Run the Application Stack
```bash
docker compose up -d --build
```

This starts:

- Backend API
- Patient UI
- Provider UI
- pgAdmin

(No local database container is started once Supabase is the active database)

---

### 6. Access the Running Services

- **Patient Portal:** http://localhost:5173
- **Provider Portal:** http://localhost:5174
- **Backend API:** http://localhost:4000/health
- **pgAdmin:** http://localhost:5050

---

### 7. Prisma Migrations (IMPORTANT)

Migrations should be coordinated carefully against the shared Supabase database.

Run only to verify:
```bash
docker compose exec api npx prisma migrate status
```

🚫 **Do NOT run:**

- `prisma migrate dev`
- `prisma migrate reset`
- `prisma db push`

Unless explicitly instructed.

---

### 8. pgAdmin Setup (Optional)

Login:

- Email: `admin@medilink.com`
- Password: `admin`

Create a server:

- Host: `db.<project-ref>.supabase.co`
- Port: `5432`
- Database: `postgres`
- Username: `postgres.<project-ref>`
- Password: (ask the team)

You should then see the shared Supabase schema and team data.

---

## Database Rules (Read Carefully)

- Supabase Postgres becomes the single source of truth after migration is completed
- All developers see the same data
- Prisma migrations are controlled
- Never drop schemas or reset the DB
- No local Postgres containers

---

## Current Project Status

MediLink is in active MVP development.

Current functionality:

- Authentication (patients & staff)
- Patient profiles
- Emergency health profiles
- Appointment management
- Provider portal (simulated)
- AI-powered symptom guidance foundation

---

## Team

- Oloruntimilehin (Timi) Olajonlu
- Kennie Oraka
- Kosy Oraka
- Elysprit (Elyse) Dhaliwal
- Andrew Tissi
- Amira Mohamed

---

## Development Rules (Non-Negotiable)

- When the Supabase migration is completed, `.env.docker` should use the Supabase connection strings
- Do not commit `.env` files
- Do not reset the database
- One person manages migrations
- If unsure → ask before running DB commands
