CREATE TABLE IF NOT EXISTS patient_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  hospital_id UUID,
  staff_id UUID,
  source_type TEXT NOT NULL DEFAULT 'provider' CHECK (source_type IN ('provider', 'patient')),
  verification_status TEXT NOT NULL DEFAULT 'provider_verified' CHECK (
    verification_status IN ('provider_verified', 'patient_noted', 'provider_reviewed')
  ),
  name TEXT NOT NULL,
  status TEXT,
  diagnosed TEXT,
  metric TEXT,
  provider TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient_id
  ON patient_conditions (patient_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_conditions_hospital_id
  ON patient_conditions (hospital_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_conditions_source_type
  ON patient_conditions (patient_id, source_type, is_active, updated_at DESC);
