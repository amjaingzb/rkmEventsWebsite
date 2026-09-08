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
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const xVerify = req.headers.get("X-VERIFY");

  if (!verifyPhonePeWebhookSignature(xVerify, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload;
  try {
    payload = decodePhonePeWebhookBody(rawBody);
  } catch (err) {
    console.error("PhonePe webhook: malformed payload", err);
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, num_attendees")
    .eq("phonepe_merchant_txn_id", payload.data.merchantTransactionId)
    .single();

  if (!reg) {
    console.error(
      "PhonePe webhook: no registration for merchantTransactionId",
      payload.data.merchantTransactionId
    );
    return NextResponse.json({ ok: true });
  }

  const result = await applyConfirmedPhonePeSuccess(reg, payload);
  if (!result.applied) {
    console.error("PhonePe webhook: not applied —", result.reason);
  }

  return NextResponse.json({ ok: true });
}
