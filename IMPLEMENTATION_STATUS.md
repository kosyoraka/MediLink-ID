# MediLink Implementation Status

This document tracks what is currently implemented in the codebase and what still needs to be built or completed.

It is written to be practical:
- `"[x]"` means the feature exists in the current app
- `"[ ]"` means the feature is missing, incomplete, mock-only, or not fully wired end-to-end

This is based on the current code state in:
- patient app: `src/`
- provider app: `provider-ui/src/`
- backend API: `backend/src/index.ts`

## 0. Platform / Infrastructure

### Implemented
- [x] Local Docker development is configured for Supabase-backed runtime
- [x] Backend Docker startup no longer waits on a local Cloud SQL proxy
- [x] Backend DB connectivity supports Supabase SSL settings through environment config
- [x] Supabase setup SQL exists in [`backend/supabase_setup.sql`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/supabase_setup.sql)
- [x] Supabase example env file exists in [`backend/.env.supabase.example`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/.env.supabase.example)
- [x] Live GCP-to-Supabase migration tooling exists in [`backend/scripts/migrate-gcp-to-supabase.js`](/Users/kennie/Downloads/MedilinkTest/MedilinkidPatientPrototype/backend/scripts/migrate-gcp-to-supabase.js)
- [x] Live GCP data has been migrated into Supabase for the current working environment

### Gaps
- [ ] Shared environment secret management is still manual
- [ ] Prisma migration workflow against the shared Supabase database still needs stricter team process/documentation
- [ ] Object/file storage is still not moved to a dedicated managed storage layer

## 1. Authentication

### Patient authentication
- [x] Patient email/password sign up exists
- [x] Patient email/password sign in exists
- [x] Patient JWT-based auth exists
- [x] Patient Google sign in backend route exists: `/api/auth/google`
- [x] Patient Google sign in UI exists in onboarding sign in/sign up
- [ ] Patient Google sign in is not fully production-ready because it still depends on correct Google Cloud OAuth origin configuration
- [ ] Patient auth/session handling still needs a stronger token refresh / expiry strategy

### Provider authentication
- [x] Provider email/password sign up exists
- [x] Provider email/password sign in exists
- [x] Provider JWT-based auth exists
- [x] Provider Google auth backend route exists: `/api/staff/auth/google`
- [x] Provider Google sign in UI exists
- [x] Provider app now clears stale invalid JWTs instead of staying in a broken authenticated state
- [ ] Provider Google sign in is still environment-sensitive and depends on correct Google OAuth origin configuration
- [ ] Provider auth still needs more graceful token-expiry UX than simply clearing invalid local tokens

### Auth gaps
- [ ] No password reset / forgot password flow
- [ ] No email verification flow
- [ ] No role-based admin portal
- [ ] No multi-factor authentication
- [ ] No session management screen showing active devices/sessions

## 2. Patient Onboarding and Profile

### Core onboarding
- [x] Patient sign up flow exists
- [x] Profile setup flow exists
- [x] Emergency setup flow exists
- [x] Provider connection flow exists during onboarding
- [x] Post-auth onboarding routing now checks saved backend data before deciding whether profile/emergency setup is still needed

### Patient profile
- [x] Personal information page exists
- [x] Patient profile data is persisted in backend profile tables
- [x] Emergency profile information is persisted
- [x] Existing profile values are prefetched into the profile setup form when present

### Profile gaps
- [ ] Profile photo upload/edit is not implemented
- [ ] Patient identity verification is not implemented
- [ ] There is no audit/history view for profile edits
- [ ] There is no structured validation flow for health card / insurance details

## 3. Connected Providers / Hospital Relationships

### Implemented
- [x] Patients can connect to providers
- [x] Connected providers are viewable in the patient app
- [x] Patients can disconnect providers
- [x] Provider-side patient list is scoped to connected patients instead of all patients in the database
- [x] Provider patient count on dashboard now reflects connected patients only
- [x] Provider patient list shows active/inactive style connection state within the main patient list

### Gaps
- [ ] Provider/hospital connection semantics are still somewhat mixed in the data model
- [ ] There is no explicit admin workflow for approving or rejecting patient-provider connections
- [ ] There is no provider-side UI for inviting a patient to connect
- [ ] There is no patient-side explanation of what data becomes visible when a provider is connected

## 4. Appointments

### Implemented
- [x] Patients can create appointments
- [x] Provider side can view appointment lists
- [x] Provider side can confirm appointment status
- [x] Dashboard next appointment on patient side uses actual appointment data
- [x] Patient notifications now reflect appointment status more accurately than before
- [x] Provider dashboard has appointment metrics (`Upcoming today`, `Pending confirmations`)
- [x] Patient details page on provider side shows actual appointment history
- [x] Last checkup / last visit logic can use real appointment history

### Partially implemented / needs improvement
- [x] Appointment confirmation exists
- [ ] Appointment lifecycle is still basic; it should be more explicit across requested, pending, confirmed, completed, cancelled, no-show
- [ ] Appointment rescheduling flow is not clearly implemented end-to-end
- [ ] Appointment reminders are not fully implemented as real scheduled notifications
- [ ] Provider scheduling tools are still limited
- [ ] No calendar-style provider scheduling management with slot blocking, availability rules, etc.
- [ ] No waitlist flow
- [ ] No telehealth/video visit flow

## 5. Messaging

### Implemented
- [x] Patient can list conversations
- [x] Patient can start a new conversation with connected provider staff
- [x] Patient can send messages in an existing conversation
- [x] Patient can mark conversations as read
- [x] Provider can list conversations
- [x] Provider can read messages in an existing conversation
- [x] Provider can reply inside an existing conversation
- [x] Provider can mark conversations as read

### Important gaps
- [ ] Providers currently cannot start a brand-new conversation themselves; only patients can initiate conversations
- [ ] There is no provider-side UI/API to proactively message a connected patient first
- [ ] No attachment support in chat
- [ ] No document-sharing inside messaging
- [ ] No typing indicators, delivery/read receipts beyond basic unread state
- [ ] No notification routing for new messages beyond dashboard/unread counts
- [ ] No conversation assignment or inbox triage model for staff teams

## 6. Medical Records and Documents

### Patient-side records
- [x] Patient `Records` page exists
- [x] Patient records now use backend-driven document data rather than only mock data
- [x] Patients can upload documents
- [x] Patients can request medical records from connected hospitals/providers
- [x] Patient records include search
- [x] Patient records include category organization
- [x] Patient records include basic verification labels
- [x] Patient records support provider-linked upload vs personal upload
- [x] Insurance uploads are patient-owned rather than requestable from providers

### Provider-side documents
- [x] Provider `Documents` page exists
- [x] Provider documents use backend data
- [x] Provider sees documents linked to their hospital/provider relationships
- [x] Personal patient uploads with no provider/hospital link are excluded from provider visibility
- [x] Provider can upload documents for a patient
- [x] Provider can fulfill a patient document request from the pending request queue
- [x] Fulfilled requests create linked patient documents

### Records/document model
- [x] `medical_documents` table exists
- [x] `document_files` table exists
- [x] `document_requests` table exists
- [x] Patient upload flow is persisted
- [x] Provider upload flow is persisted
- [x] Hospital-level request queue exists

### Important gaps
- [ ] File storage is still using database-backed/base64 style storage rather than proper object storage
- [ ] No document preview experience beyond opening the stored file URL
- [ ] No provider document verification / reject / replace workflow yet
- [ ] No versioning / supersede flow exposed in UI
- [ ] No duplicate detection
- [ ] No OCR / extracted text / search-inside-document
- [ ] No structured document request management states exposed strongly in UI (`viewed`, `in_progress`, etc.)
- [ ] No provider-side bulk document management tools
- [ ] No document sharing permissions model for external sharing
- [ ] No document access audit trail in UI

## 7. Health Summary

### Patient-side health summary
- [x] Patient `Health Summary` page exists
- [x] Quick stats exist
- [x] `Last Checkup` is based on real appointment history
- [x] `Active Meds` is wired and can navigate to medications
- [x] Vital signs cards exist
- [x] Vitals can be updated from the health summary screen
- [x] Vitals history modal exists per metric
- [x] Basic internal status calculations exist for:
  - blood pressure
  - heart rate
  - blood sugar
  - weight delta
- [x] Medical conditions section exists
- [x] Allergies and sensitivities section exists
- [x] Immunization record section exists
- [x] Family health history section exists
- [x] Patient can add/edit these sections from the health summary screen
- [x] Patient health summary is now saved through backend APIs

### Provider-side health summary
- [x] Provider patient details has a `Health Summary` tab
- [x] Provider health summary no longer duplicates top-level summary cards as heavily as before
- [x] Provider can see latest shared patient vitals summary
- [x] Provider can see shared immunization records
- [x] Provider can see shared family health history

### Health summary backend
- [x] `patient_health_summaries` table exists
- [x] Patient `GET /api/patient/health-summary` exists
- [x] Patient `PUT /api/patient/health-summary` exists
- [x] Provider `GET /api/staff/patients/:id/health-summary` exists

### Health summary gaps
- [ ] Provider cannot yet edit or annotate patient health summary data from provider side
- [ ] No care-plan system behind `View Care Plan`
- [ ] No structured lab metrics such as real A1C history stored separately
- [ ] No structured chronic-condition management model
- [ ] No dedicated vitals trend charts yet; current history is list-based
- [ ] No normalization/validation layer for clinical values beyond simple status rules
- [ ] No backend audit trail for health-summary edits
- [ ] No granular sharing controls for which health-summary sections a provider can see

## 8. Emergency Profile / Emergency Access

### Implemented
- [x] Emergency profile exists
- [x] Emergency public/share flow exists
- [x] Emergency info can be configured by the patient
- [x] Share settings exist for emergency data fields
- [x] Provider patient details includes an `Emergency Info` tab

### Gaps
- [ ] QR/NFC-style true emergency access flow is not fully built out as a production system
- [ ] Emergency access audit logging is not exposed in UI
- [ ] No clinician-only emergency access escalation flow
- [ ] No expiry controls / temporary emergency access tokens in polished form

## 9. Notifications

### Implemented
- [x] Patient notifications page exists
- [x] Bell icon unread count exists
- [x] Appointment-related notifications are tied more closely to actual appointment data than before
- [x] Notification grouping/sorting work has started

### Gaps
- [ ] Notifications are still mostly appointment-centric
- [ ] Document notifications are not fully implemented end-to-end
- [ ] Message notifications are not fully implemented end-to-end
- [ ] Provider-side notification center is still limited
- [ ] There is no real notification preference backend
- [ ] No push notification infrastructure
- [ ] No email notification infrastructure

## 10. Provider Dashboard

### Implemented
- [x] Dashboard exists
- [x] Total patients reflects connected patients
- [x] Appointment metrics are based on real data
- [x] Recent documents count uses recent real documents
- [x] Work queue section exists
- [x] Recent document activity exists

### Gaps
- [ ] Dashboard still needs stronger operational widgets
- [ ] No richer care coordination queue
- [ ] No provider-initiated outreach queue
- [ ] No real analytics/trend visualizations
- [ ] No staffing or hospital operations management layer

## 11. Patient Dashboard

### Implemented
- [x] Dashboard exists
- [x] Next appointment is based on actual appointment data
- [x] Notifications entry exists
- [x] Health Summary entry exists
- [x] Nutrition & Fitness entry exists
- [x] Medical History / Records related navigation exists
- [x] Symptom checker entry exists

### Gaps
- [ ] Some dashboard cards remain more presentational than operational
- [ ] Health score card is still not a true computed health engine
- [ ] `Care Journeys` needs deeper implementation
- [ ] `Recommendations` needs deeper implementation
- [ ] Nutrition and fitness page needs real persistence and data model

## 12. Symptom Checker / AI

### Implemented
- [x] Symptom checker UI exists
- [x] AI symptom guidance backend route exists
- [x] The feature is framed as non-diagnostic guidance

### Gaps
- [ ] No structured symptom history
- [ ] No saved symptom sessions
- [ ] No connection between symptom guidance and appointments/messages/documents
- [ ] No escalation workflow from symptom guidance to provider outreach

## 13. Provider Patient Details

### Implemented
- [x] Patient details page exists
- [x] Patient snapshot card exists
- [x] Care snapshot exists
- [x] Medical summary exists
- [x] Documents tab uses real provider document data
- [x] Appointments tab uses real appointment data
- [x] Emergency tab uses emergency-specific data without repeating everything
- [x] Health Summary tab exists

### Gaps
- [ ] No provider-side editing of many patient clinical details
- [ ] No provider-entered structured encounter/visit records stored in backend
- [ ] No longitudinal care-plan timeline
- [ ] No linked encounter-to-document model in UI

## 14. Settings

### Patient side
- [x] More/settings-style navigation exists
- [x] Communication preferences page exists
- [x] Connected providers management exists

### Provider side
- [x] Provider settings page exists
- [x] Basic profile and notification preference UI exists

### Gaps
- [ ] Many settings are UI-only or not strongly persisted
- [ ] No robust notification preference backend
- [ ] No security activity log
- [ ] No role permission management

## 15. Infrastructure / Developer Experience

### Implemented
- [x] Dockerized local environment exists
- [x] Cloud SQL proxy-based development flow exists
- [x] Backend, patient UI, provider UI, and pgAdmin are containerized
- [x] Prisma is present

### Current pain points / gaps
- [ ] Dev environment currently depends on Cloud SQL availability and billing state
- [ ] Free-trial / billing issues can break local development entirely
- [ ] Schema bootstrap at API startup is fragile when Cloud SQL is temporarily unavailable
- [ ] No reliable local fallback database mode for offline development
- [ ] No automated test suite coverage visible for core workflows
- [ ] No CI/CD pipeline status is documented here

## 16. Biggest Functional Gaps Still Remaining

These are the most important missing pieces from a product perspective.

- [ ] Providers cannot start a new message thread with a patient
- [ ] Real provider-side document review workflow is missing (`verify`, `reject`, `replace`)
- [ ] Proper object/file storage architecture is missing
- [ ] Notification system is not fully real across appointments, documents, and messages
- [ ] Health summary is synced now, but still needs stronger clinical structure and auditability
- [ ] Care plans are not implemented
- [ ] Nutrition & fitness still needs a real backend model
- [ ] Many settings/preferences are not fully persisted
- [ ] Authentication still needs production-hardening
- [ ] Developer environment is too dependent on one shared Cloud SQL instance

## 17. Recommended Next Build Order

If the goal is to make the app feel more complete quickly, this is the recommended order.

### Priority 1: Communication and provider workflow
- [ ] Allow providers to start conversations with connected patients
- [ ] Add message notifications on both sides
- [ ] Add document-sharing inside message threads

### Priority 2: Documents and records quality
- [ ] Implement provider review actions for patient-uploaded documents
- [ ] Move file storage away from base64/database storage
- [ ] Add document preview and replacement/version flow

### Priority 3: Clinical data quality
- [ ] Create structured visit/encounter records
- [ ] Connect appointments, documents, and health-summary entries
- [ ] Add real care-plan model

### Priority 4: Health tracking
- [ ] Improve health-summary charts and trend visuals
- [ ] Add nutrition/fitness persistence and provider visibility controls
- [ ] Add stronger validation for patient-entered vitals

### Priority 5: Product hardening
- [ ] Improve auth/session resilience
- [ ] Improve notification infrastructure
- [ ] Add tests for core workflows
- [ ] Reduce dependency on one fragile shared dev database

## 18. Notes

- Some UI areas may exist visually but still rely on mock content or partial backend wiring.
- Some infrastructure issues are not app-code issues; Cloud SQL availability and billing state currently affect development heavily.
- This document should be updated whenever a feature moves from mock/UI-only to fully persisted and role-aware.
