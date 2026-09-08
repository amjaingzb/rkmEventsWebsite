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
  seatNumber: number | null;
  numAttendees: number;
  paymentAmount: number | null;
  verifiedAt: string;
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
        ${
          input.seatNumber
            ? `<strong>Seat No:</strong> ${input.seatNumber}<br/>`
            : ""
        }
        <strong>Number of attendees:</strong> ${input.numAttendees}<br/>
        ${
          input.paymentAmount != null
            ? `<strong>Payment amount:</strong> ₹${input.paymentAmount}<br/>`
            : ""
        }
        <strong>Confirmed on:</strong> ${new Date(input.verifiedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}<br/>
        <strong>Registration ID:</strong> ${input.regId}
      </p>
      <img src="cid:${qrContentId}" alt="Ticket QR code" width="220" height="220" />
    </div>
  `;

  await resend.emails.send({
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
}
