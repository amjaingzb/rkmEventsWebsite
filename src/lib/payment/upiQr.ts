import QRCode from "qrcode";
import { buildUpiUri } from "./upi";

/** Server-only: renders the static UPI payment URI as a PNG buffer. */
export async function buildUpiQrBuffer(
  amountInr: number,
  note?: string
): Promise<Buffer> {
  const uri = buildUpiUri(amountInr, note);
  return QRCode.toBuffer(uri, { errorCorrectionLevel: "M", margin: 1 });
}
