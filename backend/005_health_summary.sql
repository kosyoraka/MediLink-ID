CREATE TABLE IF NOT EXISTS patient_health_summaries (
  patient_id UUID PRIMARY KEY,
  vitals JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  immunizations JSONB NOT NULL DEFAULT '[]'::jsonb,
  family_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
