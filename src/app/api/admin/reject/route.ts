import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    const user = await requireAdminSession();
    adminUserId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { registrationId } = await req.json();
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("reject_registration", {
    p_registration_id: registrationId,
    p_rejected_by: adminUserId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    // Not found, or not in `pending` status (already verified/rejected).
    return NextResponse.json(
      { error: "Registration is not pending" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
