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
    const reg = await registerAttendee({
      fullName,
      email,
      phone,
      numAttendees,
      paymentReference,
    });
    return NextResponse.json({ id: reg.id, status: reg.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
