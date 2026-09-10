import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";
import { manualPaymentModule } from "@/lib/payment/manual";
import { markVerifiedAndIssueTicket } from "@/lib/ticket/issue";
import { isPhonePeGateBlocking } from "@/lib/registration/phonepeGate";

const PHONEPE_GATE_MESSAGE =
  "This registration is in PhonePe mode — pending payments are confirmed " +
  "automatically. Manual verification unlocks after 1 hour if it's still stuck.";

export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    const user = await requireAdminSession();
    adminUserId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { registrationId, paymentReference, amount } = await req.json();
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from("registrations")
    .select("status")
    .eq("id", registrationId)
    .single();

  if (current?.status === "rejected") {
    // Reused "Verify" click on a rejected row: reinstate to pending first,
    // then fall through to the normal verify flow below, unmodified. A
    // rejected row is exempt from the PhonePe gate -- it can only ever
    // reach `rejected` via the manual admin button, so it's already
    // outside PhonePe's automated tracking.
    const { data: reinstated, error: reinstateError } = await supabase.rpc(
      "reinstate_registration",
      { p_registration_id: registrationId, p_reinstated_by: adminUserId }
    );
    if (reinstateError) {
      return NextResponse.json({ error: reinstateError.message }, { status: 500 });
    }
    if (!reinstated) {
      return NextResponse.json({ error: "Registration is not rejected" }, { status: 409 });
    }
  } else if (current?.status === "pending") {
    if (await isPhonePeGateBlocking(registrationId)) {
      return NextResponse.json({ error: PHONEPE_GATE_MESSAGE }, { status: 409 });
    }
  }

  const result = await manualPaymentModule.verifyPayment({
    registrationId,
    paymentReference: paymentReference ?? "",
    amount: amount ?? 0,
    method: "manual",
  });
  result.verifiedBy = adminUserId;

  const outcome = await markVerifiedAndIssueTicket(registrationId, result);

  return NextResponse.json({ ok: true, ...outcome });
}
