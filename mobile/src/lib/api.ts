import { getItem, multiSet } from './storage';

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.medilinkid.com'
).replace(/\/$/, '');

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export type SignInResponse = {
  id: string;
  email: string;
  token: string;
};

export type SignUpResponse = SignInResponse;

export type ProfileResponse = {
  patient_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;
};

export type EmergencyLinkResponse = {
  token: string;
  url: string;
};

export type HospitalOption = {
  id: string;
  name: string;
  city: string;
};

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

export type PatientAppointment = {
  id: string;
  patientId: string;
  staffId: string;
  hospitalId: string;
  hospitalName?: string | null;
  providerName: string;
  appointmentType: string;
  visitMode: string;
  startTime: string;
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
  category: 'labs' | 'imaging' | 'visits' | 'prescriptions' | 'insurance' | 'other';
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
  sender_type: 'patient' | 'staff' | 'system';
  body: string;
  created_at: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.auth !== false) {
    const token = await getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data
      ? String((data as { message?: string }).message)
      : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  signIn: async (email: string, password: string) => {
    const data = await request<SignInResponse>('/api/auth/signin', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    });

    await multiSet({ patientId: data.id, email: data.email, token: data.token });
    return data;
  },

  signUp: async (
    email: string,
    password: string,
    acceptedTerms: boolean,
    hospitalId?: string
  ) => {
    const data = await request<SignUpResponse>('/api/auth/signup', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({
        email,
        password,
        acceptedTerms,
        hospitalId: hospitalId || undefined,
      }),
    });

    await multiSet({ patientId: data.id, email: data.email, token: data.token });
    return data;
  },

  saveProfile: async (payload: {
    firstName: string;
    lastName: string;
    dob: string;
    healthCard: string;
    phoneNumber: string;
  }) => {
    const patientId = await getItem('patientId');
    if (!patientId) {
      throw new Error('Missing patient ID. Please sign up again.');
    }

    return request(`/api/patients/${patientId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getProfile: async () => {
    const patientId = await getItem('patientId');
    if (!patientId) {
      throw new Error('Missing patient ID.');
    }

    return request<ProfileResponse>(`/api/patients/${patientId}/profile`);
  },

  getEmergencyLink: async () => {
    const patientId = await getItem('patientId');
    if (!patientId) {
      throw new Error('Missing patient ID.');
    }

    return request<EmergencyLinkResponse>(`/api/patients/${patientId}/emergency-link`);
  },

  getHospitals: async () => request<HospitalOption[]>('/api/hospitals', { auth: false }),
  listProviders: async () => request<{ providers: Provider[] }>('/api/providers'),
  listMyProviders: async () => request<{ providers: Provider[] }>('/api/patients/me/providers'),
  connectProvider: async (providerId: string, source: 'signup' | 'settings') =>
    request<{ ok: boolean; alreadyConnected?: boolean }>('/api/patients/me/providers', {
      method: 'POST',
      body: JSON.stringify({ providerId, source }),
    }),
  disconnectProvider: async (providerId: string) =>
    request<{ ok: boolean; updated?: number }>(`/api/patients/me/providers/${providerId}`, {
      method: 'DELETE',
    }),

  listMyAppointments: async (
    status: 'upcoming' | 'today' | 'completed' | 'cancelled' | 'all' = 'upcoming'
  ) => request<{ appointments: PatientAppointment[] }>(`/api/patient/appointments?status=${status}`),

  listMyRecords: async (params: {
    category?: string;
    source?: 'all' | 'patient' | 'provider';
    verification?: 'all' | 'verified' | 'pending' | 'patient_uploaded';
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.category && params.category !== 'all') qs.set('category', params.category);
    if (params.source && params.source !== 'all') qs.set('source', params.source);
    if (params.verification && params.verification !== 'all') qs.set('verification', params.verification);
    if (params.search?.trim()) qs.set('search', params.search.trim());
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ documents: RecordDocument[] }>(`/api/patient/records${suffix}`);
  },

  listMyRecordRequests: async () =>
    request<{ requests: RecordRequest[] }>('/api/patient/record-requests'),

  listPatientConversations: async () =>
    request<{ conversations: PatientConversationSummary[] }>(
      '/api/patients/me/messages/conversations'
    ),

  getPatientMessages: async (conversationId: string) =>
    request<{ messages: PatientMessage[] }>(
      `/api/patients/me/messages/conversations/${conversationId}/messages`
    ),

  sendPatientMessage: async (conversationId: string, body: string) =>
    request<{ message: PatientMessage }>(
      `/api/patients/me/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    ),

  markPatientConversationRead: async (conversationId: string) =>
    request<{ ok: true }>(`/api/patients/me/messages/conversations/${conversationId}/read`, {
      method: 'POST',
    }),

  listProviderStaffForPatient: async (providerId: string) =>
    request<{ staff: StaffUser[] }>(`/api/patients/me/providers/${providerId}/staff`),

  startPatientConversation: async (providerId: string, staffId: string) =>
    request<{ conversationId: string }>(`/api/patients/me/messages/conversations/start`, {
      method: 'POST',
      body: JSON.stringify({ providerId, staffId }),
    }),
};
