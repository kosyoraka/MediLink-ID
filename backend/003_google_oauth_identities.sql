-- Google OAuth identities for patient/staff account linking
CREATE TABLE IF NOT EXISTS public.oauth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  patient_id UUID NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  staff_id UUID NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oauth_identities_provider_provider_sub_key UNIQUE (provider, provider_sub),
  CONSTRAINT oauth_identities_provider_check CHECK (provider IN ('google')),
  CONSTRAINT oauth_identities_account_ref_check CHECK (
    (patient_id IS NOT NULL AND staff_id IS NULL) OR
    (patient_id IS NULL AND staff_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_patient_id ON public.oauth_identities (patient_id);
CREATE INDEX IF NOT EXISTS idx_oauth_identities_staff_id ON public.oauth_identities (staff_id);
