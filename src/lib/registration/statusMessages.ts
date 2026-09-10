export type RegistrationStatus = "pending" | "verified" | "waitlisted" | "rejected";

const STATUS_MESSAGE_TEMPLATE: Record<RegistrationStatus, string> = {
  pending: "your registration is received and your payment is being verified.",
  verified:
    "your ticket has been sent to your email — please check your inbox (and spam folder).",
  waitlisted:
    "you're currently on our waitlist. We'll reach out if a seat opens up.",
  rejected:
    "there was an issue with your registration — please contact us at {contactEmail} to resolve it.",
};

/**
 * Same headline text shown on the confirmation page's <h1> — shared here
 * so it can also drive the acknowledgement/status email's subject line
 * without the two drifting apart over time.
 */
const STATUS_TITLE: Record<RegistrationStatus, string> = {
  pending: "Seat reserved — pending verification",
  verified: "Confirmed!",
  waitlisted: "You're on the waitlist",
  rejected: "Payment could not be verified",
};

export function getStatusTitle(status: RegistrationStatus): string {
  return STATUS_TITLE[status];
}

/**
 * Single source of truth for the human-readable status blurb used in both
 * the admin WhatsApp deep link (client) and the status-update email
 * (server) — a function rather than a plain map now that `rejected` needs
 * the DB-backed contact email (src/lib/content, not a hardcoded constant)
 * filled in at call time. `reason` (rejected only) is the admin-supplied
 * rejection_reason, appended when present.
 */
export function getStatusMessage(
  status: RegistrationStatus,
  contactEmail: string,
  reason?: string | null
): string {
  const base = STATUS_MESSAGE_TEMPLATE[status].replace("{contactEmail}", contactEmail);
  if (status === "rejected" && reason) {
    return `${base} Reason: ${reason}`;
  }
  return base;
}
