const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVALID_EMAIL_MESSAGE = "Enter a valid email address";
export const STRONG_PASSWORD_MESSAGE =
  "Use at least 8 characters, including uppercase, lowercase, a number, and a special character";

export function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email: unknown) {
  const normalized = String(email ?? "").trim();
  return normalized.length > 0 && EMAIL_REGEX.test(normalized);
}

export function isStrongPassword(password: unknown) {
  const value = String(password ?? "");

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value)
  );
}
