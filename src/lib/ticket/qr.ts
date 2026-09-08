import { createHmac, timingSafeEqual } from "crypto";
import QRCode from "qrcode";

/**
 * QR payload format — frozen contract, see docs/QR_PAYLOAD_SPEC.md.
 * Pipe-delimited string: `regId|eventSlug|sig`
 * sig = HMAC-SHA256(`${regId}.${eventSlug}`, TICKET_HMAC_SECRET), hex-encoded.
 */

function getSecret(): string {
  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) throw new Error("TICKET_HMAC_SECRET is not set");
  return secret;
}

function sign(regId: string, eventSlug: string): string {
  return createHmac("sha256", getSecret())
    .update(`${regId}.${eventSlug}`)
    .digest("hex");
}

export function buildQrPayload(regId: string, eventSlug: string): string {
  return `${regId}|${eventSlug}|${sign(regId, eventSlug)}`;
}

export function verifyQrPayload(
  payload: string
): { valid: true; regId: string; eventSlug: string } | { valid: false } {
  const parts = payload.split("|");
  if (parts.length !== 3) return { valid: false };

  const [regId, eventSlug, sig] = parts;
  const expected = sign(regId, eventSlug);

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false };
  }

  return { valid: true, regId, eventSlug };
}

/** Returns a PNG data URL suitable for embedding directly in an <img> src or email HTML. */
export async function buildQrDataUrl(
  regId: string,
  eventSlug: string
): Promise<string> {
  const payload = buildQrPayload(regId, eventSlug);
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1 });
}

/**
 * Returns a PNG buffer for the QR code, for use as an email attachment.
 * Prefer this over buildQrDataUrl for email HTML: most clients (Gmail
 * included) strip inline `data:` URI images from HTML emails, so the QR
 * must be sent as a real attachment and referenced via `cid:` instead.
 */
export async function buildQrBuffer(
  regId: string,
  eventSlug: string
): Promise<Buffer> {
  const payload = buildQrPayload(regId, eventSlug);
  return QRCode.toBuffer(payload, { errorCorrectionLevel: "M", margin: 1 });
}
