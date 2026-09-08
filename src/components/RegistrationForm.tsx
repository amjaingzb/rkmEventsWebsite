"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/contact";
import { computeAmountInr } from "@/lib/payment/pricing";
import UpiPaymentInfo from "./UpiPaymentInfo";

export default function RegistrationForm({ paymentMode }: { paymentMode: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numAttendees, setNumAttendees] = useState(1);

  const isPhonePe = paymentMode === "phonepe_sandbox";
  const amountInr = computeAmountInr(numAttendees);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      numAttendees,
      paymentReference: isPhonePe ? undefined : form.get("paymentReference"),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(
        data.error
          ? `${data.error} If this continues, contact us at ${CONTACT_EMAIL}.`
          : `Something went wrong. Please try again, or contact us at ${CONTACT_EMAIL} if this continues.`
      );
      return;
    }

    if (isPhonePe && data.status === "pending") {
      const initRes = await fetch("/api/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: data.id }),
      });
      const initData = await initRes.json();

      if (!initRes.ok || !initData.redirectUrl) {
        setSubmitting(false);
        setError(
          `Registered, but couldn't start PhonePe checkout. Contact us at ${CONTACT_EMAIL} with registration ID ${data.id}.`
        );
        return;
      }

      window.location.href = initData.redirectUrl;
      return;
    }

    setSubmitting(false);
    router.push(`/confirmation/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Full name</label>
        <input
          name="fullName"
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          name="email"
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          name="phone"
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Number of attendees
        </label>
        <input
          type="number"
          name="numAttendees"
          min={1}
          value={numAttendees}
          onChange={(e) =>
            setNumAttendees(Math.max(1, Number(e.target.value) || 1))
          }
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>

      <div className="border-t border-gold/30 pt-4 space-y-3">
        <p className="text-sm text-ink/60">
          Registration fee: <strong>₹{amountInr}</strong>
          {isPhonePe
            ? " — pay securely via PhonePe below."
            : " — pay via UPI/bank transfer, then enter the transaction reference below."}
        </p>
        <UpiPaymentInfo amountInr={amountInr} />
        {!isPhonePe && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Payment reference / transaction ID
            </label>
            <input
              name="paymentReference"
              required
              className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
            />
            <p className="text-xs text-ink/50 mt-1">
              Your seat will show as <em>pending</em> until an organizer
              manually verifies the payment.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-maroon hover:bg-maroon-dark text-white px-6 py-2.5 rounded-full font-medium disabled:opacity-50 transition"
      >
        {submitting
          ? "Submitting..."
          : isPhonePe
            ? `Pay ₹${amountInr} via PhonePe`
            : "Register"}
      </button>
    </form>
  );
}
