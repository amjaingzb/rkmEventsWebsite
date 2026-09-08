import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, numAttendees, paymentReference, paymentAmount } = body;

  if (!fullName || !email || !phone || !paymentReference) {
    return NextResponse.json(
      { error: "fullName, email, phone, and paymentReference are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 500 });
  }

  const { data: reg, error } = await supabase
    .rpc("register_attendee", {
      p_event_id: event.id,
      p_full_name: fullName,
      p_email: email,
      p_phone: phone,
      p_num_attendees: numAttendees ?? 1,
      p_payment_reference: paymentReference,
      p_payment_amount: paymentAmount ?? null,
    })
    .single();

  if (error || !reg) {
    return NextResponse.json(
      { error: error?.message ?? "Registration failed" },
      { status: 500 }
    );
  }

  const registration = reg as { id: string; status: string };

  return NextResponse.json({
    id: registration.id,
    status: registration.status,
  });
}
