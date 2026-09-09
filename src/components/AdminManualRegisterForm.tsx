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
  const [duplicate, setDuplicate] = useState<{
    existingRegistrationId: string;
    payload: Record<string, unknown>;
  } | null>(null);

  async function submitPayload(
    payload: Record<string, unknown>,
    formEl: HTMLFormElement | null
  ) {
    setSubmitting(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/admin/manual-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    setSubmitting(false);

    if (res.status === 409 && data.duplicate) {
      setDuplicate({ existingRegistrationId: data.existingRegistrationId, payload });
      return;
    }

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }

    setDuplicate(null);
    if (data.status === "verified") {
      setResult("Ticket issued and emailed.");
      formEl?.reset();
    } else {
      setResult("Cap was full — added to the waitlist instead (no ticket issued).");
    }
    onDone();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    await submitPayload(payload, e.currentTarget);
  }

  async function handleRegisterAnyway() {
    if (!duplicate) return;
    await submitPayload({ ...duplicate.payload, allowDuplicate: true }, null);
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
        {duplicate && (
          <div className="col-span-2 flex items-center gap-3 bg-amber-50 border border-amber-300 rounded px-3 py-2">
            <span className="text-amber-800 text-sm">
              This email/phone already has a registration (ID{" "}
              {duplicate.existingRegistrationId}). Register anyway?
            </span>
            <button
              type="button"
              onClick={handleRegisterAnyway}
              disabled={submitting}
              className="bg-amber-800 text-white px-3 py-1 rounded disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? "Working..." : "Register anyway"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
