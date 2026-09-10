const NAME_HAS_DIGIT_RE = /\d/;

/** Strips an optional +91/91 prefix and returns the remaining digits. */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s-]/g, "").replace(/^(\+?91)/, "");
}

export function validateFullName(fullName: string): string | undefined {
  if (!fullName) return "Please enter your full name.";
  if (NAME_HAS_DIGIT_RE.test(fullName)) return "Name shouldn't contain numbers.";
  return undefined;
}

export function validatePhone(rawPhone: string): string | undefined {
  if (!rawPhone.trim()) return "Please enter your phone number.";
  const digits = normalizePhone(rawPhone);
  if (!/^\d{10}$/.test(digits)) {
    return "Please enter a valid 10-digit phone number.";
  }
  return undefined;
}
