CREATE TABLE IF NOT EXISTS public.patient_signin_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NULL,
  last_signin_method TEXT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_ip_address TEXT NULL,
  last_user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_signin_devices_patient_id
  ON public.patient_signin_devices (patient_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.patient_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_security_events_patient_id
  ON public.patient_security_events (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_security_events_event_type
  ON public.patient_security_events (event_type, created_at DESC);
