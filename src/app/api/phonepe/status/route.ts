import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkPhonePeStatus, applyConfirmedPhonePeSuccess } from "@/lib/payment/phonepe";

// Reconciliation fallback for when the browser's redirect back from PhonePe
// lands before the S2S webhook does. Also doubles as the local-dev testing
// path for verification — unlike the webhook, this is an outbound call our
// server makes, so it works from localhost.
export async function GET(req: NextRequest) {
  const registrationId = req.nextUrl.searchParams.get("registrationId");
  if (!registrationId) {
    return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("id, status, num_attendees, phonepe_merchant_txn_id")
    .eq("id", registrationId)
    .single();

  if (!reg || !reg.phonepe_merchant_txn_id) {
    return NextResponse.json({ status: reg?.status ?? "unknown" });
  }

  if (reg.status !== "pending") {
    return NextResponse.json({ status: reg.status });
  }

  const payload = await checkPhonePeStatus(reg.phonepe_merchant_txn_id);
  const result = await applyConfirmedPhonePeSuccess(reg, payload);

  return NextResponse.json({ status: result.applied ? "verified" : reg.status });
}
