"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeAmountInr } from "@/lib/payment/pricing";
import { MAX_ATTENDEES_PER_SUBMISSION } from "@/lib/registration/limits";
import FormInput from "./FormInput";
import UpiPaymentInfo from "./UpiPaymentInfo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"fullName" | "email" | "phone" | "paymentReference", string>>;

export default function RegistrationForm({
  paymentMode,
  contactEmail,
}: {
  paymentMode: string;
  contactEmail: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [numAttendees, setNumAttendees] = useState(1);

  const isPhonePe = paymentMode === "phonepe_sandbox";
  const amountInr = computeAmountInr(numAttendees);

  function validate(form: FormData): FieldErrors {
    const errors: FieldErrors = {};
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const paymentReference = String(form.get("paymentReference") ?? "").trim();

    if (!fullName) errors.fullName = "Please enter your full name.";
    if (!email) errors.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
    if (!phone) errors.phone = "Please enter your phone number.";
    if (!isPhonePe && !paymentReference) {
      errors.paymentReference = "Please enter your payment reference / transaction ID.";
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    const payload = {
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      numAttendees,
      paymentReference: isPhonePe ? undefined : form.get("paymentReference"),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      if (data.duplicate) {
        setError(
          `You already have a registration (ID ${data.existingRegistrationId}). ` +
            `Contact us at ${contactEmail} if you need to change it.`
        );
        return;
      }
      setError(
        data.error
          ? `${data.error} If this continues, contact us at ${contactEmail}.`
          : `Something went wrong. Please try again, or contact us at ${contactEmail} if this continues.`
      );
      return;
    }

    if (isPhonePe && data.status === "pending") {
      const initRes = await fetch("/api/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: data.id }),
      });
      const initData = await initRes.json();

      if (!initRes.ok || !initData.redirectUrl) {
        setSubmitting(false);
        setError(
          `Registered, but couldn't start PhonePe checkout. Contact us at ${contactEmail} with registration ID ${data.id}.`
        );
        return;
      }

      window.location.href = initData.redirectUrl;
      return;
    }

    setSubmitting(false);
    router.push(`/confirmation/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormInput
        label="Full name"
        name="fullName"
        error={fieldErrors.fullName}
      />
      <FormInput
        type="email"
        label="Email"
        name="email"
        error={fieldErrors.email}
      />
      <FormInput
        label="Phone"
        name="phone"
        error={fieldErrors.phone}
      />
      <div>
        <label htmlFor="numAttendees" className="block text-sm font-medium text-ink mb-1">
          Number of attendees
        </label>
        <select
          id="numAttendees"
          name="numAttendees"
          value={numAttendees}
          onChange={(e) => setNumAttendees(Number(e.target.value))}
          className="w-full border border-gold/40 rounded-lg px-3.5 py-2.5 bg-white text-ink outline-none transition focus:ring-2 focus:ring-saffron focus:border-saffron"
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

      <div className="border-t border-gold/30 pt-4 space-y-3">
        <p className="text-sm text-ink/60">
          Registration fee: <strong className="text-maroon">₹{amountInr}</strong>
          {isPhonePe
            ? " — pay securely online below (any UPI app, card, or netbanking)."
            : " — pay via UPI/bank transfer, then enter the transaction reference below."}
        </p>
        {!isPhonePe && <UpiPaymentInfo amountInr={amountInr} />}
        {!isPhonePe && (
          <div>
            <FormInput
              label="Payment reference / transaction ID"
              name="paymentReference"
              error={fieldErrors.paymentReference}
            />
            <p className="text-xs text-ink/50 mt-1">
              Your seat will show as <em>pending</em> until an organizer
              manually verifies the payment.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto bg-maroon hover:bg-maroon-dark text-white px-6 py-2.5 rounded-full font-medium disabled:opacity-50 transition"
      >
        {submitting
          ? "Submitting..."
          : isPhonePe
            ? `Pay ₹${amountInr} online`
            : "Register"}
      </button>
    </form>
  );
}
