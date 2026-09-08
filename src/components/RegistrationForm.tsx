"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/contact";

export default function RegistrationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      numAttendees: Number(form.get("numAttendees") ?? 1),
      paymentReference: form.get("paymentReference"),
      paymentAmount: Number(form.get("paymentAmount") ?? 0),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(
        data.error
          ? `${data.error} If this continues, contact us at ${CONTACT_EMAIL}.`
          : `Something went wrong. Please try again, or contact us at ${CONTACT_EMAIL} if this continues.`
      );
      return;
    }

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
          defaultValue={1}
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>
      <div className="border-t border-gold/30 pt-4">
        <p className="text-sm text-ink/60 mb-2">
          Please make a UPI/bank transfer for the registration fee, then enter
          the transaction reference below. Your seat will show as{" "}
          <em>pending</em> until an organizer manually verifies the payment.
        </p>
        <label className="block text-sm font-medium mb-1">
          Payment reference / transaction ID
        </label>
        <input
          name="paymentReference"
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Amount paid (₹)
        </label>
        <input
          type="number"
          name="paymentAmount"
          min={0}
          step="0.01"
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-maroon hover:bg-maroon-dark text-white px-6 py-2.5 rounded-full font-medium disabled:opacity-50 transition"
      >
        {submitting ? "Submitting..." : "Register"}
      </button>
    </form>
  );
}
