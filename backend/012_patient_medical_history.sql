CREATE TABLE IF NOT EXISTS patient_surgical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID,
  staff_id UUID,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('patient', 'provider')),
  verification_status TEXT NOT NULL DEFAULT 'patient_reported' CHECK (
    verification_status IN ('patient_reported', 'provider_documented', 'provider_reviewed')
  ),
  procedure_name TEXT NOT NULL,
  surgery_date DATE,
  facility TEXT,
  surgeon TEXT,
  indication TEXT,
  complications TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_surgical_history_patient
  ON patient_surgical_history (patient_id, COALESCE(surgery_date, DATE(created_at)) DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_hospitalizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID,
  staff_id UUID,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('patient', 'provider')),
  verification_status TEXT NOT NULL DEFAULT 'patient_reported' CHECK (
    verification_status IN ('patient_reported', 'provider_documented', 'provider_reviewed')
  ),
  reason TEXT NOT NULL,
  admission_date DATE,
  discharge_date DATE,
  facility TEXT,
  attending_provider TEXT,
  diagnosis TEXT,
  treatment_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_hospitalizations_patient
  ON patient_hospitalizations (patient_id, COALESCE(discharge_date, admission_date, DATE(created_at)) DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_emergency_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID,
  staff_id UUID,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('patient', 'provider')),
  verification_status TEXT NOT NULL DEFAULT 'patient_reported' CHECK (
    verification_status IN ('patient_reported', 'provider_documented', 'provider_reviewed')
  ),
  reason TEXT NOT NULL,
  visit_date DATE,
  visit_time TEXT,
  facility TEXT,
  diagnosis TEXT,
  treatment TEXT,
  disposition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_emergency_visits_patient
  ON patient_emergency_visits (patient_id, COALESCE(visit_date, DATE(created_at)) DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_social_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('patient', 'provider')),
  verification_status TEXT NOT NULL DEFAULT 'patient_reported' CHECK (
    verification_status IN ('patient_reported', 'provider_documented', 'provider_reviewed')
  ),
  category TEXT NOT NULL DEFAULT 'other' CHECK (
    category IN ('smoking', 'alcohol', 'occupation', 'exercise', 'travel', 'substance_use', 'diet', 'other')
  ),
  title TEXT NOT NULL,
  status TEXT,
  start_date DATE,
  end_date DATE,
  detail TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_social_history_patient
  ON patient_social_history (patient_id, category, COALESCE(start_date, DATE(created_at)) DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_reproductive_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('patient', 'provider')),
  verification_status TEXT NOT NULL DEFAULT 'patient_reported' CHECK (
    verification_status IN ('patient_reported', 'provider_documented', 'provider_reviewed')
  ),
  event_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  event_date DATE,
  outcome TEXT,
  detail TEXT,
  notes TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_reproductive_history_patient
  ON patient_reproductive_history (patient_id, COALESCE(event_date, DATE(created_at)) DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_mental_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'patient' CHECK (source_type IN ('patient', 'provider')),
  verification_status TEXT NOT NULL DEFAULT 'patient_reported' CHECK (
    verification_status IN ('patient_reported', 'provider_documented', 'provider_reviewed')
  ),
  condition_name TEXT NOT NULL,
  diagnosed_date DATE,
  status TEXT,
  provider_name TEXT,
  treatment TEXT,
  notes TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_mental_health_history_patient
  ON patient_mental_health_history (patient_id, COALESCE(diagnosed_date, DATE(created_at)) DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_medical_history_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (
    section_type IN ('surgical', 'hospitalizations', 'emergency', 'social', 'reproductive', 'mental')
  ),
  entry_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('patient', 'staff', 'system')),
  actor_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_medical_history_audit_patient
  ON patient_medical_history_audit_events (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_medical_history_audit_section
  ON patient_medical_history_audit_events (patient_id, section_type, created_at DESC);
