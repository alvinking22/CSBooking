import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@example.com";

interface BookingEmailData {
  clientName: string;
  clientEmail: string;
  bookingNumber: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  studioName?: string;
  totalPrice: number;
  depositAmount?: number;
  businessName?: string;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  if (!resend) return; // Skip if Resend is not configured

  try {
    const businessName = data.businessName || "CS Booking";
    await resend.emails.send({
      from: `${businessName} <${EMAIL_FROM}>`,
      to: data.clientEmail,
      subject: `Confirmación de reserva ${data.bookingNumber} - ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px;">Reserva Confirmada</h1>
          <p>Hola <strong>${data.clientName}</strong>,</p>
          <p>Tu reserva ha sido recibida exitosamente. Aquí están los detalles:</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>N° de Reserva:</strong> ${data.bookingNumber}</p>
            <p style="margin: 8px 0;"><strong>Servicio:</strong> ${data.serviceName}</p>
            ${data.studioName ? `<p style="margin: 8px 0;"><strong>Estudio:</strong> ${data.studioName}</p>` : ""}
            <p style="margin: 8px 0;"><strong>Fecha:</strong> ${data.sessionDate}</p>
            <p style="margin: 8px 0;"><strong>Horario:</strong> ${data.startTime} - ${data.endTime}</p>
            <p style="margin: 8px 0;"><strong>Total:</strong> $${data.totalPrice.toFixed(2)}</p>
            ${data.depositAmount ? `<p style="margin: 8px 0;"><strong>Depósito requerido:</strong> $${data.depositAmount.toFixed(2)}</p>` : ""}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Puedes consultar el estado de tu reserva en cualquier momento usando tu número de reserva o correo electrónico.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">${businessName}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
  }
}

export async function sendBookingStatusUpdate(
  clientEmail: string,
  clientName: string,
  bookingNumber: string,
  status: string,
  businessName?: string
) {
  if (!resend) return;

  const statusLabels: Record<string, string> = {
    CONFIRMED: "Confirmada",
    CANCELLED: "Cancelada",
    COMPLETED: "Completada",
  };

  const statusLabel = statusLabels[status];
  if (!statusLabel) return; // Only send for meaningful status changes

  const name = businessName || "CS Booking";

  try {
    await resend.emails.send({
      from: `${name} <${EMAIL_FROM}>`,
      to: clientEmail,
      subject: `Reserva ${bookingNumber} - ${statusLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px;">Actualización de Reserva</h1>
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Tu reserva <strong>${bookingNumber}</strong> ha sido <strong>${statusLabel.toLowerCase()}</strong>.</p>
          ${status === "CONFIRMED" ? "<p>¡Te esperamos en la fecha programada!</p>" : ""}
          ${status === "CANCELLED" ? "<p>Si tienes preguntas, no dudes en contactarnos.</p>" : ""}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">${name}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending booking status email:", error);
  }
}
