ALTER TABLE public.patient_profiles
ADD COLUMN IF NOT EXISTS insurance TEXT;
