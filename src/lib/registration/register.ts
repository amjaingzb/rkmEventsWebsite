import { createServiceClient } from "@/lib/supabase/server";
import { computeAmountInr } from "@/lib/payment/pricing";
import { normalizePhone } from "@/lib/phone";
import { MAX_ATTENDEES_PER_SUBMISSION } from "./limits";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

interface RegisterAttendeeInput {
  fullName: string;
  email: string;
  phone: string;
  numAttendees?: number;
  paymentReference?: string;
  paymentAmount?: number | null;
  /** Skip the duplicate check — set by the admin walk-in flow's "register anyway" confirm. */
  allowDuplicate?: boolean;
}

export type RegisterAttendeeResult =
  | { duplicate: true; existingRegistrationId: string }
  | { duplicate: false; id: string; status: "pending" | "waitlisted" };

/**
 * Duplicate check shared by the public and admin registration paths — a
 * plain read-then-compare (not a SQL filter, since there's no
 * normalized/generated column for email/phone) against pending/verified
 * rows for the event, comparing normalized email OR normalized phone.
 * Deliberately excludes waitlisted/EOI rows — see registration-integrity.md
 * Item 1's decided match scope.
 */
async function findDuplicateRegistration(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string,
  email: string,
  phone: string
): Promise<string | null> {
  const { data: candidates } = await supabase
    .from("registrations")
    .select("id, email, phone")
    .eq("event_id", eventId)
    .in("status", ["pending", "verified"]);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  const match = candidates?.find(
    (c) =>
      c.email.trim().toLowerCase() === normalizedEmail ||
      normalizePhone(c.phone) === normalizedPhone
  );
  return match?.id ?? null;
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
export async function registerAttendee(
  input: RegisterAttendeeInput
): Promise<RegisterAttendeeResult> {
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

  if (!input.allowDuplicate) {
    const existingId = await findDuplicateRegistration(
      supabase,
      event.id,
      input.email,
      input.phone
    );
    if (existingId) {
      return { duplicate: true, existingRegistrationId: existingId };
    }
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

  const row = reg as { id: string; status: "pending" | "waitlisted" };
  return { duplicate: false, id: row.id, status: row.status };
}

export interface RegisterInterestInput {
  fullName: string;
  email: string;
  phone: string;
  numAttendees?: number;
}

export interface RegisterInterestResult {
  id: string;
  status: "waitlisted";
  /** Informational only, never blocks — see registration-integrity.md Item 6 caveat 4. */
  duplicateOf?: string;
}

/**
 * The lightweight Expression-of-Interest insert path (Item 6): used once
 * guaranteed seats are full. Unlike registerAttendee, this never requires
 * payment fields and never claims capacity (there's no cap left to claim)
 * -- it inserts straight to `waitlisted`. Kept as a separate function
 * rather than a flag on registerAttendee since the two contracts differ
 * enough (no payment requirement, always waitlisted, no RPC call) that a
 * shared function would need more branching than two plain functions.
 */
export async function registerInterest(
  input: RegisterInterestInput
): Promise<RegisterInterestResult> {
  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  const numAttendees = input.numAttendees ?? 1;
  if (numAttendees < 1 || numAttendees > MAX_ATTENDEES_PER_SUBMISSION) {
    throw new Error(`numAttendees must be between 1 and ${MAX_ATTENDEES_PER_SUBMISSION}`);
  }

  // Informational only (Item 1/6 caveat 4) -- EOI's whole point is "leave
  // your info even if you're one of many," so a match never blocks the
  // insert, unlike the paid-registration path above.
  const duplicateOf = await findDuplicateRegistration(
    supabase,
    event.id,
    input.email,
    input.phone
  );

  const { data: reg, error } = await supabase
    .from("registrations")
    .insert({
      event_id: event.id,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      num_attendees: numAttendees,
      status: "waitlisted",
    })
    .select("id")
    .single();

  if (error || !reg) {
    throw new Error(error?.message ?? "Registration failed");
  }

  return { id: reg.id, status: "waitlisted", duplicateOf: duplicateOf ?? undefined };
}
