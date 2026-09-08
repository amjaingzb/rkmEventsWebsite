"use client";

import { useState } from "react";

export default function AdminManualRegisterForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      numAttendees: Number(form.get("numAttendees") ?? 1),
      paymentAmount: form.get("paymentAmount")
        ? Number(form.get("paymentAmount"))
        : null,
      paymentReference: String(form.get("paymentReference") ?? "").trim(),
    };

    const res = await fetch("/api/admin/manual-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }

    if (data.status === "verified") {
      setResult("Ticket issued and emailed.");
      (e.target as HTMLFormElement).reset();
    } else {
      setResult("Cap was full — added to the waitlist instead (no ticket issued).");
    }
    onDone();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 px-3 py-1 rounded text-sm border border-gray-300 bg-white hover:bg-gray-50"
      >
        + Add walk-in / cash registration
      </button>
    );
  }

  return (
    <div className="mb-6 border border-gray-300 rounded p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-sm">Add walk-in / cash registration</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 hover:text-black"
        >
          Close
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-sm">
        <input name="fullName" placeholder="Full name" required className="border rounded px-2 py-1" />
        <input name="email" type="email" placeholder="Email" required className="border rounded px-2 py-1" />
        <input name="phone" placeholder="Phone" required className="border rounded px-2 py-1" />
        <input
          name="numAttendees"
          type="number"
          min="1"
          defaultValue="1"
          placeholder="Attendees"
          className="border rounded px-2 py-1"
        />
        <input
          name="paymentAmount"
          type="number"
          step="0.01"
          placeholder="Amount received (₹)"
          className="border rounded px-2 py-1"
        />
        <input
          name="paymentReference"
          placeholder="Payment note (optional, e.g. receipt #)"
          className="border rounded px-2 py-1"
        />
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {submitting ? "Working..." : "Register & issue ticket"}
          </button>
          {result && <span className="text-green-700 text-sm">{result}</span>}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>
    </div>
  );
}
