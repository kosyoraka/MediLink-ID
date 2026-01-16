-- 001_pending_patient_intake.sql

-- If you already use UUIDs and your tables work, you may already have one of these extensions enabled.
-- This enables gen_random_uuid() on many Postgres installs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pending_patient_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,

  full_name TEXT,
  dob DATE,
  phone_number TEXT,

  home_address TEXT,
  insurance TEXT,

  health_card TEXT,
  blood_type TEXT,
  allergies TEXT,
  medical_conditions TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
