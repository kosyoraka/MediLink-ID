const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

function getToken(): string | null {
  return (
    localStorage.getItem("patient_token") ||
    localStorage.getItem("patientToken") ||
    localStorage.getItem("token") ||
    null
  );
}

function getPatientId(): string | null {
  return localStorage.getItem("patientId") || localStorage.getItem("patient_id") || null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }
  return data as T;
}

export type Provider = {
  id: string;
  name: string;
  type: string;
  connected_at?: string;
};

export type StaffUser = {
  id: string;
  full_name: string;
  role: string;
};

export type PatientConversationSummary = {
  id: string;
  provider_id: string;
  provider_name: string;
  staff_id: string;
  staff_name: string;
  staff_role: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  can_send?: boolean;
};

export type PatientMessage = {
  id: string;
  sender_type: "patient" | "staff" | "system";
  body: string;
  created_at: string;
};

export type PatientAppointment = {
  id: string;
  patientId: string;
  staffId: string;
  hospitalId: string;
  hospitalName?: string | null;
  providerName: string;
  appointmentType: string; // currently from appointments.specialty
  visitMode: string; // currently from appointments.type (in-person/virtual/phone)
  startTime: string; // ISO
  status: string;
  notes: string;
};

export type PatientNotification = {
  id: string;
  title: string;
  detail: string;
  isoDate: string;
  unread: boolean;
  screen?: string;
};

export type RecordDocument = {
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

export type RecordRequest = {
  id: string;
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

export type HealthSummaryVital = {
  recordedAt: string;
  type?: "bloodPressure" | "heartRate" | "weight" | "bloodSugar";
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  weight?: number;
  weightUnit?: "lbs" | "kg";
  bloodSugar?: number;
};

export type HealthSummaryCondition = {
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

export type HealthSummaryAllergy = {
  id: string;
  name: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
  reaction: string;
};

export type HealthSummaryImmunization = {
  id: string;
  name: string;
  detail: string;
  dose?: string;
  date?: string;
  status: string;
};

export type HealthSummaryFamilyHistory = {
  id: string;
  relation: string;
  condition: string;
};

export type HealthSummaryEmergencyContact = {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
};

export type PatientProfile = {
  patient_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;
  insurance?: string | null;
  home_address_line1?: string | null;
  home_address_line2?: string | null;
  home_city?: string | null;
  home_province?: string | null;
  home_postal_code?: string | null;
  mailing_same_as_home?: boolean | null;
  mailing_address_line1?: string | null;
  mailing_address_line2?: string | null;
  mailing_city?: string | null;
  mailing_province?: string | null;
  mailing_postal_code?: string | null;
};

export type PatientEmergencyProfile = {
  patient_id: string;
  share_personal_info: boolean;
  share_blood_type: boolean;
  share_allergies: boolean;
  share_medical_conditions: boolean;
  share_current_medications: boolean;
  share_emergency_contacts: boolean;
  share_advance_directives: boolean;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  current_medications: string | null;
  emergency_contact_full_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  dnr_status: string | null;
  living_will: string | null;
  emergency_access_code_set?: boolean;
  updated_at: string | null;
};

export type HealthSummaryAdvanceDirectives = {
  dnrStatus?: string;
  livingWill?: string;
};

export type HealthSummaryPayload = {
  vitals: HealthSummaryVital[];
  conditions: HealthSummaryCondition[];
  allergies: HealthSummaryAllergy[];
  bloodType: string | null;
  currentMedications: string[];
  emergencyContacts: HealthSummaryEmergencyContact[];
  advanceDirectives: HealthSummaryAdvanceDirectives;
  immunizations: HealthSummaryImmunization[];
  familyHistory: HealthSummaryFamilyHistory[];
  updatedAt: string | null;
};

export type PatientMedication = {
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

export const api = {
  // directory
  listProviders: () => request<{ providers: Provider[] }>("/api/providers"),

  // patient connections
  listMyProviders: () => request<{ providers: Provider[] }>("/api/patients/me/providers"),
  getMyProfile: () => {
    const patientId = getPatientId();
    if (!patientId) throw new Error("Missing patientId");
    return request<PatientProfile>(`/api/patients/${patientId}/profile`);
  },
  getMyEmergencyProfile: () => {
    const patientId = getPatientId();
    if (!patientId) throw new Error("Missing patientId");
    return request<PatientEmergencyProfile>(`/api/patients/${patientId}/emergency-profile`);
  },
  connectProvider: (providerId: string, source: "signup" | "settings") =>
    request<{ ok: boolean; alreadyConnected?: boolean }>("/api/patients/me/providers", {
      method: "POST",
      body: JSON.stringify({ providerId, source }),
    }),
  disconnectProvider: (providerId: string) =>
    request<{ ok: boolean; updated?: number }>(`/api/patients/me/providers/${providerId}`, {
      method: "DELETE",
    }),

  // appointments (patient)
  listMyAppointments: (
    status: "upcoming" | "today" | "completed" | "cancelled" | "all" = "upcoming"
  ) => request<{ appointments: PatientAppointment[] }>(`/api/patient/appointments?status=${status}`),
  listMyNotifications: () => request<{ notifications: PatientNotification[] }>("/api/patient/notifications"),
  markMyNotificationsRead: () => request<{ ok: boolean }>("/api/patient/notifications/read", {
    method: "POST",
  }),

  listMyRecords: (params: {
    category?: string;
    source?: "all" | "patient" | "provider";
    verification?: "all" | "verified" | "pending" | "patient_uploaded";
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.category && params.category !== "all") qs.set("category", params.category);
    if (params.source && params.source !== "all") qs.set("source", params.source);
    if (params.verification && params.verification !== "all") qs.set("verification", params.verification);
    if (params.search?.trim()) qs.set("search", params.search.trim());
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ documents: RecordDocument[] }>(`/api/patient/records${suffix}`);
  },
  getMyRecord: (documentId: string) =>
    request<{ document: RecordDocument }>(`/api/patient/records/${documentId}`),
  uploadMyRecord: (body: {
    hospitalId?: string;
    category: string;
    subtype?: string;
    title: string;
    description?: string;
    sourceOrganizationName?: string;
    serviceDate?: string;
    fileName: string;
    mimeType?: string;
    fileSizeBytes?: number;
    fileDataUrl: string;
  }) =>
    request<{ document: RecordDocument }>("/api/patient/records/upload", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listMyRecordRequests: () => request<{ requests: RecordRequest[] }>("/api/patient/record-requests"),
  createRecordRequest: (body: {
    hospitalId: string;
    category: string;
    subtype?: string;
    message?: string;
  }) =>
    request<{ request: RecordRequest }>("/api/patient/record-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getMyHealthSummary: () => request<{ summary: HealthSummaryPayload }>("/api/patient/health-summary"),
  updateMyHealthSummary: (body: Omit<HealthSummaryPayload, "updatedAt">) =>
    request<{ summary: HealthSummaryPayload }>("/api/patient/health-summary", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  listMyConditions: () => request<{ conditions: HealthSummaryCondition[] }>("/api/patient/conditions"),
  createMyCondition: (body: {
    name: string;
    status?: string;
    diagnosed?: string;
    metric?: string;
    notes?: string;
  }) =>
    request<{ condition: HealthSummaryCondition }>("/api/patient/conditions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMyCondition: (
    conditionId: string,
    body: {
      name?: string;
      status?: string;
      diagnosed?: string;
      metric?: string;
      notes?: string;
      isActive?: boolean;
    }
  ) =>
    request<{ condition: HealthSummaryCondition }>(`/api/patient/conditions/${conditionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteMyCondition: (conditionId: string) =>
    request<{ ok: boolean }>(`/api/patient/conditions/${conditionId}`, {
      method: "DELETE",
    }),
  requestConditionChange: (conditionId: string, body: { message: string }) =>
    request<{ ok: boolean; conversationId: string }>(`/api/patient/conditions/${conditionId}/request-change`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listMyMedications: () => request<{ medications: PatientMedication[] }>("/api/patient/medications"),
  createMyMedication: (body: {
    name: string;
    dosage?: string;
    frequency?: string;
    purpose?: string;
    pharmacy?: string;
    startDate?: string;
    notes?: string;
  }) =>
    request<{ medication: PatientMedication }>("/api/patient/medications", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMyMedication: (
    medicationId: string,
    body: {
      name?: string;
      dosage?: string;
      frequency?: string;
      purpose?: string;
      pharmacy?: string;
      startDate?: string;
      notes?: string;
      remindersEnabled?: boolean;
      adherenceStatus?: PatientMedication["adherenceStatus"];
      isActive?: boolean;
    }
  ) =>
    request<{ medication: PatientMedication }>(`/api/patient/medications/${medicationId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  requestMedicationRefill: (medicationId: string) =>
    request<{ ok: boolean; alreadyOpen?: boolean; conversationId?: string; medication: PatientMedication }>(`/api/patient/medications/${medicationId}/refill-request`, {
      method: "POST",
    }),
  requestMedicationChange: (medicationId: string, body: { message: string }) =>
    request<{ ok: boolean; conversationId: string }>(`/api/patient/medications/${medicationId}/request-change`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logMedicationIntake: (
    medicationId: string,
    body: { status: "taken" | "missed" | "skipped"; loggedForDate?: string; note?: string }
  ) =>
    request<{
      log: {
        id: string;
        loggedForDate: string;
        status: "taken" | "missed" | "skipped";
        note: string;
        createdAt: string;
      };
      medication: PatientMedication;
    }>(`/api/patient/medications/${medicationId}/intake-logs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listConnectedHospitals: () =>
    request<Array<{ hospitalId: string; hospitalName: string; hospitalCity: string }>>(
      "/api/patient/hospitals"
    ),

  // messaging (patient)
  listPatientConversations: () =>
    request<{ conversations: PatientConversationSummary[] }>(
      "/api/patients/me/messages/conversations"
    ),

  getPatientMessages: (conversationId: string) =>
    request<{ messages: PatientMessage[] }>(
      `/api/patients/me/messages/conversations/${conversationId}/messages`
    ),

  sendPatientMessage: (conversationId: string, body: string) =>
    request<{ message: PatientMessage }>(
      `/api/patients/me/messages/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      }
    ),

  markPatientConversationRead: (conversationId: string) =>
    request<{ ok: true }>(`/api/patients/me/messages/conversations/${conversationId}/read`, {
      method: "POST",
    }),

  // provider staff list for patient (active connection only)
  listProviderStaffForPatient: (providerId: string) =>
    request<{ staff: StaffUser[] }>(`/api/patients/me/providers/${providerId}/staff`),

  // start a new conversation (patient → staff)
  startPatientConversation: (providerId: string, staffId: string) =>
    request<{ conversationId: string }>(`/api/patients/me/messages/conversations/start`, {
      method: "POST",
      body: JSON.stringify({ providerId, staffId }),
    }),
};
