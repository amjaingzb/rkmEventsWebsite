import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";
import { AREA_COLUMNS, CONTENT_AREAS, contentTag, type ContentArea } from "@/lib/content/getEventContent";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

// Saves one content area (docs/content-editability-design.md step 6, the
// admin content tab front door) and revalidates its cache tag in the same
// request — the admin editor never needs the manual
// /api/admin/revalidate-content call, that endpoint stays as the fallback
// for a direct Supabase table-editor edit.
export async function PATCH(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const area = body?.area as ContentArea | undefined;
  const data = body?.data as Record<string, unknown> | undefined;

  if (!area || !CONTENT_AREAS.includes(area) || !data || typeof data !== "object") {
    return NextResponse.json(
      { error: `area must be one of: ${CONTENT_AREAS.join(", ")}, with a data object` },
      { status: 400 }
    );
  }

  // Whitelist: only the columns this area owns can be written, regardless
  // of what the request body contains.
  const allowedKeys = new Set(AREA_COLUMNS[area]);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.has(key)) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields for this area" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("events").update(patch).eq("slug", EVENT_SLUG);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(contentTag(area, EVENT_SLUG));
  return NextResponse.json({ ok: true, area });
}
