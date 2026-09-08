"use client";

import { useState } from "react";

const LABELS: Record<string, string> = {
  manual: "Manual verification",
  phonepe_sandbox: "PhonePe sandbox (auto-verify)",
};

export default function AdminPaymentModeToggle({
  initialMode,
}: {
  initialMode: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextMode = e.target.value;
    setSaving(true);
    const res = await fetch("/api/admin/payment-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode }),
    });
    setSaving(false);
    if (res.ok) {
      setMode(nextMode);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="payment-mode" className="text-gray-600">
        Payment mode:
      </label>
      <select
        id="payment-mode"
        value={mode}
        onChange={handleChange}
        disabled={saving}
        className="border border-gray-300 rounded px-2 py-1"
      >
        {Object.entries(LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
