CREATE TABLE IF NOT EXISTS public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  category TEXT NOT NULL,
  subtype TEXT NULL,
  message TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  linked_document_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  CONSTRAINT document_requests_category_check CHECK (
    category IN ('labs', 'imaging', 'visits', 'prescriptions', 'insurance', 'other')
  ),
  CONSTRAINT document_requests_status_check CHECK (
    status IN ('pending', 'viewed', 'in_progress', 'fulfilled', 'declined', 'expired')
  )
);

CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  hospital_id UUID NULL,
  uploaded_by_patient_id UUID NULL,
  uploaded_by_staff_id UUID NULL,
  verified_by_staff_id UUID NULL,
  request_id UUID NULL REFERENCES public.document_requests(id) ON DELETE SET NULL,
  replaced_by_document_id UUID NULL REFERENCES public.medical_documents(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'patient',
  source_organization_name TEXT NULL,
  category TEXT NOT NULL,
  subtype TEXT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  visibility_status TEXT NOT NULL DEFAULT 'patient_and_connected_providers',
  service_date DATE NULL,
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT medical_documents_category_check CHECK (
    category IN ('labs', 'imaging', 'visits', 'prescriptions', 'insurance', 'other')
  ),
  CONSTRAINT medical_documents_source_type_check CHECK (
    source_type IN ('patient', 'provider', 'hospital', 'lab', 'pharmacy', 'insurance', 'other')
  ),
  CONSTRAINT medical_documents_verification_status_check CHECK (
    verification_status IN (
      'unverified',
      'patient_uploaded',
      'provider_uploaded',
      'provider_verified',
      'organization_verified',
      'rejected',
      'superseded'
    )
  ),
  CONSTRAINT medical_documents_visibility_status_check CHECK (
    visibility_status IN ('patient_only', 'patient_and_connected_providers')
  ),
  CONSTRAINT medical_documents_uploader_check CHECK (
    uploaded_by_patient_id IS NOT NULL OR uploaded_by_staff_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.medical_documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NULL,
  file_size_bytes INTEGER NULL,
  storage_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_requests_patient_id
  ON public.document_requests (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_requests_hospital_id
  ON public.document_requests (hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id
  ON public.medical_documents (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_documents_hospital_id
  ON public.medical_documents (hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_documents_category
  ON public.medical_documents (category, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_medical_documents_request_id
  ON public.medical_documents (request_id);

CREATE INDEX IF NOT EXISTS idx_document_files_document_id
  ON public.document_files (document_id, created_at DESC);
