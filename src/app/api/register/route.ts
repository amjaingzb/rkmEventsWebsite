import { NextRequest, NextResponse } from "next/server";
import { registerAttendee } from "@/lib/registration/register";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, numAttendees, paymentReference, paymentAmount } = body;

  if (!fullName || !email || !phone || !paymentReference) {
    return NextResponse.json(
      { error: "fullName, email, phone, and paymentReference are required" },
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
      paymentAmount,
    });
    return NextResponse.json({ id: reg.id, status: reg.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
