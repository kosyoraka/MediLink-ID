
# MediLink ID / HealthConnect ID

## Project Summary

We propose developing a smart patient portal and NFC-enabled medical ID system that centralizes medical records, test results, medications, and appointments from multiple providers into one secure platform. The system will also allow patients to instantly share critical health information such as allergies, chronic conditions, and medications through a single NFC tap during emergencies, ensuring timely and accurate care while reducing fragmentation in healthcare record management.

---

## Challenge Statement/Objective

### Challenge 1: Fragmented Medical Records
The current challenge is the lack of centralized access to medical records. Patients often need to log in to multiple platforms or request records from different providers such as family doctors, walk-in clinics, and specialists, making it difficult to manage their health information. 

**Our Solution:** A patient portal/app that consolidates test results, medications, and upcoming appointments in one secure place.

### Challenge 2: Emergency Information Access
A second challenge arises during emergencies, when patients are repeatedly asked to provide personal information, medical history, and allergy details. 

**Our Solution:** Patients can share this critical information instantly via a single NFC tap, ensuring timely and accurate care.

---

## Description/Context

We are addressing a healthcare accessibility and data management challenge by designing a platform that unifies patient information across different medical providers. This solution spans the domains of **software engineering**, **artificial intelligence**, and **healthcare** by creating a smart, user-friendly system that improves record accessibility and enhances emergency response.

---

## Background

Currently, patients' medical information is fragmented across multiple platforms, requiring manual transfers of reports and repeated form-filling. While some healthcare systems have electronic records, they are often limited to a single hospital or clinic network. 

Our proposed solution offers a **universal, patient-centered platform** that centralizes medical records from family doctors, specialists, and walk-in clinics. By linking the platform to an NFC-enabled ID system, patients can securely share critical information such as chronic illnesses, medications, and allergies in emergencies. 

In the future, this system could:
- Reduce administrative burden
- Improve continuity of care
- Provide a foundation for AI-driven health insights

---

## Key Features

- **Centralized Patient Portal**: Consolidates records from multiple healthcare providers
- **NFC Emergency Access**: Instant access to critical health information via tap
- **Secure Platform**: PHIPA-compliant data protection
- **HL7 FHIR Integration**: Standardized EMR connectivity

---

## Project Team

- Oloruntimilehin(Timi) Olajonlu
- Kennie Oraka
- Kosy Oraka
- Elysprit (Elyse) Dhaliwal
- Andrew Tissi
- Amira Mohamed

---

## Regulatory Compliance

- **PHIPA (Personal Health Information Protection Act)** compliance for Ontario
- **HL7 FHIR standards** for EMR integration and interoperability

---

## Project Status

MediLink is currently in **active development** and has reached an **MVP (Minimum Viable Product)** stage.

The MVP demonstrates:
- Core authentication and user onboarding
- Patient profile and emergency health profile management
- QR-based emergency access to critical health information
- Initial AI-powered symptom guidance
- A foundation for future provider and health record integrations

---

## Technology Stack

**Frontend**
- React + TypeScript
- Vite
- Tailwind CSS
- Component-based UI architecture

**Backend**
- Node.js
- Express
- TypeScript
- PostgreSQL (via Docker)
- Prisma ORM

**AI Integration**
- OpenAI API

**Infrastructure / Tooling**
- Docker (PostgreSQL)
- GitHub for version control
- Environment-based configuration (`.env`, `.env.local`)
---

## Current Features

- User signup and login
- Personal health profile management
- Emergency profile with share controls
- QR code generation for emergency access
- Wallet preview (Apple Wallet integration planned)
- Health summary UI (vitals, allergies, immunizations, family history)
- AI-powered symptom checker (guidance, not diagnosis)

---

## Planned / In-Progress Features

- Connected healthcare providers (simulated and/or FHIR-based)
- Provider-side portal (hospital/clinic simulation)
- Medical record synchronization
- Enhanced access controls and permissions
- Apple Wallet / NFC-based access
- PDF export and sharing improvements

---

## Getting Started (Development)

### Prerequisites
- Node.js (v18+ recommended)
- Docker
- PostgreSQL (via Docker)
- An OpenAI API key: Ask Kennie for api key

---

### Frontend & Backend Setup

```bash
npm install
npm run dev

The frontend runs on:

http://localhost:3000

To test on a phone or another device, run the dev server with:

npm run dev -- --host


The backend runs on:

http://localhost:4000


Note: You must create a backend/.env file with required environment variables (database URL, OpenAI API key, etc.).
.env files are intentionally not committed to version control.

### Environment Configuration
Create a `.env` file inside the `backend/` directory:

```env
DATABASE_URL=postgresql://medilink:medilinkpw@localhost:5433/medilink?schema=public
PORT=4000
OPENAI_API_KEY=YOUR_OPENAI_API_KEY