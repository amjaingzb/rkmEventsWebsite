import { NextRequest, NextResponse } from "next/server";
import { registerInterest } from "@/lib/registration/register";
import { sendStatusUpdateEmail } from "@/lib/ticket/issue";
import { validateFullName } from "@/lib/registration/validation";

// Kept as a separate route from POST /api/register (rather than an isEoi
// flag on that handler) since the two contracts differ enough -- no
// payment fields required, a duplicate never blocks -- that branching
// inside one handler would be messier than two thin routes.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, numAttendees } = body;

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "fullName, email, and phone are required" },
      { status: 400 }
    );
  }

  const fullNameError = validateFullName(fullName);
  if (fullNameError) {
    return NextResponse.json({ error: fullNameError }, { status: 400 });
  }

  try {
    const result = await registerInterest({ fullName, email, phone, numAttendees });

    try {
      await sendStatusUpdateEmail(result.id);
    } catch (err) {
      console.error("Failed to send registration acknowledgement email:", err);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
