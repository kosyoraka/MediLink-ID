-- Patient ↔ Hospital connections (history-preserving)
-- Active = disconnected_at IS NULL

CREATE TABLE IF NOT EXISTS patient_hospital_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  patient_id text NOT NULL,          -- matches patients.id type in your DB (TEXT)
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,

  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,

  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- prevent duplicate active connections for same patient/hospital
CREATE UNIQUE INDEX IF NOT EXISTS uniq_phc_active
  ON patient_hospital_connections (patient_id, hospital_id)
  WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_phc_patient_active
  ON patient_hospital_connections (patient_id)
  WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_phc_hospital_active
  ON patient_hospital_connections (hospital_id)
  WHERE disconnected_at IS NULL;

-- Backfill from existing staff-based connections (only works where staff row exists)
INSERT INTO patient_hospital_connections (patient_id, hospital_id, source)
SELECT
  ppc.patient_id::text AS patient_id,
  s.hospital_id,
  'backfill-from-staff-connection' AS source
FROM patient_provider_connections ppc
JOIN staff_accounts s ON s.id = ppc.provider_id
WHERE ppc.disconnected_at IS NULL
ON CONFLICT DO NOTHING;

-- Backfill from conversations (hospital-level already)
INSERT INTO patient_hospital_connections (patient_id, hospital_id, source)
SELECT
  mc.patient_id::text AS patient_id,
  mc.provider_id AS hospital_id,
  'backfill-from-message-conversation' AS source
FROM message_conversations mc
ON CONFLICT DO NOTHING;

-- When a staff-connection is created, automatically ensure hospital connection exists
CREATE OR REPLACE FUNCTION sync_phc_from_ppc()
RETURNS trigger AS $$
DECLARE
  hid uuid;
BEGIN
  SELECT hospital_id INTO hid
  FROM staff_accounts
  WHERE id = NEW.provider_id;

  IF hid IS NULL THEN
    RETURN NEW;
  END IF;

  -- upsert active hospital connection
  INSERT INTO patient_hospital_connections (patient_id, hospital_id, source)
  VALUES (NEW.patient_id::text, hid, COALESCE(NEW.source, 'ppc-sync'))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_phc_from_ppc ON patient_provider_connections;

CREATE TRIGGER trg_sync_phc_from_ppc
AFTER INSERT ON patient_provider_connections
FOR EACH ROW
WHEN (NEW.disconnected_at IS NULL)
EXECUTE FUNCTION sync_phc_from_ppc();


-- When a staff connection is disconnected, optionally disconnect hospital connection
-- ONLY if there are no other active staff connections in that hospital.
CREATE OR REPLACE FUNCTION maybe_disconnect_phc_on_ppc_disconnect()
RETURNS trigger AS $$
DECLARE
  hid uuid;
  still_active int;
BEGIN
  IF OLD.disconnected_at IS NOT NULL OR NEW.disconnected_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT hospital_id INTO hid
  FROM staff_accounts
  WHERE id = NEW.provider_id;

  IF hid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO still_active
  FROM patient_provider_connections ppc
  JOIN staff_accounts s ON s.id = ppc.provider_id
  WHERE ppc.patient_id::text = NEW.patient_id::text
    AND ppc.disconnected_at IS NULL
    AND s.hospital_id = hid;

  IF still_active = 0 THEN
    UPDATE patient_hospital_connections
    SET disconnected_at = now()
    WHERE patient_id = NEW.patient_id::text
      AND hospital_id = hid
      AND disconnected_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disconnect_phc_on_ppc_disconnect ON patient_provider_connections;

CREATE TRIGGER trg_disconnect_phc_on_ppc_disconnect
AFTER UPDATE OF disconnected_at ON patient_provider_connections
FOR EACH ROW
EXECUTE FUNCTION maybe_disconnect_phc_on_ppc_disconnect();
