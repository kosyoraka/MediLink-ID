-- Patient ↔ Provider connections (history-preserving)
-- Active = disconnected_at IS NULL
-- Disconnect ends future access but does not delete history

CREATE TABLE IF NOT EXISTS patient_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,

  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,

  -- Optional auditing fields (safe to keep for later)
  source TEXT, -- e.g. 'signup' | 'settings'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speed up “active providers for a patient”
CREATE INDEX IF NOT EXISTS idx_ppc_patient_active
  ON patient_provider_connections (patient_id)
  WHERE disconnected_at IS NULL;

-- Speed up “patients connected to a provider”
CREATE INDEX IF NOT EXISTS idx_ppc_provider_active
  ON patient_provider_connections (provider_id)
  WHERE disconnected_at IS NULL;

-- Optional: ensure provider_id references providers table if you want
-- (uncomment if your providers table is UUID PK)
-- ALTER TABLE patient_provider_connections
--   ADD CONSTRAINT fk_ppc_provider
--   FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

-- Optional: ensure patient_id references patients table if you want
-- ALTER TABLE patient_provider_connections
--   ADD CONSTRAINT fk_ppc_patient
--   FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
