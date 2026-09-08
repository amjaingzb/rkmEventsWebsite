import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/server";
import { manualPaymentModule } from "@/lib/payment/manual";
import { markVerifiedAndIssueTicket } from "@/lib/ticket/issue";

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
