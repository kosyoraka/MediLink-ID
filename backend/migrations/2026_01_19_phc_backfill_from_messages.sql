-- Backfill hospital-level connections from message_conversations
-- patient_id is TEXT in your schema, so we keep it TEXT here.
INSERT INTO patient_hospital_connections (patient_id, hospital_id, source)
SELECT DISTINCT
  mc.patient_id::text AS patient_id,
  mc.provider_id      AS hospital_id,
  'backfill-from-messages' AS source
FROM message_conversations mc
ON CONFLICT DO NOTHING;
