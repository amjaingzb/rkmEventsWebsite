import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["pending", "verified", "waitlisted", "rejected"];
const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, event_date, payment_mode")
    .eq("slug", EVENT_SLUG)
    .single();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  let query = supabase
    .from("registrations")
    .select(
      "id, full_name, email, phone, num_attendees, payment_reference, payment_amount, status, seat_number, ticket_sent_at, verified_at, created_at"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ registrations: data, event });
}
