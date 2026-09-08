import { CONTACT_EMAIL } from "@/lib/contact";

export type RegistrationStatus = "pending" | "verified" | "waitlisted" | "rejected";

/**
 * Single source of truth for the human-readable status blurb used in both
 * the admin WhatsApp deep link (client) and the status-update email
 * (server) — kept as one plain map (no server-only imports) so both sides
 * can import it without pulling in the other's dependencies.
 */
export const STATUS_MESSAGE: Record<RegistrationStatus, string> = {
  pending: "your registration is received and your payment is being verified.",
  verified:
    "your ticket has been sent to your email — please check your inbox (and spam folder).",
  waitlisted:
    "you're currently on our waitlist. We'll reach out if a seat opens up.",
  rejected: `there was an issue with your registration — please contact us at ${CONTACT_EMAIL} to resolve it.`,
};
