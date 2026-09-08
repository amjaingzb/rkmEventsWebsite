"use client";

import { useEffect, useState } from "react";

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  num_attendees: number;
  payment_reference: string | null;
  payment_amount: number | null;
  seat_number: number | null;
  created_at: string;
}

export default function AdminTable() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pending");
    const data = await res.json();
    setRows(data.registrations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleVerify(id: string) {
    setVerifyingId(id);
    await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id }),
    });
    setVerifyingId(null);
    await load();
  }

  if (loading) return <p>Loading...</p>;
  if (rows.length === 0) return <p>No pending registrations.</p>;

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left border-b">
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4">Contact</th>
          <th className="py-2 pr-4">Attendees</th>
          <th className="py-2 pr-4">Payment ref</th>
          <th className="py-2 pr-4">Amount</th>
          <th className="py-2 pr-4">Submitted</th>
          <th className="py-2 pr-4"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b">
            <td className="py-2 pr-4">{r.full_name}</td>
            <td className="py-2 pr-4">
              {r.email}
              <br />
              {r.phone}
            </td>
            <td className="py-2 pr-4">{r.num_attendees}</td>
            <td className="py-2 pr-4">{r.payment_reference}</td>
            <td className="py-2 pr-4">{r.payment_amount ?? "—"}</td>
            <td className="py-2 pr-4">
              {new Date(r.created_at).toLocaleString()}
            </td>
            <td className="py-2 pr-4">
              <button
                onClick={() => handleVerify(r.id)}
                disabled={verifyingId === r.id}
                className="bg-black text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {verifyingId === r.id ? "Verifying..." : "Verify"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
