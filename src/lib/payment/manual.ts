import type { PaymentModule, PaymentVerificationResult } from "./types";

/**
 * Phase A/B production payment path: an admin has looked at the payment
 * reference the registrant typed in (UPI/bank transfer ref) and confirmed it
 * out-of-band, then clicked "Verify" in the admin dashboard. There is no
 * provider callback to trust here — the admin's click *is* the verification.
 */
export const manualPaymentModule: PaymentModule = {
  async verifyPayment(): Promise<PaymentVerificationResult> {
    // This module never knows *who* clicked verify — the caller (the admin
    // API route, which has the session) fills in verifiedBy before persisting.
    return {
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: null,
      rawProviderResponse: null,
    };
  },
};
