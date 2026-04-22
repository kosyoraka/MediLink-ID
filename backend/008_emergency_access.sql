CREATE TABLE IF NOT EXISTS emergency_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  emergency_link_id UUID,
  token TEXT,
  access_result TEXT NOT NULL DEFAULT 'success' CHECK (access_result IN ('success', 'revoked')),
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_access_logs_patient_id
  ON emergency_access_logs (patient_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergency_access_logs_token
  ON emergency_access_logs (token, accessed_at DESC);
