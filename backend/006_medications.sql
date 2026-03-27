CREATE TABLE IF NOT EXISTS patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  hospital_id UUID,
  staff_id UUID,
  source_type TEXT NOT NULL DEFAULT 'provider' CHECK (source_type IN ('provider', 'patient')),
  verification_status TEXT NOT NULL DEFAULT 'provider_prescribed' CHECK (
    verification_status IN ('provider_prescribed', 'patient_added')
  ),
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  purpose TEXT,
  prescriber_name TEXT,
  pharmacy TEXT,
  start_date DATE,
  end_date DATE,
  refills_remaining INTEGER,
  notes TEXT,
  reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  adherence_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    adherence_status IN ('not_started', 'on_track', 'missed_doses', 'stopped')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_refill_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_medications_patient_id
  ON patient_medications (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_medications_hospital_id
  ON patient_medications (hospital_id);

CREATE INDEX IF NOT EXISTS idx_patient_medications_staff_id
  ON patient_medications (staff_id);

CREATE INDEX IF NOT EXISTS idx_patient_medications_is_active
  ON patient_medications (patient_id, is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS medication_intake_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  logged_for_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_intake_logs_medication_id
  ON medication_intake_logs (medication_id, logged_for_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_intake_logs_patient_id
  ON medication_intake_logs (patient_id, logged_for_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS medication_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  staff_id UUID,
  conversation_id UUID NOT NULL,
  requested_by_patient_id UUID NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at TIMESTAMPTZ,
  resolved_by_staff_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_change_requests_conversation
  ON medication_change_requests (conversation_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_change_requests_hospital
  ON medication_change_requests (hospital_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_change_requests_patient
  ON medication_change_requests (patient_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS medication_refill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  staff_id UUID,
  conversation_id UUID NOT NULL,
  requested_by_patient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'denied')),
  request_note TEXT,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by_staff_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_refill_requests_conversation
  ON medication_refill_requests (conversation_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_refill_requests_hospital
  ON medication_refill_requests (hospital_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_refill_requests_patient
  ON medication_refill_requests (patient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_refill_requests_medication
  ON medication_refill_requests (medication_id, status, created_at DESC);
