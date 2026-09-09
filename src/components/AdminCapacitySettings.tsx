"use client";

import { useState } from "react";
import {
  computeAutoPause,
  isFull,
  type CapacitySnapshot,
} from "@/lib/registration/capacity";

interface Settings {
  guaranteed_seat_cap: number;
  waitlist_alert_threshold: number;
  is_registration_open: boolean;
  pause_message: string | null;
}

export default function AdminCapacitySettings({
  initialSettings,
  initialSnapshot,
}: {
  initialSettings: Settings;
  initialSnapshot: CapacitySnapshot;
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/capacity-settings");
    const data = await res.json();
    if (res.ok) {
      setSettings(data.settings);
      setSnapshot(data.snapshot);
    }
  }

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/capacity-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }
    await refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded text-sm border border-gray-300 bg-white hover:bg-gray-50"
      >
        Capacity settings
      </button>
    );
  }

  const paused = !settings.is_registration_open || computeAutoPause(snapshot);
  const full = isFull(snapshot);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded p-5 max-w-md w-full text-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Capacity settings</h2>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded p-3">
          <span>Confirmed booking:</span>
          <span className="font-medium">{snapshot.confirmedBooking}</span>
          <span>Outstanding (pending):</span>
          <span className="font-medium">{snapshot.outstanding}</span>
          <span>Cap:</span>
          <span className="font-medium">{snapshot.cap}</span>
          <span>Buffer:</span>
          <span className="font-medium">{snapshot.buffer}</span>
          <span>Auto-pause active:</span>
          <span className="font-medium">{computeAutoPause(snapshot) ? "Yes" : "No"}</span>
          <span>Full (EOI showing):</span>
          <span className="font-medium">{full ? "Yes" : "No"}</span>
        </div>

        <label className="block">
          Guaranteed seat cap
          <input
            type="number"
            defaultValue={settings.guaranteed_seat_cap}
            onBlur={(e) => save({ guaranteed_seat_cap: Number(e.target.value) })}
            className="w-full border rounded px-2 py-1 mt-1"
          />
        </label>

        <label className="block">
          Buffer (reserve below cap for auto-pause)
          <input
            type="number"
            defaultValue={settings.waitlist_alert_threshold}
            onBlur={(e) => save({ waitlist_alert_threshold: Number(e.target.value) })}
            className="w-full border rounded px-2 py-1 mt-1"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!settings.is_registration_open}
            onChange={(e) => save({ is_registration_open: !e.target.checked })}
          />
          Pause registration (manual)
        </label>

        <label className="block">
          Pause message (shown on the public site while paused)
          <textarea
            defaultValue={settings.pause_message ?? ""}
            onBlur={(e) => save({ pause_message: e.target.value })}
            className="w-full border rounded px-2 py-1 mt-1"
            rows={3}
          />
        </label>

        {paused && (
          <p className="text-amber-700 text-xs">
            Registration is currently Paused on the public site
            {!settings.is_registration_open ? " (manual pause)" : " (auto-pause: backlog near cap)"}.
          </p>
        )}

        {saving && <p className="text-gray-500 text-xs">Saving...</p>}
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </div>
    </div>
  );
}
