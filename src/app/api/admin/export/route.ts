import { NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";

const COLUMNS = [
  "full_name",
  "email",
  "phone",
  "num_attendees",
  "status",
  "seat_number",
  "payment_reference",
  "payment_amount",
  "created_at",
  "verified_at",
  "ticket_sent_at",
] as const;

type ExportRow = Record<(typeof COLUMNS)[number], unknown>;

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .single();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("registrations")
    .select(COLUMNS.join(", "))
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ExportRow[];
  const lines = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((col) => csvEscape(row[col])).join(",")),
  ];
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
