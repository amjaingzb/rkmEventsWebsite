import { createServiceClient } from "@/lib/supabase/server";
import { sendTicketEmail, sendStatusEmail } from "./email";
import type { PaymentVerificationResult } from "@/lib/payment/types";
import { STATUS_MESSAGE, type RegistrationStatus } from "@/lib/registration/statusMessages";

const REG_WITH_EVENT_SELECT =
  "*, events(slug, title, event_date, start_time, end_time, venue_name, payment_mode)";

const MANUAL_SLA_NOTE =
  "Manual verification can take up to 5 days. If you haven't heard back " +
  "by then, please contact us with your payment proof.";

interface RegistrationWithEvent {
  id: string;
  email: string;
  full_name: string;
  seat_number: number | null;
  num_attendees: number;
  payment_amount: number | null;
  verified_at: string | null;
  events: {
    slug: string;
    title: string;
    event_date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    payment_mode: string;
  };
}

function toTicketEmailInput(reg: RegistrationWithEvent) {
  return {
    toEmail: reg.email,
    fullName: reg.full_name,
    regId: reg.id,
    eventSlug: reg.events.slug,
    eventTitle: reg.events.title,
    eventDate: reg.events.event_date,
    startTime: reg.events.start_time,
    endTime: reg.events.end_time,
    venueName: reg.events.venue_name,
    seatNumber: reg.seat_number,
    numAttendees: reg.num_attendees,
    paymentAmount: reg.payment_amount,
    // Only called with rows that have already been verified, so this is set.
    verifiedAt: reg.verified_at!,
  };
}

/**
 * The seam both payment implementations (manual.ts today, phonepe.ts later)
 * call into once a payment is verified. Keeping this outside src/lib/payment/**
 * is what makes the manual -> automatic swap touch only the payment module —
 * this function and everything downstream of it never changes.
 */
export async function markVerifiedAndIssueTicket(
  registrationId: string,
  result: PaymentVerificationResult
) {
  const supabase = createServiceClient();

  const { data: reg, error: updateError } = await supabase
    .from("registrations")
    .update({
      status: "verified",
      verified_by: result.verifiedBy,
      verified_at: result.verifiedAt,
    })
    .eq("id", registrationId)
    .eq("status", "pending") // idempotency guard: no-op if already verified
    .select(REG_WITH_EVENT_SELECT)
    .single();

  if (updateError || !reg) {
    // Either not found, or already verified (double-click) — treat as a no-op
    // rather than an error so a duplicate admin click doesn't send a second email.
    return { alreadyProcessed: true };
  }

  await sendTicketEmail(toTicketEmailInput(reg as unknown as RegistrationWithEvent));

  await supabase
    .from("registrations")
    .update({ ticket_sent_at: new Date().toISOString() })
    .eq("id", registrationId);

  return { alreadyProcessed: false };
}

/**
 * Re-sends the ticket email for a row that is already verified (lost email /
 * bounce). Only re-runs the email step — no re-verification, no ticket
 * re-issuance logic — and only ever operates on `verified` rows.
 */
export async function resendTicketEmail(registrationId: string) {
  const supabase = createServiceClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select(REG_WITH_EVENT_SELECT)
    .eq("id", registrationId)
    .eq("status", "verified")
    .single();

  if (error || !reg) {
    return { ok: false as const };
  }

  await sendTicketEmail(toTicketEmailInput(reg as unknown as RegistrationWithEvent));

  await supabase
    .from("registrations")
    .update({ ticket_sent_at: new Date().toISOString() })
    .eq("id", registrationId);

  return { ok: true as const };
}

/**
 * A plain status-update email (no QR) for a registration that was never
 * issued a ticket — pending/waitlisted/rejected. Used by admin "resend"
 * when the row isn't `verified` (see resendTicketEmail above for that case).
 */
export async function sendStatusUpdateEmail(registrationId: string) {
  const supabase = createServiceClient();

  const { data: reg, error } = await supabase
    .from("registrations")
    .select(REG_WITH_EVENT_SELECT)
    .eq("id", registrationId)
    .single();

  if (error || !reg) {
    return { ok: false as const };
  }

  const r = reg as unknown as RegistrationWithEvent & { status: RegistrationStatus };

  let message = STATUS_MESSAGE[r.status];
  if (r.status === "pending" && r.events.payment_mode === "manual") {
    message = `${message} ${MANUAL_SLA_NOTE}`;
  }

  await sendStatusEmail({
    toEmail: r.email,
    fullName: r.full_name,
    eventTitle: r.events.title,
    eventDate: r.events.event_date,
    regId: r.id,
    message,
  });

  return { ok: true as const };
}
