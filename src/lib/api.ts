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

export const api = {
  // directory
  listProviders: () => request<{ providers: Provider[] }>("/api/providers"),

  // patient connections
  listMyProviders: () => request<{ providers: Provider[] }>("/api/patients/me/providers"),
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
