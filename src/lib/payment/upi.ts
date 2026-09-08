// Static UPI payment info, shown on the registration page regardless of
// payment mode. Isomorphic (no server-only imports) — safe to import from
// client components. QR rendering (needs the `qrcode` package, Node-only)
// lives in ./upiQr instead, so this file never pulls that into the client
// bundle.

export const UPI_VPA = "ramakri13482@kbl";
export const UPI_PAYEE_NAME = "Ramakrishna Math Halasuru";

export function buildUpiUri(amountInr: number, note = "Event registration"): string {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE_NAME,
    am: amountInr.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
