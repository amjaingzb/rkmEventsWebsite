import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { markVerifiedAndIssueTicket } from "@/lib/ticket/issue";
import { computeAmountInr } from "./pricing";

/**
 * PhonePe PG v1 Standard Checkout — SANDBOX DEMO ONLY.
 *
 * The default merchant id / salt key / salt index below are PhonePe's
 * publicly published sandbox test credentials (shared by every integrator
 * testing against their preprod environment — not specific to this org,
 * safe to have as a fallback default). This module must never be pointed
 * at a real merchant account without a full security review, and nothing
 * here should be treated as proof of an actual payment on its own — see
 * the amount check in applyConfirmedPhonePeSuccess.
 *
 * Request/response shapes and the checksum construction below follow
 * PhonePe's documented PG v1 API, but haven't been exercised against a
 * live sandbox call yet — verify the exact webhook body shape and the
 * checksum's path-suffix nuance (present for /pg/v1/pay, absent for the
 * callback) during first real testing; PhonePe's API details can drift.
 *
 * Intentionally does NOT implement PaymentModule (src/lib/payment/types.ts)
 * — that interface models synchronous "caller already has proof, confirm
 * it" verification, while PhonePe is two-phase and webhook-driven with no
 * shared request context between initiate and verify. The isolation
 * property that actually matters is preserved instead: nothing outside
 * this file and the api/phonepe/* routes knows PhonePe's request/checksum
 * shapes, and every success path still funnels through the unchanged
 * markVerifiedAndIssueTicket seam.
 */

const DEFAULT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const DEFAULT_MERCHANT_ID = "PGTESTPAYUAT";
const DEFAULT_SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const DEFAULT_SALT_INDEX = "1";

function getMerchantId(): string {
  return process.env.PHONEPE_MERCHANT_ID || DEFAULT_MERCHANT_ID;
}
function getSaltKey(): string {
  return process.env.PHONEPE_SALT_KEY || DEFAULT_SALT_KEY;
}
function getSaltIndex(): string {
  return process.env.PHONEPE_SALT_INDEX || DEFAULT_SALT_INDEX;
}
function getBaseUrl(): string {
  return process.env.PHONEPE_BASE_URL || DEFAULT_BASE_URL;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** PhonePe's merchantTransactionId must be alphanumeric and length-capped —
 * a raw uuid (36 chars incl. dashes) doesn't safely fit; strip the dashes. */
export function toMerchantTxnId(registrationId: string): string {
  return registrationId.replace(/-/g, "");
}

interface InitiateInput {
  registrationId: string;
  amountInr: number;
  redirectUrl: string;
  callbackUrl: string;
}

interface InitiateResult {
  redirectUrl: string;
  merchantTransactionId: string;
}

export async function initiatePhonePePayment(
  input: InitiateInput
): Promise<InitiateResult> {
  const merchantTransactionId = toMerchantTxnId(input.registrationId);
  const merchantId = getMerchantId();

  const payload = {
    merchantId,
    merchantTransactionId,
    merchantUserId: merchantTransactionId,
    amount: Math.round(input.amountInr * 100), // paise
    redirectUrl: input.redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl: input.callbackUrl,
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum =
    sha256Hex(base64Payload + "/pg/v1/pay" + getSaltKey()) + "###" + getSaltIndex();

  const res = await fetch(`${getBaseUrl()}/pg/v1/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
    },
    body: JSON.stringify({ request: base64Payload }),
  });

  const data = await res.json();
  const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;

  if (!res.ok || !data?.success || !redirectUrl) {
    throw new Error(`PhonePe initiate failed: ${data?.message ?? res.status}`);
  }

  return { redirectUrl, merchantTransactionId };
}

export interface PhonePeCallbackPayload {
  success: boolean;
  code: string;
  message?: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number; // paise
    state: string;
    responseCode: string;
  };
}

function extractBase64Response(rawBody: string): string {
  const parsed = JSON.parse(rawBody) as { response: string };
  return parsed.response;
}

/** Verifies the webhook's X-VERIFY header. Checksum is over the raw base64
 * `response` field only, not the whole JSON body — must run before
 * decoding/trusting anything else in the payload. */
export function verifyPhonePeWebhookSignature(
  xVerifyHeader: string | null,
  rawBody: string
): boolean {
  if (!xVerifyHeader) return false;
  try {
    const base64Response = extractBase64Response(rawBody);
    const expected = sha256Hex(base64Response + getSaltKey()) + "###" + getSaltIndex();
    return xVerifyHeader === expected;
  } catch {
    return false;
  }
}

export function decodePhonePeWebhookBody(rawBody: string): PhonePeCallbackPayload {
  const base64Response = extractBase64Response(rawBody);
  const decoded = Buffer.from(base64Response, "base64").toString("utf-8");
  return JSON.parse(decoded);
}

/** Reconciliation fallback for when the browser redirect lands before the
 * webhook does — PhonePe's own guidance is to never trust the redirect
 * alone. Works from localhost too, unlike the inbound webhook, since it's
 * an outbound call our server makes. */
export async function checkPhonePeStatus(
  merchantTransactionId: string
): Promise<PhonePeCallbackPayload> {
  const merchantId = getMerchantId();
  const path = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const checksum = sha256Hex(path + getSaltKey()) + "###" + getSaltIndex();

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
      "X-MERCHANT-ID": merchantId,
    },
  });

  return res.json();
}

function isPhonePeSuccess(payload: PhonePeCallbackPayload): boolean {
  return payload.success === true && payload.code === "PAYMENT_SUCCESS";
}

interface RegistrationForPhonePe {
  id: string;
  num_attendees: number;
}

/**
 * The single place both the webhook and the status-reconciliation route
 * call into — never duplicate this sequence. Confirms the payload really
 * is a success, confirms the confirmed amount matches what this
 * registration owes (blocks a tampered/replayed callback from verifying an
 * under-paid registration), then hands off to the unchanged
 * markVerifiedAndIssueTicket seam.
 */
export async function applyConfirmedPhonePeSuccess(
  reg: RegistrationForPhonePe,
  payload: PhonePeCallbackPayload
): Promise<{ applied: boolean; reason?: string }> {
  if (!isPhonePeSuccess(payload)) {
    return { applied: false, reason: `not a success payload (code=${payload.code})` };
  }

  const expectedAmountPaise = computeAmountInr(reg.num_attendees) * 100;
  if (payload.data.amount !== expectedAmountPaise) {
    return {
      applied: false,
      reason: `amount mismatch: expected ${expectedAmountPaise}, got ${payload.data.amount}`,
    };
  }

  const supabase = createServiceClient();
  await supabase
    .from("registrations")
    .update({
      phonepe_transaction_id: payload.data.transactionId,
      phonepe_raw_response: payload,
    })
    .eq("id", reg.id);

  await markVerifiedAndIssueTicket(reg.id, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    verifiedBy: null,
    rawProviderResponse: payload,
  });

  return { applied: true };
}
