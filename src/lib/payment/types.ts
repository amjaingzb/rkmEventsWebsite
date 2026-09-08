/**
 * The payment module boundary. Both the manual (Phase A/B production) and
 * PhonePe sandbox-demo (Phase B) implementations satisfy this interface.
 * Nothing outside src/lib/payment/** should know which one is in use —
 * callers depend only on this contract, so swapping manual -> automatic
 * later touches only this directory.
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
