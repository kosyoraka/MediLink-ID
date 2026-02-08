# MediLink ID / HealthConnect ID

## Project Summary

MediLink is a smart patient portal and medical ID platform that centralizes healthcare information across providers. It enables patients to manage medical records, appointments, medications, and emergency health profiles in one secure system, while also supporting instant emergency access via QR/NFC-style workflows.

The platform includes:

- A patient-facing portal
- A provider-facing portal
- A shared backend API
- A shared PostgreSQL database hosted on Google Cloud SQL

All services run locally using Docker Compose, while all developers connect to the same Cloud SQL database via Cloud SQL Proxy to ensure consistent data across the team.

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
- Shared Cloud SQL database (single source of truth)

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
- PostgreSQL (Cloud SQL)

### Infrastructure
- Docker
- Docker Compose
- Google Cloud SQL
- Cloud SQL Proxy
- pgAdmin
- GitHub

---

## Getting Started (Local Development with Cloud SQL)

### ⚠️ Important

MediLink no longer uses a local PostgreSQL container for development.

All developers connect to the shared Google Cloud SQL database using Cloud SQL Proxy.

---

## 1. Prerequisites

Before starting, install:

- Docker Desktop
- Git
- Google Cloud SDK (gcloud)
- Cloud SQL Proxy
- Node.js v18+ (optional, Docker recommended)

---

## 2. Clone the Repository
```bash
git clone <REPO_URL>
cd backend
```

---

## 3. Authenticate with Google Cloud

Ask Kennie/Kosy to add you to the GCP project.

Then run:
```bash
gcloud auth login
gcloud config set project medilink-dev-486803
```

---

## 4. Start Cloud SQL Proxy (Required)

In a separate terminal:
```bash
./cloud-sql-proxy \
  --port 5433 \
  medilink-dev-486803:northamerica-northeast2:medilink-dev-db
```

This exposes the shared database at:
```
localhost:5433
```

Leave this running while you develop.

---

## 5. Create Environment File

Inside `backend/`, create `.env.docker`:
```env
DATABASE_URL="postgresql://medilink_app:medilinkapp@host.docker.internal:5433/medilink?schema=public"
SHADOW_DATABASE_URL="postgresql://medilink_app:medilinkapp@host.docker.internal:5433/medilink_shadow?schema=public"

PORT=4000
NODE_ENV=development
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

Notes:

- `.env.docker` is intentionally not committed
- Ask Kennie for DB credentials if needed
- Never commit secrets

---

## 6. Run the Application Stack
```bash
docker compose up -d --build
```

This starts:

- Backend API
- Patient UI
- Provider UI
- pgAdmin

(No local database container is started)

---

## 7. Access the Running Services

- **Patient Portal:** http://localhost:5173
- **Provider Portal:** http://localhost:5174
- **Backend API:** http://localhost:4000/health
- **pgAdmin:** http://localhost:5050

---

## 8. Prisma Migrations (IMPORTANT)

Migrations are already applied on Cloud SQL.

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

## 9. pgAdmin Setup (Optional)

Login:

- Email: `admin@medilink.com`
- Password: `admin`

Create a server:

- Host: `host.docker.internal`
- Port: `5433`
- Database: `medilink`
- Username: `medilink_app`
- Password: (ask Kennie)

You should see live production-like data (e.g., 24 hospitals).

---

## Database Rules (Read Carefully)

- Cloud SQL is the single source of truth
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

- Cloud SQL is the database
- Cloud SQL Proxy is required
- Do not commit `.env` files
- Do not reset the database
- One person manages migrations
- If unsure → ask before running DB commands


## Troubleshooting

### Docker Container Already in Use

**Problem:** You get an error like `error: response container being used by another container` when trying to start your containers.

**Solution:** Docker won't let you start a container if one with the same name is already running (or stuck in a stopped state).

**Steps:**

1. **Stop and clean up existing containers**
   ```bash
   docker compose down --remove-orphans
   ```

2. **Check what container is blocking you** (optional, but helpful for debugging)
   ```bash
   docker ps -a --filter "name=medilink_provider_web"
   ```

3. **Force-remove the container**
   ```bash
   docker rm -f medilink_provider_web
   ```

   If that container name doesn't exist, use the ID from the error message instead:
   ```bash
   docker rm -f f0d17db952d3516f1c1e6d19a0208cc381f032f45530997194d63910701f8b4d
   ```

4. **Restart your containers**
   ```bash
   docker compose up -d --build
   ```

**Why this happens:** Sometimes containers get stuck or don't clean up properly, leaving a "ghost" container that prevents you from starting a new one with the same name. The `--remove-orphans` flag helps, but occasionally you need to manually force-remove the offending container.

## Important: Cloud SQL Proxy

**One rule:** Cloud SQL Proxy must be running anytime you run the stack. If the proxy isn't running, you'll see connection errors.

Make sure it's started before you bring up your containers.

### Database Connection Errors (P1001)

**Problem:** You see `P1001` or "can't reach database" errors.

**Solution:**

1. **Check if Cloud SQL Proxy is running**
   ```bash
   lsof -i :5433
   ```
   If nothing shows up, start the proxy.

2. **Restart the stack**
   ```bash
   docker compose down --remove-orphans
   docker compose up -d --build
   ```

### Docker Container Already in Use

**Problem:** You get an error like `error: response container being used by another container` when trying to start your containers.

**Solution:** Docker won't let you start a container if one with the same name is already running (or stuck in a stopped state).

```bash
docker compose down --remove-orphans
docker rm -f medilink_provider_web 2>/dev/null || true
docker compose up -d --build
```

This cleans up any stuck containers and brings everything back up. The `2>/dev/null || true` part just means "don't error out if the container doesn't exist."