import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";
import { sendStatusUpdateEmail } from "@/lib/ticket/issue";
import { isPhonePeGateBlocking } from "@/lib/registration/phonepeGate";

const PHONEPE_GATE_MESSAGE =
  "This registration is in PhonePe mode — pending payments are confirmed " +
  "automatically. Manual rejection unlocks after 1 hour if it's still stuck.";

export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    const user = await requireAdminSession();
    adminUserId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { registrationId, reason } = await req.json();
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  if (await isPhonePeGateBlocking(registrationId)) {
    return NextResponse.json({ error: PHONEPE_GATE_MESSAGE }, { status: 409 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("reject_registration", {
    p_registration_id: registrationId,
    p_rejected_by: adminUserId,
    p_rejection_reason: (reason as string | undefined)?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    // Not found, or not in `pending` status (already verified/rejected).
    return NextResponse.json(
      { error: "Registration is not pending" },
      { status: 409 }
    );
  }

  // Auto-send the rejection notification — no separate manual "Send
  // email" step needed anymore. Best-effort: a failed send here
  // shouldn't undo the reject itself, just gets logged.
  try {
    await sendStatusUpdateEmail(registrationId);
  } catch (err) {
    console.error("Failed to send rejection email:", err);
  }

  return NextResponse.json({ ok: true });
}
