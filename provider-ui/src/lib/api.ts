const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const token =
    localStorage.getItem("medilink_token") ||
    sessionStorage.getItem("medilink_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || data?.error || "Request failed";

    if (res.status === 401) {
      try {
        localStorage.removeItem("medilink_token");
        localStorage.removeItem("medilink_staff");
        sessionStorage.removeItem("medilink_token");
        sessionStorage.removeItem("medilink_staff_session");
      } catch {
        // ignore storage failures
      }
    }

    throw new Error(msg);
  }

  return data as T;
}

export type ProviderDocument = {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string | null;
  hospitalName: string | null;
  title: string;
  category: "labs" | "imaging" | "visits" | "prescriptions" | "insurance" | "other";
  subtype: string | null;
  description: string;
  sourceType: string;
  sourceOrganizationName: string;
  verificationStatus: string;
  verificationLabel: string;
  visibilityStatus: string;
  serviceDate: string | null;
  uploadDate: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  fileSizeLabel: string;
  fileUrl: string;
  requestId: string | null;
  uploadedBy: string;
  verifiedByName: string | null;
};

export type ProviderDocumentRequest = {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  hospitalName: string;
  category: string;
  subtype: string | null;
  message: string;
  status: string;
  linkedDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type ProviderHealthSummaryVital = {
  recordedAt: string;
  type?: "bloodPressure" | "heartRate" | "weight" | "bloodSugar";
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  weight?: number;
  weightUnit?: "lbs" | "kg";
  bloodSugar?: number;
};

export type ProviderHealthSummaryCondition = {
  id: string;
  patientId?: string;
  hospitalId?: string | null;
  hospitalName?: string | null;
  staffId?: string | null;
  sourceType?: "provider" | "patient";
  verificationStatus?: "provider_verified" | "patient_noted" | "provider_reviewed";
  name: string;
  status: string;
  diagnosed: string;
  metric: string;
  provider: string;
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProviderHealthSummaryAllergy = {
  id: string;
  name: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
  reaction: string;
};

export type ProviderHealthSummaryImmunization = {
  id: string;
  name: string;
  detail: string;
  dose?: string;
  date?: string;
  status: string;
};

export type ProviderHealthSummaryFamilyHistory = {
  id: string;
  relation: string;
  condition: string;
};

export type ProviderHealthSummaryEmergencyContact = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
};

export type ProviderHealthSummary = {
  vitals: ProviderHealthSummaryVital[];
  conditions: ProviderHealthSummaryCondition[];
  allergies: ProviderHealthSummaryAllergy[];
  bloodType: string | null;
  currentMedications: string[];
  emergencyContacts: ProviderHealthSummaryEmergencyContact[];
  advanceDirectives: {
    dnrStatus?: string;
    livingWill?: string;
  };
  immunizations: ProviderHealthSummaryImmunization[];
  familyHistory: ProviderHealthSummaryFamilyHistory[];
  updatedAt: string | null;
};

export type ProviderMedication = {
  id: string;
  patientId: string;
  hospitalId: string | null;
  hospitalName: string | null;
  staffId: string | null;
  sourceType: "provider" | "patient";
  verificationStatus: "provider_prescribed" | "patient_added";
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  prescriberName: string;
  pharmacy: string;
  startDate: string | null;
  endDate: string | null;
  refillsRemaining: number | null;
  notes: string;
  remindersEnabled: boolean;
  adherenceStatus: "not_started" | "on_track" | "missed_doses" | "stopped";
  lastIntakeStatus: "taken" | "missed" | "skipped" | null;
  lastIntakeDate: string | null;
  recentIntakeLogs: Array<{
    id: string;
    loggedForDate: string;
    status: "taken" | "missed" | "skipped";
    note: string;
    createdAt: string;
  }>;
  isActive: boolean;
  lastRefillRequestedAt: string | null;
  latestRefillRequestId: string | null;
  latestRefillRequestStatus: "open" | "approved" | "denied" | null;
  latestRefillRequestNote: string;
  latestRefillRequestCreatedAt: string | null;
  latestRefillRequestResolvedAt: string | null;
  latestRefillRequestResolutionNote: string;
  createdAt: string;
  updatedAt: string;
};
