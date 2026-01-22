-- Conversations: one per (patient, provider org, staff user)
CREATE TABLE IF NOT EXISTS message_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL,     -- hospitals.id
  staff_id uuid NOT NULL,        -- staff_accounts.id

  last_message_preview text,
  last_message_at timestamptz,

  patient_last_read_at timestamptz,
  staff_last_read_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_message_conversation UNIQUE (patient_id, provider_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_conv_patient ON message_conversations (patient_id);
CREATE INDEX IF NOT EXISTS idx_msg_conv_staff ON message_conversations (staff_id);
CREATE INDEX IF NOT EXISTS idx_msg_conv_provider ON message_conversations (provider_id);
CREATE INDEX IF NOT EXISTS idx_msg_conv_last ON message_conversations (last_message_at DESC);

-- Messages inside a conversation
CREATE TABLE IF NOT EXISTS message_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES message_conversations(id) ON DELETE CASCADE,

  sender_type text NOT NULL CHECK (sender_type IN ('patient','staff')),
  sender_patient_id uuid,
  sender_staff_id uuid,

  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_items_conv_time ON message_items (conversation_id, created_at ASC);
