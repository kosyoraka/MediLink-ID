ALTER TABLE emergency_profiles
  ADD COLUMN IF NOT EXISTS emergency_access_code_hash TEXT;

ALTER TABLE emergency_access_logs
  ADD COLUMN IF NOT EXISTS access_method TEXT NOT NULL DEFAULT 'direct_public';

ALTER TABLE emergency_access_logs
  ADD COLUMN IF NOT EXISTS staff_id UUID;

CREATE TABLE IF NOT EXISTS emergency_staff_access_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  emergency_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emergency_staff_access_tickets_token
  ON emergency_staff_access_tickets (emergency_token, expires_at DESC);
