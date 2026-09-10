import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ConfirmationPhonePeReconciler from "@/components/ConfirmationPhonePeReconciler";
import { getStatusTitle, type RegistrationStatus } from "@/lib/registration/statusMessages";

function statusBody(contactEmail: string): Record<RegistrationStatus, string> {
  return {
    pending:
      "We've recorded your payment reference. An organizer will verify it and email your ticket shortly.",
    verified: "Your registration is confirmed. Your ticket (with QR code) has been emailed to you.",
    waitlisted:
      "Guaranteed seats are full. You've been added to the expression-of-interest list — if a larger venue becomes available, we'll reach out to you.",
    rejected: `Please contact us at ${contactEmail} with your registration ID below to resolve this.`,
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
    .select(
      "id, full_name, status, events(payment_mode, contact_email, contact_phone, contact_whatsapp_number)"
    )
    .eq("id", id)
    .single();

  if (!reg) notFound();

  const eventInfo = (
    reg as unknown as {
      events: {
        payment_mode: string;
        contact_email: string | null;
        contact_phone: string | null;
        contact_whatsapp_number: string | null;
      } | null;
    }
  ).events;
  const paymentMode = eventInfo?.payment_mode ?? "manual";
  const contactEmail = eventInfo?.contact_email ?? "";
  const contactPhone = eventInfo?.contact_phone ?? "";
  const contactWhatsappNumber = eventInfo?.contact_whatsapp_number ?? "";
  const status = (reg.status as RegistrationStatus) ?? "pending";
  const body = statusBody(contactEmail)[status] ?? statusBody(contactEmail).pending;
  const isPending = reg.status === "pending";

  return (
    <main className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">{getStatusTitle(status)}</h1>
      <p className="text-gray-600 mb-6">{body}</p>
      <div className="border rounded p-4 text-sm text-left">
        <p>
          <strong>Name:</strong> {reg.full_name}
        </p>
        <p className="mt-2 text-gray-500 break-all">
          <strong>Registration ID:</strong> {reg.id}
        </p>
      </div>

      {isPending && paymentMode !== "phonepe_sandbox" && (
        <p className="mt-6 text-sm text-gray-500 text-left">
          Manual verification can take up to 5 days. If you haven&apos;t
          heard back by then, contact us with your payment proof.
        </p>
      )}
      {isPending && paymentMode === "phonepe_sandbox" && (
        <ConfirmationPhonePeReconciler registrationId={reg.id} />
      )}

      <div className="mt-6 pt-6 border-t text-sm text-gray-500 flex flex-col items-center gap-3">
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="hover:text-gray-800 transition">
              {contactEmail}
            </a>
          )}
          {contactPhone && (
            <a href={`tel:+91${contactPhone}`} className="hover:text-gray-800 transition">
              {contactPhone}
            </a>
          )}
          {contactWhatsappNumber && (
            <a
              href={`https://wa.me/91${contactWhatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-800 transition"
            >
              WhatsApp
            </a>
          )}
        </p>
        <Link href="/" className="text-maroon hover:underline font-medium">
          ← Back to homepage
        </Link>
      </div>
    </main>
  );
}
