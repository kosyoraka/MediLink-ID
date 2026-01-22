-- backend/appointments.sql

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  patient_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  specialty TEXT NOT NULL,

  start_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in-person', 'virtual')),

  location_name TEXT,
  address TEXT,
  join_url TEXT,

  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled'))
    DEFAULT 'Scheduled',

  notes TEXT,
  visit_summary_available BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_time
ON appointments (patient_id, start_time DESC);
