import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { initiatePhonePePayment } from "@/lib/payment/phonepe";
import { computeAmountInr } from "@/lib/payment/pricing";

const EVENT_SLUG = process.env.EVENT_SLUG ?? "halasuru-sarvapriyananda-2026";

export async function POST(req: NextRequest) {
  const { registrationId } = await req.json();
  if (!registrationId) {
    return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: reg }, { data: event }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, status, num_attendees")
      .eq("id", registrationId)
      .single(),
    supabase.from("events").select("payment_mode").eq("slug", EVENT_SLUG).single(),
  ]);

  if (!reg || reg.status !== "pending") {
    return NextResponse.json(
      { error: "Registration not eligible for payment" },
      { status: 400 }
    );
  }
  if (!event || event.payment_mode !== "phonepe_sandbox") {
    return NextResponse.json(
      { error: "PhonePe is not the active payment mode" },
      { status: 400 }
    );
  }

  const amountInr = computeAmountInr(reg.num_attendees);
  const origin = req.nextUrl.origin;

  try {
    const { redirectUrl, merchantOrderId } = await initiatePhonePePayment({
      registrationId: reg.id,
      amountInr,
      redirectUrl: `${origin}/confirmation/${reg.id}`,
    });

    await supabase
      .from("registrations")
      .update({ phonepe_merchant_txn_id: merchantOrderId })
      .eq("id", reg.id);

    return NextResponse.json({ redirectUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
