import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";
import { getCapacitySnapshot } from "@/lib/registration/capacity";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, guaranteed_seat_cap, waitlist_alert_threshold, is_registration_open, pause_message")
    .eq("slug", EVENT_SLUG)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? "Event not found" }, { status: 500 });
  }

  const snapshot = await getCapacitySnapshot(supabase, event.id);

  return NextResponse.json({
    settings: {
      guaranteed_seat_cap: event.guaranteed_seat_cap,
      waitlist_alert_threshold: event.waitlist_alert_threshold,
      is_registration_open: event.is_registration_open,
      pause_message: event.pause_message,
    },
    snapshot,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.guaranteed_seat_cap !== undefined) {
    const cap = Number(body.guaranteed_seat_cap);
    if (!Number.isInteger(cap) || cap <= 0) {
      return NextResponse.json({ error: "guaranteed_seat_cap must be a positive integer" }, { status: 400 });
    }
    update.guaranteed_seat_cap = cap;
  }

  if (body.waitlist_alert_threshold !== undefined) {
    const buffer = Number(body.waitlist_alert_threshold);
    if (!Number.isInteger(buffer) || buffer < 0) {
      return NextResponse.json({ error: "waitlist_alert_threshold must be a non-negative integer" }, { status: 400 });
    }
    update.waitlist_alert_threshold = buffer;
  }

  if (body.is_registration_open !== undefined) {
    if (typeof body.is_registration_open !== "boolean") {
      return NextResponse.json({ error: "is_registration_open must be a boolean" }, { status: 400 });
    }
    update.is_registration_open = body.is_registration_open;
  }

  if (body.pause_message !== undefined) {
    if (typeof body.pause_message !== "string") {
      return NextResponse.json({ error: "pause_message must be a string" }, { status: 400 });
    }
    update.pause_message = body.pause_message;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("events").update(update).eq("slug", EVENT_SLUG);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
