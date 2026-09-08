import { buildUpiUri, UPI_VPA } from "@/lib/payment/upi";

/**
 * Always shown on the registration page regardless of payment mode — the
 * static UPI ID/QR/deep-link doubles as the actual payment instructions in
 * manual mode, and as transparency ("here's who you're paying") in PhonePe
 * mode. The `upi://` link relies on mobile OSes intercepting the scheme
 * natively; no user-agent sniffing — desktop just shows an inert link next
 * to the (always-functional) QR code.
 */
export default function UpiPaymentInfo({ amountInr }: { amountInr: number }) {
  const uri = buildUpiUri(amountInr);

  return (
    <div className="border border-gold/30 rounded-lg p-4 bg-cream text-sm">
      <p className="mb-3 text-ink/70">
        Scan with any UPI app, or tap the button on your phone:
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/upi/qr?amount=${amountInr}`}
          alt="UPI payment QR code"
          width={140}
          height={140}
          className="border border-gold/30 rounded bg-white"
        />
        <div className="space-y-2">
          <p>
            <span className="text-ink/60">UPI ID:</span>{" "}
            <strong className="font-mono">{UPI_VPA}</strong>
          </p>
          <a
            href={uri}
            className="inline-block bg-maroon hover:bg-maroon-dark text-white px-4 py-2 rounded-full text-sm font-medium transition"
          >
            Pay via UPI app
          </a>
        </div>
      </div>
    </div>
  );
}
