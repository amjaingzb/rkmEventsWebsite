import { NextRequest, NextResponse } from "next/server";
import { registerAttendee } from "@/lib/registration/register";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, numAttendees, paymentReference } = body;

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "fullName, email, and phone are required" },
      { status: 400 }
    );
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

    return NextResponse.json({ id: result.id, status: result.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
