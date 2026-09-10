import { createServiceClient } from "@/lib/supabase/server";
import { sendTicketEmail, sendStatusEmail } from "./email";
import type { PaymentVerificationResult } from "@/lib/payment/types";
import { getStatusMessage, getStatusTitle, type RegistrationStatus } from "@/lib/registration/statusMessages";

const REG_WITH_EVENT_SELECT =
  "*, events(slug, title, event_date, start_time, end_time, venue_name, payment_mode, contact_email)";

const MANUAL_SLA_NOTE =
  "Manual verification can take up to 5 days. If you haven't heard back " +
  "by then, please contact us with your payment proof.";

interface RegistrationWithEvent {
  id: string;
  email: string;
  full_name: string;
  phone: string;
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
    contact_email: string | null;
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
    phone: reg.phone,
    numAttendees: reg.num_attendees,
    paymentAmount: reg.payment_amount,
    // Only called with rows that have already been verified, so this is set.
    verifiedAt: reg.verified_at!,
    contactEmail: reg.events.contact_email ?? "",
  };
}

/**
 * The seam both payment implementations (manual.ts today, phonepe.ts later)
 * call into once a payment is verified. Keeping this outside src/lib/payment/**
 * is what makes the manual -> automatic swap touch only the payment module —
 * this function and everything downstream of it never changes.
 *
 * The capacity claim itself happens here (Item 3, registration-integrity.md)
 * via claim_and_verify_registration — not at submission time — so an
 * abandoned/incomplete checkout never squats on a seat. The RPC's row lock
 * + `status = 'pending'` guard is the idempotency check (a double-click, or
 * a webhook racing a status poll, both serialize on it).
 */
export async function markVerifiedAndIssueTicket(
  registrationId: string,
  result: PaymentVerificationResult
): Promise<{ alreadyProcessed: boolean; waitlisted?: boolean }> {
  const supabase = createServiceClient();

  const { data: claimed, error: claimError } = await supabase
    .rpc("claim_and_verify_registration", {
      p_registration_id: registrationId,
      p_verified_by: result.verifiedBy,
      p_verified_at: result.verifiedAt,
    })
    .single();

  if (claimError || !claimed) {
    // Not found, or wasn't `pending` (double-click / already processed).
    return { alreadyProcessed: true };
  }

  const claimedRow = claimed as { status: RegistrationStatus };

  if (claimedRow.status === "waitlisted") {
    // Rare race: payment confirmed but capacity filled at claim time. No
    // ticket to send — admin resolves manually (refund / next-batch invite)
    // via the admin dashboard's waitlisted view.
    return { alreadyProcessed: false, waitlisted: true };
  }

  // status === "verified" -- fetch with the event join for the email (the
  // RPC returns a plain registrations row with no join).
  const { data: reg } = await supabase
    .from("registrations")
    .select(REG_WITH_EVENT_SELECT)
    .eq("id", registrationId)
    .single();

  if (!reg) {
    return { alreadyProcessed: true };
  }

  await sendTicketEmail(toTicketEmailInput(reg as unknown as RegistrationWithEvent));

  await supabase
    .from("registrations")
    .update({ ticket_sent_at: new Date().toISOString() })
    .eq("id", registrationId);

  return { alreadyProcessed: false, waitlisted: false };
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

  const r = reg as unknown as RegistrationWithEvent & {
    status: RegistrationStatus;
    rejection_reason: string | null;
  };

  const contactEmail = r.events.contact_email ?? "";
  let message = getStatusMessage(r.status, contactEmail, r.rejection_reason);
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
    contactEmail,
    subject: getStatusTitle(r.status),
  });

  return { ok: true as const };
}
