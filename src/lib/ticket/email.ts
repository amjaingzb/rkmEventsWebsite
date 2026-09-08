import { Resend } from "resend";
import { buildQrDataUrl } from "./qr";

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
}

export async function sendTicketEmail(input: TicketEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TICKET_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    throw new Error("RESEND_API_KEY / TICKET_FROM_EMAIL not set");
  }

  const resend = new Resend(apiKey);
  const qrDataUrl = await buildQrDataUrl(input.regId, input.eventSlug);

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
        <strong>Registration ID:</strong> ${input.regId}
      </p>
      <img src="${qrDataUrl}" alt="Ticket QR code" width="220" height="220" />
    </div>
  `;

  await resend.emails.send({
    from: fromEmail,
    to: input.toEmail,
    subject: `Your ticket: ${input.eventTitle}`,
    html,
  });
}
