import { NextRequest, NextResponse } from "next/server";
import { registerAttendee } from "@/lib/registration/register";
import { sendStatusUpdateEmail } from "@/lib/ticket/issue";
import { validateFullName } from "@/lib/registration/validation";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, numAttendees, paymentReference } = body;

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
    const result = await registerAttendee({
      fullName,
      email,
      phone,
      numAttendees,
      paymentReference,
    });

    if (result.duplicate) {
      return NextResponse.json(
        { duplicate: true, existingRegistrationId: result.existingRegistrationId },
        { status: 409 }
      );
    }

    // Acknowledgement email — best-effort, never fails the registration
    // itself (the confirmation page is the primary record; this is a
    // backup in case the registrant closes the tab before seeing it).
    // Awaited (not fire-and-forget) since a serverless function can be
    // frozen/killed right after the response is sent, which would silently
    // drop an un-awaited send.
    try {
      await sendStatusUpdateEmail(result.id);
    } catch (err) {
      console.error("Failed to send registration acknowledgement email:", err);
    }

    return NextResponse.json({ id: result.id, status: result.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
