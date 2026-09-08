import { NextRequest, NextResponse } from "next/server";
import { buildUpiQrBuffer } from "@/lib/payment/upiQr";

export async function GET(req: NextRequest) {
  const amountInr = Number(req.nextUrl.searchParams.get("amount"));

  if (!Number.isFinite(amountInr) || amountInr <= 0 || amountInr > 50000) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const buffer = await buildUpiQrBuffer(amountInr);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
