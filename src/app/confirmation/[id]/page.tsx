import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { computeAmountInr } from "@/lib/payment/pricing";
import UpiPaymentInfo from "@/components/UpiPaymentInfo";
import ConfirmationPhonePeReconciler from "@/components/ConfirmationPhonePeReconciler";

function statusCopy(contactEmail: string): Record<string, { title: string; body: string }> {
  return {
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
      body: `Please contact us at ${contactEmail} with your registration ID below to resolve this.`,
    },
  };
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, full_name, status, num_attendees, events(payment_mode, contact_email)")
    .eq("id", id)
    .single();

  if (!reg) notFound();

  const eventInfo = (
    reg as unknown as { events: { payment_mode: string; contact_email: string | null } | null }
  ).events;
  const paymentMode = eventInfo?.payment_mode ?? "manual";
  const contactEmail = eventInfo?.contact_email ?? "";
  const STATUS_COPY = statusCopy(contactEmail);
  const copy = STATUS_COPY[reg.status] ?? STATUS_COPY.pending;
  const isPending = reg.status === "pending";

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">{copy.title}</h1>
      <p className="text-gray-600 mb-6">{copy.body}</p>
      <div className="border rounded p-4 text-sm text-left">
        <p>
          <strong>Name:</strong> {reg.full_name}
        </p>
        <p className="mt-2 text-gray-500 break-all">
          <strong>Registration ID:</strong> {reg.id}
        </p>
      </div>

      {isPending && paymentMode !== "phonepe_sandbox" && (
        <div className="mt-6 text-left">
          <p className="text-sm text-gray-500 mb-3">
            Manual verification can take up to 5 days. If you haven&apos;t
            heard back by then, contact us at {contactEmail} with your
            payment proof.
          </p>
          <UpiPaymentInfo amountInr={computeAmountInr(reg.num_attendees)} />
        </div>
      )}
      {isPending && paymentMode === "phonepe_sandbox" && (
        <ConfirmationPhonePeReconciler registrationId={reg.id} />
      )}
    </main>
  );
}
