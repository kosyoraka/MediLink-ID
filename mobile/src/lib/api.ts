import { getItem, multiSet } from './storage';

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

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

  signUp: async (email: string, password: string, acceptedTerms: boolean) => {
    const data = await request<SignUpResponse>('/api/auth/signup', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password, acceptedTerms, hospitalId: '' }),
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
};
