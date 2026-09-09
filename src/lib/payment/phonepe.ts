import { createHash } from "crypto";
import { isDevelopment } from "@/lib/appMode";
import { createServiceClient } from "@/lib/supabase/server";
import { markVerifiedAndIssueTicket } from "@/lib/ticket/issue";
import { computeAmountInr } from "./pricing";

/**
 * PhonePe PG **V2** "Standard Checkout" — SANDBOX DEMO ONLY.
 *
 * Rewritten 2026-09 from the original V1 implementation, which PhonePe
 * deprecated entirely (see docs/BACKLOG.md item 6 for the V1 postmortem).
 * V2 uses OAuth (client_id/client_secret → bearer token) instead of V1's
 * salt-key/checksum scheme, and — unlike V1 — has **no publicly shared UAT
 * credential**: every integrator, even in sandbox/Test Mode, must sign up
 * at business.phonepe.com and pull their own client_id/client_secret from
 * Developer Settings. That signup has not happened for this project yet,
 * so nothing in this file can be exercised end-to-end until it does — see
 * docs/BACKLOG.md item 6 for the up-to-date status.
 *
 * Endpoints, request/response shapes, and the webhook auth model below were
 * verified directly against developer.phonepe.com on 2026-09-09 (not
 * written from memory — that's exactly how the V1 version went stale
 * without anyone noticing). If PhonePe's API drifts again, re-check:
 *   https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization
 *   .../api-reference/create-payment/initiate-payment
 *   .../api-reference/order-status
 *   .../api-reference/webhook
 *
 * Credential resolution mirrors the old V1 file's safety property:
 * development mode always forces the sandbox environment, regardless of
 * PHONEPE_ENV — so a shared secrets file can never leak production
 * credentials into a local/dev run. Sandbox and production creds live in
 * separate env vars (PHONEPE_SANDBOX_* / PHONEPE_PRODUCTION_*) rather than
 * one pair, since V2 has no shared-public fallback to fall back to.
 *
 * Intentionally does NOT implement PaymentModule (src/lib/payment/types.ts)
 * — that interface models synchronous "caller already has proof, confirm
 * it" verification, while PhonePe is two-phase and webhook-driven with no
 * shared request context between initiate and verify. The isolation
 * property that actually matters is preserved instead: nothing outside
 * this file and the api/phonepe/* routes knows PhonePe's request/auth
 * shapes, and every success path still funnels through the unchanged
 * markVerifiedAndIssueTicket seam.
 */

const SANDBOX_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PRODUCTION_AUTH_BASE_URL = "https://api.phonepe.com/apis/identity-manager";
const PRODUCTION_PG_BASE_URL = "https://api.phonepe.com/apis/pg";

/** True whenever calls should go to PhonePe's UAT sandbox rather than
 * production — always true in development mode; in live mode, true unless
 * PHONEPE_ENV is exactly "production". */
function usingSandbox(): boolean {
  if (isDevelopment) return true;
  return (process.env.PHONEPE_ENV ?? "sandbox").toLowerCase() !== "production";
}

function getAuthBaseUrl(): string {
  return usingSandbox() ? SANDBOX_BASE_URL : PRODUCTION_AUTH_BASE_URL;
}
function getPgBaseUrl(): string {
  return usingSandbox() ? SANDBOX_BASE_URL : PRODUCTION_PG_BASE_URL;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set — sign up at business.phonepe.com, enable Test Mode, ` +
        `and copy the Client ID/Secret from Developer Settings (see docs/BACKLOG.md item 6).`
    );
  }
  return value;
}

function getClientId(): string {
  return requireEnv(usingSandbox() ? "PHONEPE_SANDBOX_CLIENT_ID" : "PHONEPE_PRODUCTION_CLIENT_ID");
}
function getClientSecret(): string {
  return requireEnv(
    usingSandbox() ? "PHONEPE_SANDBOX_CLIENT_SECRET" : "PHONEPE_PRODUCTION_CLIENT_SECRET"
  );
}
function getClientVersion(): string {
  const envVar = usingSandbox() ? "PHONEPE_SANDBOX_CLIENT_VERSION" : "PHONEPE_PRODUCTION_CLIENT_VERSION";
  return process.env[envVar] ?? "1";
}

/** True whenever PhonePe calls would currently resolve to the UAT sandbox
 * environment rather than real production — always true in development
 * mode, and true in live mode until PHONEPE_ENV=production is set. Drives
 * the environment banner (src/lib/environmentBanner.ts). Doesn't check
 * whether credentials are actually configured — a missing client id/secret
 * throws loudly the moment a call is attempted instead. */
export function isUsingSandboxCredentials(): boolean {
  return usingSandbox();
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

interface AccessToken {
  token: string;
  expiresAtMs: number;
}

let cachedToken: AccessToken | null = null;

/** Fetches (and caches in-memory) the O-Bearer access token required by
 * every other V2 call. Refreshed a bit before actual expiry to avoid races
 * against a call already in flight. Not persisted across server restarts
 * or serverless cold starts — refetched on demand, which is fine since the
 * token endpoint has no rate-limit documented for that. */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - 30_000 > now) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    client_id: getClientId(),
    client_version: getClientVersion(),
    client_secret: getClientSecret(),
    grant_type: "client_credentials",
  });

  const res = await fetch(`${getAuthBaseUrl()}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data?.access_token) {
    throw new Error(`PhonePe auth failed: ${data?.message ?? res.status}`);
  }

  const expiresAtSeconds: number = data.expires_at ?? Math.floor(now / 1000) + 3000;
  cachedToken = { token: data.access_token, expiresAtMs: expiresAtSeconds * 1000 };
  return cachedToken.token;
}

interface InitiateInput {
  registrationId: string;
  amountInr: number;
  redirectUrl: string;
}

interface InitiateResult {
  redirectUrl: string;
  merchantOrderId: string;
}

export async function initiatePhonePePayment(input: InitiateInput): Promise<InitiateResult> {
  // V2 allows hyphens/underscores in merchantOrderId (max 63 chars), so the
  // raw registration uuid fits directly — no stripping needed, unlike V1.
  const merchantOrderId = input.registrationId;
  const accessToken = await getAccessToken();

  const payload = {
    merchantOrderId,
    amount: Math.round(input.amountInr * 100), // paise
    expireAfter: 1200, // seconds; PhonePe allows 300-3600
    paymentFlow: {
      type: "PG_CHECKOUT",
      merchantUrls: { redirectUrl: input.redirectUrl },
    },
  };

  const res = await fetch(`${getPgBaseUrl()}/checkout/v2/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data?.redirectUrl) {
    throw new Error(`PhonePe initiate failed: ${data?.message ?? res.status}`);
  }

  return { redirectUrl: data.redirectUrl, merchantOrderId };
}

interface PhonePePaymentDetail {
  transactionId?: string;
  paymentMode?: string;
  state?: string;
}

/** Shape shared by both the webhook's `payload` object and the order-status
 * response body — PhonePe's own guidance is to key off `state` here (not
 * the webhook's outer `event` field, and not the deprecated V1 `code`),
 * since it's present and consistent across both. */
export interface PhonePeOrderState {
  orderId: string;
  state: string; // "COMPLETED" | "FAILED" | "PENDING" | ...
  amount: number; // paise
  paymentDetails?: PhonePePaymentDetail[];
}

export interface PhonePeWebhookBody {
  event: string;
  payload: PhonePeOrderState & { merchantOrderId: string; merchantId?: string };
}

/** Verifies the webhook's Authorization header against the SHA (username +
 * password) auth method — the simpler of PhonePe's two webhook auth
 * options (the other, HMAC, needs a key-id → secret lookup and isn't worth
 * the extra complexity for a single-webhook sandbox demo). PhonePe hashes
 * as SHA256("username:password") and sends the hex digest verbatim in the
 * Authorization header — no scheme prefix, no request-body involvement. */
export function verifyPhonePeWebhookSignature(authorizationHeader: string | null): boolean {
  if (!authorizationHeader) return false;
  const username = process.env.PHONEPE_WEBHOOK_USERNAME;
  const password = process.env.PHONEPE_WEBHOOK_PASSWORD;
  if (!username || !password) return false;
  const expected = sha256Hex(`${username}:${password}`);
  return authorizationHeader.trim() === expected;
}

export function decodePhonePeWebhookBody(rawBody: string): PhonePeWebhookBody {
  return JSON.parse(rawBody);
}

/** Reconciliation fallback for when the browser redirect lands before the
 * webhook does — PhonePe's own guidance is to never trust the redirect
 * alone. Works from localhost too, unlike the inbound webhook, since it's
 * an outbound call our server makes. */
export async function checkPhonePeStatus(merchantOrderId: string): Promise<PhonePeOrderState> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `${getPgBaseUrl()}/checkout/v2/order/${merchantOrderId}/status?details=false`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
      },
    }
  );
  return res.json();
}

function isPhonePeSuccess(orderState: PhonePeOrderState): boolean {
  return orderState.state === "COMPLETED";
}

interface RegistrationForPhonePe {
  id: string;
  num_attendees: number;
}

/**
 * The single place both the webhook and the status-reconciliation route
 * call into — never duplicate this sequence. Confirms the order really is
 * COMPLETED, confirms the confirmed amount matches what this registration
 * owes (blocks a tampered/replayed callback from verifying an under-paid
 * registration), then hands off to the unchanged markVerifiedAndIssueTicket
 * seam.
 */
export async function applyConfirmedPhonePeSuccess(
  reg: RegistrationForPhonePe,
  orderState: PhonePeOrderState
): Promise<{ applied: boolean; reason?: string }> {
  if (!isPhonePeSuccess(orderState)) {
    return { applied: false, reason: `not a completed order (state=${orderState.state})` };
  }

  const expectedAmountPaise = computeAmountInr(reg.num_attendees) * 100;
  if (orderState.amount !== expectedAmountPaise) {
    return {
      applied: false,
      reason: `amount mismatch: expected ${expectedAmountPaise}, got ${orderState.amount}`,
    };
  }

  const transactionId = orderState.paymentDetails?.[0]?.transactionId ?? orderState.orderId;

  const supabase = createServiceClient();
  await supabase
    .from("registrations")
    .update({
      phonepe_transaction_id: transactionId,
      phonepe_raw_response: orderState,
    })
    .eq("id", reg.id);

  await markVerifiedAndIssueTicket(reg.id, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    verifiedBy: null,
    rawProviderResponse: orderState,
  });

  return { applied: true };
}
