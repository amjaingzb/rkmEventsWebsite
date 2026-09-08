import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/server";
import { registerAttendee } from "@/lib/registration/register";
import { manualPaymentModule } from "@/lib/payment/manual";
import { markVerifiedAndIssueTicket } from "@/lib/ticket/issue";

/**
 * Admin-entered walk-in/cash registration: for non-technical attendees who
 * pay cash in person rather than filling the public form. Goes through the
 * same atomic register_attendee RPC as the public flow (never bypasses the
 * seat cap), then — since cash is already in hand — immediately verifies
 * and issues the ticket in the same request, rather than landing in the
 * pending queue for a separate Verify click.
 */
export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    const user = await requireAdminSession();
    adminUserId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { fullName, email, phone, numAttendees, paymentAmount, paymentReference } =
    await req.json();

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "fullName, email, and phone are required" },
      { status: 400 }
    );
  }

  let reg: { id: string; status: "pending" | "waitlisted" };
  try {
    reg = await registerAttendee({
      fullName,
      email,
      phone,
      numAttendees: numAttendees ?? 1,
      paymentReference: (paymentReference?.trim() || `CASH-${Date.now()}`) as string,
      paymentAmount: paymentAmount ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  if (reg.status !== "pending") {
    // Cap was full at the moment of claim -- no seat to issue a ticket for.
    return NextResponse.json({ id: reg.id, status: reg.status });
  }

  const result = await manualPaymentModule.verifyPayment({
    registrationId: reg.id,
    paymentReference: paymentReference ?? "",
    amount: paymentAmount ?? 0,
    method: "manual",
  });
  result.verifiedBy = adminUserId;
  await markVerifiedAndIssueTicket(reg.id, result);

  return NextResponse.json({ id: reg.id, status: "verified" });
}
