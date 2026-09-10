const NAME_HAS_DIGIT_RE = /\d/;

/** Strips a +91 prefix, or a bare 91 prefix only when it's part of a
 * 12-digit country-code+number string — a plain 10-digit number that
 * happens to start with "91" (e.g. 9123456789) must be left alone. */
export function normalizePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[\s-]/g, "");
  if (cleaned.startsWith("+91")) return cleaned.slice(3);
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned.slice(2);
  return cleaned;
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
