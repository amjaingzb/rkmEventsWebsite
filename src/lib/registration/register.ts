import { createServiceClient } from "@/lib/supabase/server";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

interface RegisterAttendeeInput {
  fullName: string;
  email: string;
  phone: string;
  numAttendees?: number;
  paymentReference: string;
  paymentAmount?: number | null;
}

/**
 * Shared by the public registration route and the admin walk-in/cash
 * registration route — both must go through the atomic register_attendee
 * RPC to respect the seat cap; nothing should ever claim a seat outside it.
 */
export async function registerAttendee(input: RegisterAttendeeInput) {
  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  const { data: reg, error } = await supabase
    .rpc("register_attendee", {
      p_event_id: event.id,
      p_full_name: input.fullName,
      p_email: input.email,
      p_phone: input.phone,
      p_num_attendees: input.numAttendees ?? 1,
      p_payment_reference: input.paymentReference,
      p_payment_amount: input.paymentAmount ?? null,
    })
    .single();

  if (error || !reg) {
    throw new Error(error?.message ?? "Registration failed");
  }

  return reg as { id: string; status: "pending" | "waitlisted" };
}
