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
