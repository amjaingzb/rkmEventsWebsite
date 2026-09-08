import { NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, full_name, email, phone, num_attendees, payment_reference, payment_amount, status, seat_number, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ registrations: data });
}
