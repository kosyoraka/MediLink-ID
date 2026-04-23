const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_VALIDATION_MESSAGE = "Enter a valid email address.";
export const STRONG_PASSWORD_MESSAGE =
  "Use at least 8 characters, including uppercase, lowercase, a number, and a special character.";

export function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
  const normalized = String(email ?? "").trim();
  return normalized.length > 0 && EMAIL_REGEX.test(normalized);
}

export function validateStrongPassword(password: string) {
  const value = String(password ?? "");

  const criteria = {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9\s]/.test(value),
  };

  return {
    criteria,
    isStrong: Object.values(criteria).every(Boolean),
  };
}
