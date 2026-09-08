import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/supabase/server";
import { resendTicketEmail, sendStatusUpdateEmail } from "@/lib/ticket/issue";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { registrationId } = await req.json();
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const ticketOutcome = await resendTicketEmail(registrationId);
  if (ticketOutcome.ok) {
    return NextResponse.json({ ok: true, type: "ticket" });
  }

  // Not a verified row (no ticket to resend) — send a plain status email
  // instead, e.g. for a pending/waitlisted/rejected registration.
  const statusOutcome = await sendStatusUpdateEmail(registrationId);
  if (!statusOutcome.ok) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, type: "status" });
}
