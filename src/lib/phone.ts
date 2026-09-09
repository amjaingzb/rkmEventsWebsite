/**
 * Shared phone normalization — same rule used for WhatsApp deep links
 * (AdminTable.tsx) and duplicate-registration detection
 * (registration/register.ts): strip everything but digits, and if that's
 * exactly 10 digits (a bare India number with no country code), prepend
 * "91" so it matches numbers submitted with the country code already on.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
