import { createServiceClient } from "@/lib/supabase/server";
import { computeAmountInr } from "@/lib/payment/pricing";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

interface RegisterAttendeeInput {
  fullName: string;
  email: string;
  phone: string;
  numAttendees?: number;
  paymentReference?: string;
  paymentAmount?: number | null;
}

/**
 * Shared by the public registration route and the admin walk-in/cash
 * registration route — both must go through the atomic register_attendee
 * RPC to respect the seat cap; nothing should ever claim a seat outside it.
 *
 * paymentReference is only required when the event's payment_mode is
 * "manual" — in "phonepe_sandbox" mode the public form collects no
 * self-reported reference at all (see RegistrationForm.tsx). paymentAmount
 * defaults to the computed fixed price if not explicitly overridden (the
 * admin walk-in/cash form still passes its own actual-cash-received amount).
 */
export async function registerAttendee(input: RegisterAttendeeInput) {
  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, payment_mode")
    .eq("slug", EVENT_SLUG)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  if (event.payment_mode === "manual" && !input.paymentReference) {
    throw new Error("paymentReference is required");
  }

  const numAttendees = input.numAttendees ?? 1;
  const paymentAmount = input.paymentAmount ?? computeAmountInr(numAttendees);

  const { data: reg, error } = await supabase
    .rpc("register_attendee", {
      p_event_id: event.id,
      p_full_name: input.fullName,
      p_email: input.email,
      p_phone: input.phone,
      p_num_attendees: numAttendees,
      p_payment_reference: input.paymentReference ?? null,
      p_payment_amount: paymentAmount,
    })
    .single();

  if (error || !reg) {
    throw new Error(error?.message ?? "Registration failed");
  }

  return reg as { id: string; status: "pending" | "waitlisted" };
}
