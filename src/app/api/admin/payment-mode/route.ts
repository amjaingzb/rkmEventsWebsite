import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";

const VALID_MODES = ["manual", "phonepe_sandbox"];
const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { mode } = await req.json();
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("events")
    .update({ payment_mode: mode })
    .eq("slug", EVENT_SLUG);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode });
}
