import { Resend } from "resend";
import { buildQrBuffer } from "./qr";

interface TicketEmailInput {
  toEmail: string;
  fullName: string;
  regId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  phone: string;
  numAttendees: number;
  paymentAmount: number | null;
  verifiedAt: string;
  contactEmail: string;
}

export async function sendTicketEmail(input: TicketEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TICKET_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw new Error("RESEND_API_KEY / TICKET_FROM_EMAIL not set");
  }

  const resend = new Resend(apiKey);
  const qrBuffer = await buildQrBuffer(input.regId, input.eventSlug);
  const qrContentId = "ticket-qr";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${input.eventTitle}</h2>
      <p>Dear ${input.fullName},</p>
      <p>Your registration is confirmed. Please show the QR code below at entry.</p>
      <p>
        <strong>Date:</strong> ${input.eventDate}<br/>
        <strong>Time:</strong> ${input.startTime} - ${input.endTime}<br/>
        <strong>Venue:</strong> ${input.venueName}<br/>
        <strong>Number of attendees:</strong> ${input.numAttendees}<br/>
        ${
          input.paymentAmount != null
            ? `<strong>Payment amount:</strong> ₹${input.paymentAmount}<br/>`
            : ""
        }
        <strong>Confirmed on:</strong> ${new Date(input.verifiedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}<br/>
        <strong>Registration ID:</strong> ${input.regId}<br/>
        <strong>Phone:</strong> ${input.phone}
      </p>
      <img src="cid:${qrContentId}" alt="Ticket QR code" width="220" height="220" />
      <p style="color: #666; font-size: 13px; margin-top: 24px;">
        Need help? Contact us at ${input.contactEmail}
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: input.toEmail,
    subject: `Your ticket: ${input.eventTitle}`,
    html,
    attachments: [
      {
        filename: "ticket-qr.png",
        content: qrBuffer,
        contentType: "image/png",
        // Not in the SDK's Attachment type, but passed through untouched to
        // the API, which does support it — required for `cid:` embedding.
        content_id: qrContentId,
      } as unknown as { filename: string; content: Buffer; contentType: string },
    ],
  });

  if (error) {
    throw new Error(`Resend failed to send ticket email: ${error.name} — ${error.message}`);
  }
}

interface StatusEmailInput {
  toEmail: string;
  fullName: string;
  eventTitle: string;
  eventDate: string;
  regId: string;
  message: string;
  contactEmail: string;
  /** Same headline shown on the confirmation page (getStatusTitle) — kept
   * as the subject so the page and the email can't say different things. */
  subject: string;
}

/**
 * A plain status-update email (no QR/ticket) for admin "resend" on a
 * registration that was never issued a ticket — pending/waitlisted/rejected.
 * Carries the same event-date + registration-ID detail as the WhatsApp
 * status message (getStatusMessage) so the two channels don't drift apart in
 * how much context they give the recipient.
 */
export async function sendStatusEmail(input: StatusEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TICKET_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw new Error("RESEND_API_KEY / TICKET_FROM_EMAIL not set");
  }

  const resend = new Resend(apiKey);

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${input.eventTitle}</h2>
      <p>Dear ${input.fullName},</p>
      <p>${input.message}</p>
      <p style="color: #666; font-size: 13px;">
        <strong>Event date:</strong> ${new Date(input.eventDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}<br/>
        <strong>Registration ID:</strong> ${input.regId}
      </p>
      <p style="color: #666; font-size: 13px; margin-top: 24px;">
        Need help? Contact us at ${input.contactEmail}
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: input.toEmail,
    subject: `${input.subject}: ${input.eventTitle}`,
    html,
  });

  if (error) {
    throw new Error(`Resend failed to send status email: ${error.name} — ${error.message}`);
  }
}
