const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_VALIDATION_MESSAGE = "Enter a valid email address.";
export const STRONG_PASSWORD_MESSAGE =
  "Use at least 8 characters, including uppercase, lowercase, a number, and a special character.";

export type PasswordValidationResult = {
  criteria: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  isStrong: boolean;
  label: "" | "Weak" | "Almost there" | "Strong";
  strength: 0 | 1 | 2 | 3;
};

export function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
  const normalized = String(email ?? "").trim();
  return normalized.length > 0 && EMAIL_REGEX.test(normalized);
}

export function validateStrongPassword(password: string): PasswordValidationResult {
  const value = String(password ?? "");
  const criteria = {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9\s]/.test(value),
  };
  const matchedCriteria = Object.values(criteria).filter(Boolean).length;

  let strength: PasswordValidationResult["strength"] = 0;
  if (value.length > 0) {
    if (matchedCriteria <= 2) {
      strength = 1;
    } else if (matchedCriteria < 5) {
      strength = 2;
    } else {
      strength = 3;
    }
  }

  const labelMap: Record<PasswordValidationResult["strength"], PasswordValidationResult["label"]> = {
    0: "",
    1: "Weak",
    2: "Almost there",
    3: "Strong",
  };

  return {
    criteria,
    isStrong: matchedCriteria === 5,
    label: labelMap[strength],
    strength,
  };
}
