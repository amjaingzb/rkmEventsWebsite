"use client";

import { useEffect, useMemo, useState } from "react";
import AdminManualRegisterForm from "./AdminManualRegisterForm";
import WhatsAppIcon from "./WhatsAppIcon";
import { getStatusMessage, type RegistrationStatus } from "@/lib/registration/statusMessages";
import { normalizePhone } from "@/lib/phone";

type Status = RegistrationStatus;

const PHONEPE_GATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour, matches src/lib/registration/phonepeGate.ts

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  num_attendees: number;
  payment_reference: string | null;
  payment_amount: number | null;
  status: Status;
  registration_number: number | null;
  registration_mode: "manual" | "phonepe" | "walkin" | null;
  rejection_reason: string | null;
  ticket_sent_at: string | null;
  verified_at: string | null;
  created_at: string;
}

interface EventInfo {
  title: string;
  event_date: string;
  contact_email: string | null;
}

const TABS: { label: string; value: Status | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Rejected", value: "rejected" },
];

/** A pending PhonePe row is resolved automatically by the webhook/status-
 * check path for the first hour — manual Verify/Reject/WhatsApp are
 * disabled during that window, then become a manual override/fallback.
 * Mirrors src/lib/registration/phonepeGate.ts's server-side guard. */
function isPhonePeGated(r: Registration): boolean {
  if (r.status !== "pending" || r.registration_mode !== "phonepe") return false;
  return Date.now() - new Date(r.created_at).getTime() < PHONEPE_GATE_WINDOW_MS;
}

function whatsappLink(r: Registration, event: EventInfo | null): string {
  const context = event
    ? `regarding your registration for ${event.title} on ${new Date(event.event_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}: `
    : "regarding your registration: ";
  const message = `Hi ${r.full_name}, ${context}${getStatusMessage(r.status, event?.contact_email ?? "", r.rejection_reason)}`;
  return `https://wa.me/${normalizePhone(r.phone)}?text=${encodeURIComponent(message)}`;
}

function matchesSearch(r: Registration, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return [
    r.full_name,
    r.email,
    r.phone,
    r.payment_reference ?? "",
    r.registration_number != null ? String(r.registration_number) : "",
    r.id,
  ].some((field) => field.toLowerCase().includes(needle));
}

export default function AdminTable() {
  const [tab, setTab] = useState<Status | "all">("pending");
  const [rows, setRows] = useState<Registration[]>([]);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load(currentTab: Status | "all") {
    setLoading(true);
    setError(null);
    const qs = currentTab === "all" ? "" : `?status=${currentTab}`;
    const res = await fetch(`/api/admin/registrations${qs}`);
    const data = await res.json();
    setRows(data.registrations ?? []);
    setEvent(data.event ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const visibleRows = useMemo(
    () => rows.filter((r) => matchesSearch(r, search)),
    [rows, search]
  );

  async function runAction(id: string, url: string, extraBody: Record<string, unknown> = {}) {
    setBusyId(id);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id, ...extraBody }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Action failed");
    } else if (url === "/api/admin/verify" && data.waitlisted) {
      setError(
        "Payment confirmed, but capacity filled in the meantime — moved to " +
          "waitlisted. Needs manual resolution (refund or next-batch invite)."
      );
    }
    setBusyId(null);
    await load(tab);
  }

  function confirmRejectedVerify(r: Registration) {
    if (
      window.confirm(
        `Verify ${r.full_name}'s registration? This was previously rejected — ` +
          `confirm you've checked their payment proof before continuing.`
      )
    ) {
      runAction(r.id, "/api/admin/verify");
    }
  }

  async function submitReject(id: string) {
    await runAction(id, "/api/admin/reject", { reason: rejectReason });
    setRejectingId(null);
    setRejectReason("");
  }

  return (
    <div>
      <AdminManualRegisterForm onDone={() => load(tab)} />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1 rounded text-sm border ${
                tab === t.value
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, reg. no., ref, ID..."
            className="border rounded px-2 py-1 text-sm w-64"
          />
          <a
            href="/api/admin/export"
            className="px-3 py-1 rounded text-sm border border-gray-300 bg-white hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : visibleRows.length === 0 ? (
        <p>No registrations match this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Reg. No.</th>
                <th className="py-2 pr-4">Reg. ID (registrant-facing)</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Attendees</th>
                <th className="py-2 pr-4">Mode</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Received</th>
                <th className="py-2 pr-4">Confirmed</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const isPending = r.status === "pending";
                const isRejected = r.status === "rejected";
                const gated = isPhonePeGated(r);
                const showVerifyReject = isPending && !gated;
                const showNotifyAgain = !isPending;
                const isRejectingThisRow = rejectingId === r.id;

                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-4">{r.registration_number ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500 break-all max-w-[10rem]">
                      {r.id}
                    </td>
                    <td className="py-2 pr-4">{r.full_name}</td>
                    <td className="py-2 pr-4">
                      {r.email}
                      <br />
                      {r.phone}
                    </td>
                    <td className="py-2 pr-4">{r.num_attendees}</td>
                    <td className="py-2 pr-4 capitalize">{r.registration_mode ?? "manual"}</td>
                    <td className="py-2 pr-4">
                      {r.payment_reference ?? "—"}
                      {r.payment_amount != null ? ` (₹${r.payment_amount})` : ""}
                    </td>
                    <td className="py-2 pr-4 capitalize">
                      {r.status}
                      {r.status === "waitlisted" && r.payment_reference != null && (
                        <span className="ml-2 text-amber-700 text-xs whitespace-nowrap">
                          ⚠ paid — needs resolution
                        </span>
                      )}
                      {isRejected && r.rejection_reason && (
                        <div className="text-xs text-gray-500 font-normal normal-case mt-1 max-w-[12rem]">
                          Reason: {r.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      {r.verified_at ? new Date(r.verified_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-col gap-1 items-start">
                        {gated && (
                          <p className="text-xs text-amber-700 max-w-[11rem]">
                            Awaiting PhonePe confirmation — manual override
                            available 1 hour after submission.
                          </p>
                        )}

                        {showVerifyReject && !isRejectingThisRow && (
                          <>
                            <button
                              onClick={() => runAction(r.id, "/api/admin/verify")}
                              disabled={busyId === r.id}
                              className="bg-black text-white px-3 py-1 rounded disabled:opacity-50"
                            >
                              {busyId === r.id ? "Working..." : "Verify"}
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(r.id);
                                setRejectReason("");
                              }}
                              disabled={busyId === r.id}
                              className="text-red-600 border border-red-300 px-3 py-1 rounded disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {showVerifyReject && isRejectingThisRow && (
                          <div className="flex flex-col gap-1 w-48">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason (optional) — included in the rejection email"
                              rows={2}
                              className="border rounded px-2 py-1 text-xs"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => submitReject(r.id)}
                                disabled={busyId === r.id}
                                className="text-red-600 border border-red-300 px-2 py-1 rounded text-xs disabled:opacity-50"
                              >
                                {busyId === r.id ? "Working..." : "Confirm Reject"}
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason("");
                                }}
                                disabled={busyId === r.id}
                                className="text-gray-600 border border-gray-300 px-2 py-1 rounded text-xs disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <button
                            onClick={() => confirmRejectedVerify(r)}
                            disabled={busyId === r.id}
                            className="bg-black text-white px-3 py-1 rounded disabled:opacity-50"
                          >
                            {busyId === r.id ? "Working..." : "Verify"}
                          </button>
                        )}

                        {showNotifyAgain && (
                          <button
                            onClick={() => runAction(r.id, "/api/admin/resend")}
                            disabled={busyId === r.id}
                            className="border border-gray-300 px-3 py-1 rounded disabled:opacity-50"
                          >
                            {busyId === r.id
                              ? "Working..."
                              : r.status === "verified"
                                ? "Resend ticket"
                                : "Send email"}
                          </button>
                        )}

                        {!gated ? (
                          <a
                            href={whatsappLink(r, event)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-700 border border-green-300 px-3 py-1 rounded inline-flex items-center gap-1.5"
                          >
                            <WhatsAppIcon />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="text-green-700/40 border border-green-300/40 px-3 py-1 rounded cursor-not-allowed inline-flex items-center gap-1.5">
                            <WhatsAppIcon />
                            WhatsApp
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
