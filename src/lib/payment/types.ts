/**
 * The payment module boundary. `manual.ts` implements this interface —
 * verification is synchronous ("caller already has proof, confirm it").
 * `phonepe.ts` does NOT implement it: PhonePe is two-phase/webhook-driven,
 * with no shared request context between initiate and verify, so a fake
 * synchronous verifyPayment would add nothing. Both still funnel every
 * success path through the same markVerifiedAndIssueTicket seam, which is
 * the isolation point that actually matters — see src/lib/payment/phonepe.ts.
 */

export interface PaymentVerificationRequest {
  registrationId: string;
  paymentReference: string;
  amount: number;
  method: "manual" | "phonepe";
}

export interface PaymentVerificationResult {
  verified: boolean;
  verifiedAt: string;
  verifiedBy: string | null;
  rawProviderResponse?: unknown;
}

export interface PaymentModule {
  verifyPayment(
    req: PaymentVerificationRequest
  ): Promise<PaymentVerificationResult>;
}
