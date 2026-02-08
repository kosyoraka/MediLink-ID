# MediLink ID / HealthConnect ID

## Project Summary

MediLink is a smart patient portal and medical ID platform that centralizes healthcare information across providers. It enables patients to manage medical records, appointments, medications, and emergency health profiles in one secure system, while also supporting instant emergency access via QR/NFC-style workflows.

The platform includes:
- A patient-facing portal
- A provider-facing portal
- A shared backend API
- A PostgreSQL database managed with Prisma

All services run locally using Docker Compose to ensure a consistent development environment across the team.

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
- Fully Dockerized local development

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
- PostgreSQL

### Infrastructure
- Docker
- Docker Compose
- pgAdmin
- GitHub

---

## Getting Started (Local Development)

---

## 1. Prerequisites

Before starting, ensure you have the following installed:

- Docker Desktop
- Git
- Node.js v18+ (only required if running services outside Docker)

---

## 2. Clone the Repository
```bash
git clone <REPO_URL>
cd MedilinkidPatientPrototype/backend
```

---

## 3. Create Environment File

Inside the `backend/` directory, create a file named `.env.docker`.
```env
DATABASE_URL=postgresql://medilink:medilinkpw@db:5432/medilink?schema=public
PORT=4000
NODE_ENV=development
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

Important notes:

- `.env.docker` is intentionally not committed
- Ask Kennie for the OpenAI API key if needed

---

## 4. Run the Entire Stack with Docker

From the `backend/` directory, run:
```bash
docker compose up -d --build
```

This will start:

- PostgreSQL database
- Backend API
- Patient UI
- Provider UI
- pgAdmin

---

## 5. Access the Running Services

Once Docker finishes starting, open the following in your browser:

- **Patient Portal:** http://localhost:5173
- **Provider Portal:** http://localhost:5174
- **Backend API:** http://localhost:4000
- **pgAdmin:** http://localhost:5050

---

## 6. Apply Database Migrations (Prisma)

This step is required only on first setup or after database reset.
```bash
docker compose exec api npx prisma migrate deploy
```

To confirm migrations:
```bash
docker compose exec api npx prisma migrate status
```

---

## 7. Database Notes (Important)

- Prisma manages schema changes via `_prisma_migrations`
- Existing data is preserved unless explicitly truncated
- **Do NOT** run `prisma migrate reset`
- **Do NOT** delete Docker volumes unless you intend to wipe the database

---

## 8. pgAdmin Configuration (Optional)

Login credentials:

- Email: `admin@medilink.com`
- Password: `admin`

Create a new server in pgAdmin:

- Host: `db`
- Port: `5432`
- Username: `medilink`
- Password: `medilinkpw`
- Database: `medilink`

---

## Current Project Status

MediLink is in active development and has reached MVP stage.

Current MVP functionality includes:

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

## Development Rules (Read This)

- Docker is the single source of truth
- Do not commit `.env` or `.env.docker`
- Always run migrations with `migrate deploy`
- Never reset the database unless explicitly instructed

---


