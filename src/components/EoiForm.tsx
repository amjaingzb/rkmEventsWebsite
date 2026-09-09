"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/contact";
import { MAX_ATTENDEES_PER_SUBMISSION } from "@/lib/registration/limits";

/**
 * The Expression-of-Interest form (registration-integrity.md Item 6),
 * shown once guaranteed seats are full: same name/email/phone as
 * RegistrationForm, no payment section, always lands `waitlisted`.
 */
export default function EoiForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numAttendees, setNumAttendees] = useState(1);
  const [submitted, setSubmitted] = useState<{ id: string; duplicateOf?: string } | null>(null);

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
    };

    const res = await fetch("/api/register/eoi", {
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

    setSubmitting(false);

    if (data.duplicateOf) {
      setSubmitted({ id: data.id, duplicateOf: data.duplicateOf });
      return;
    }

    router.push(`/confirmation/${data.id}`);
  }

  if (submitted) {
    return (
      <div className="max-w-md space-y-3">
        <p className="text-sm text-ink/70">
          Thanks — your interest has been recorded. Note: this email/phone
          already has an existing registration (ID {submitted.duplicateOf}),
          so if this was meant to update that one instead, contact us at{" "}
          {CONTACT_EMAIL}.
        </p>
        <button
          onClick={() => router.push(`/confirmation/${submitted.id}`)}
          className="bg-maroon hover:bg-maroon-dark text-white px-6 py-2.5 rounded-full font-medium transition"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <p className="text-sm text-ink/60">
        Guaranteed seats are full — leave your info and we&apos;ll reach out
        if seats open up or a bigger venue is arranged.
      </p>
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
        <select
          name="numAttendees"
          value={numAttendees}
          onChange={(e) => setNumAttendees(Number(e.target.value))}
          required
          className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-saffron/50"
        >
          {Array.from({ length: MAX_ATTENDEES_PER_SUBMISSION }, (_, i) => i + 1).map(
            (n) => (
              <option key={n} value={n}>
                {n}
              </option>
            )
          )}
        </select>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-maroon hover:bg-maroon-dark text-white px-6 py-2.5 rounded-full font-medium disabled:opacity-50 transition"
      >
        {submitting ? "Submitting..." : "Register interest"}
      </button>
    </form>
  );
}
