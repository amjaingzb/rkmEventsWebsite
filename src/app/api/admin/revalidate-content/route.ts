import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminSession } from "@/lib/supabase/server";
import { CONTENT_AREAS, contentTag, type ContentArea } from "@/lib/content/getEventContent";

// Addresses docs/content-editability-design.md red flag 1: a direct
// Supabase table-editor edit doesn't trigger revalidateTag on its own, so
// hit this endpoint afterward to see the change without waiting for the
// 5-minute cache backstop. Not yet wired to any UI button — which front
// door calls this (a dashboard button vs. curl/Postman) is step 6's
// decision, not this one.
const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { area } = await req.json();
  if (!CONTENT_AREAS.includes(area)) {
    return NextResponse.json(
      { error: `area must be one of: ${CONTENT_AREAS.join(", ")}` },
      { status: 400 }
    );
  }

  revalidateTag(contentTag(area as ContentArea, EVENT_SLUG));
  return NextResponse.json({ ok: true, area });
}
