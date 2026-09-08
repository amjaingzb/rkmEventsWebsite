// Single source of truth for the registration fee. Isomorphic (no server-only
// imports) so it can be imported from client components too, to keep the
// displayed amount and the submitted amount from ever drifting apart.
export const PRICE_PER_ATTENDEE_INR = 500;

export function computeAmountInr(numAttendees: number): number {
  return PRICE_PER_ATTENDEE_INR * numAttendees;
}
