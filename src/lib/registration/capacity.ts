import { createServiceClient } from "@/lib/supabase/server";

export interface CapacitySnapshot {
  confirmedBooking: number;
  outstanding: number;
  cap: number;
  buffer: number;
}

/**
 * Single shared definition of "where does the event stand right now" —
 * used by both the public page's Open/Full-EOI/Paused gating (Item 6) and
 * the admin settings panel's live numbers display, so the two can't drift
 * apart. Backed by event_capacity_snapshot (registration-integrity.md
 * Item 5), which computes confirmedBooking (verified seats,
 * events.seats_taken) and outstanding (sum of num_attendees across pending
 * rows, excluding waitlisted) in one place.
 */
export async function getCapacitySnapshot(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string
): Promise<CapacitySnapshot> {
  const { data, error } = await supabase
    .rpc("event_capacity_snapshot", { p_event_id: eventId })
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load capacity snapshot");
  }

  const row = data as {
    confirmed_booking: number;
    outstanding: number;
    cap: number;
    buffer: number;
  };

  return {
    confirmedBooking: row.confirmed_booking,
    outstanding: row.outstanding,
    cap: row.cap,
    buffer: row.buffer,
  };
}

/** Backlog-relief condition (Item 6): too many unverified submissions
 * piling up near the cap -- stop taking new ones until admins catch up. */
export function computeAutoPause(s: CapacitySnapshot): boolean {
  return s.confirmedBooking + s.outstanding >= s.cap - s.buffer;
}

/** True fullness (Item 6): verified seats alone have reached the cap --
 * triggers the Expression-of-Interest form. */
export function isFull(s: CapacitySnapshot): boolean {
  return s.confirmedBooking >= s.cap;
}
