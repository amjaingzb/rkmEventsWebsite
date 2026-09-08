import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: {
    title: "Seat reserved — pending verification",
    body: "We've recorded your payment reference. An organizer will verify it and email your ticket shortly.",
  },
  verified: {
    title: "Confirmed!",
    body: "Your registration is confirmed. Your ticket (with QR code) has been emailed to you.",
  },
  waitlisted: {
    title: "You're on the waitlist",
    body: "Guaranteed seats are full. You've been added to the expression-of-interest list — if a larger venue becomes available, we'll reach out to you.",
  },
  rejected: {
    title: "Payment could not be verified",
    body: "Please contact the organizers with your registration ID below to resolve this.",
  },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, full_name, status, seat_number")
    .eq("id", id)
    .single();

  if (!reg) notFound();

  const copy = STATUS_COPY[reg.status] ?? STATUS_COPY.pending;

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">{copy.title}</h1>
      <p className="text-gray-600 mb-6">{copy.body}</p>
      <div className="border rounded p-4 text-sm text-left">
        <p>
          <strong>Name:</strong> {reg.full_name}
        </p>
        {reg.seat_number && (
          <p>
            <strong>Seat number:</strong> {reg.seat_number}
          </p>
        )}
        <p className="mt-2 text-gray-500 break-all">
          <strong>Registration ID:</strong> {reg.id}
        </p>
      </div>
    </main>
  );
}
