import { createServiceClient } from "@/lib/supabase/server";
import { sendTicketEmail } from "./email";
import type { PaymentVerificationResult } from "@/lib/payment/types";

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
    .select("*, events(slug, title, event_date, start_time, end_time, venue_name)")
    .single();

  if (updateError || !reg) {
    // Either not found, or already verified (double-click) — treat as a no-op
    // rather than an error so a duplicate admin click doesn't send a second email.
    return { alreadyProcessed: true };
  }

  const event = reg.events as unknown as {
    slug: string;
    title: string;
    event_date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
  };

  await sendTicketEmail({
    toEmail: reg.email,
    fullName: reg.full_name,
    regId: reg.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    venueName: event.venue_name,
    seatNumber: reg.seat_number,
  });

  await supabase
    .from("registrations")
    .update({ ticket_sent_at: new Date().toISOString() })
    .eq("id", registrationId);

  return { alreadyProcessed: false };
}
