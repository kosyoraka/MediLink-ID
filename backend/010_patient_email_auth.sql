ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS public.patient_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_email_verifications_patient_id
  ON public.patient_email_verifications (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_email_verifications_token_hash
  ON public.patient_email_verifications (token_hash);

CREATE TABLE IF NOT EXISTS public.patient_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_password_resets_patient_id
  ON public.patient_password_resets (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_password_resets_token_hash
  ON public.patient_password_resets (token_hash);
