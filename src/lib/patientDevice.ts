const STORAGE_KEY = 'medilink_patient_device_id';

function createDeviceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `device-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function getPatientDeviceId() {
  if (typeof window === 'undefined') return undefined;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const next = createDeviceId();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}
