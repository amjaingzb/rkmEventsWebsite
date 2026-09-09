import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  verifyPhonePeWebhookSignature,
  decodePhonePeWebhookBody,
  applyConfirmedPhonePeSuccess,
} from "@/lib/payment/phonepe";

// PhonePe's S2S callback. Always returns 200 once the signature has been
// checked — PhonePe retries on non-2xx, and a not-found/mismatch is logged
// server-side rather than surfaced in the response (no info leak to a
// caller that isn't proven to be PhonePe until the signature check passes).
// The webhook URL itself is configured statically in the PhonePe Business
// Dashboard (Developer Settings → Webhook), not passed per-request as it
// was in V1 — this route's path must match whatever's configured there.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const authorization = req.headers.get("Authorization");

  if (!verifyPhonePeWebhookSignature(authorization)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body;
  try {
    body = decodePhonePeWebhookBody(rawBody);
  } catch (err) {
    console.error("PhonePe webhook: malformed payload", err);
    return NextResponse.json({ ok: true });
  }

  const { payload } = body;

  const supabase = createServiceClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, num_attendees")
    .eq("phonepe_merchant_txn_id", payload.merchantOrderId)
    .single();

  if (!reg) {
    console.error("PhonePe webhook: no registration for merchantOrderId", payload.merchantOrderId);
    return NextResponse.json({ ok: true });
  }

  const result = await applyConfirmedPhonePeSuccess(reg, payload);
  if (!result.applied) {
    console.error("PhonePe webhook: not applied —", result.reason);
  }

  return NextResponse.json({ ok: true });
}
