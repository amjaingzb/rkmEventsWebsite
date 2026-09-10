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
 * Single source of truth for the human-readable status blurb used in both
 * the admin WhatsApp deep link (client) and the status-update email
 * (server) — a function rather than a plain map now that `rejected` needs
 * the DB-backed contact email (src/lib/content, not a hardcoded constant)
 * filled in at call time.
 */
export function getStatusMessage(status: RegistrationStatus, contactEmail: string): string {
  return STATUS_MESSAGE_TEMPLATE[status].replace("{contactEmail}", contactEmail);
}
