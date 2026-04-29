// src/config/api.ts
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export function getPatientToken(): string | null {
  return (
    localStorage.getItem("patient_token") ||
    localStorage.getItem("patientToken") ||
    localStorage.getItem("token") ||
    null
  );
}

export function patientAuthHeaders(extra: Record<string, string> = {}) {
  const token = getPatientToken();

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
