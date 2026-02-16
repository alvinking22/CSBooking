const nodemailer = require('nodemailer');
const { BusinessConfig } = require('../models');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send email function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.BUSINESS_NAME || 'CS Booking'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Booking confirmation email
const sendBookingConfirmation = async (booking, businessConfig) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${businessConfig.primaryColor || '#3B82F6'}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .detail-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #666; }
        .button { display: inline-block; padding: 12px 30px; background-color: ${businessConfig.primaryColor || '#3B82F6'}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Reserva Confirmada! 🎬</h1>
        </div>
        <div class="content">
          <p>Hola ${booking.clientName},</p>
          <p>Tu reserva ha sido confirmada exitosamente. Aquí están los detalles:</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Número de Reserva:</span> ${booking.bookingNumber}
            </div>
            <div class="detail-row">
              <span class="detail-label">Fecha:</span> ${new Date(booking.sessionDate).toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div class="detail-row">
              <span class="detail-label">Hora:</span> ${booking.startTime} - ${booking.endTime}
            </div>
            <div class="detail-row">
              <span class="detail-label">Duración:</span> ${booking.duration} hora(s)
            </div>
            <div class="detail-row">
              <span class="detail-label">Total:</span> ${businessConfig.currency} $${parseFloat(booking.totalPrice).toFixed(2)}
            </div>
            ${booking.depositAmount > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Señal:</span> ${businessConfig.currency} $${parseFloat(booking.depositAmount).toFixed(2)}
            </div>
            ` : ''}
          </div>

          <p><strong>Información Importante:</strong></p>
          <ul>
            <li>Por favor llega 10 minutos antes de tu hora programada</li>
            <li>Trae tu identificación</li>
            <li>Si necesitas cancelar o hacer cambios, contáctanos con al menos 24 horas de anticipación</li>
          </ul>

          <p><strong>Ubicación:</strong><br>
          ${businessConfig.address || 'Dirección por confirmar'}</p>

          <p>¿Tienes preguntas? Contáctanos:</p>
          <p>📧 ${businessConfig.email}<br>
          📱 ${businessConfig.phone || ''}</p>
        </div>
        <div class="footer">
          <p>${businessConfig.businessName}</p>
          <p>Este es un email automático, por favor no respondas directamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: booking.clientEmail,
    subject: `Confirmación de Reserva - ${booking.bookingNumber}`,
    html,
    text: `Tu reserva ${booking.bookingNumber} ha sido confirmada para el ${booking.sessionDate} a las ${booking.startTime}.`
  });
};

// Booking reminder email
const sendBookingReminder = async (booking, businessConfig) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${businessConfig.primaryColor || '#3B82F6'}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .reminder-box { background-color: #FEF3C7; padding: 15px; margin: 15px 0; border-left: 4px solid #F59E0B; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recordatorio de Sesión 🎬</h1>
        </div>
        <div class="content">
          <div class="reminder-box">
            <h2>¡Tu sesión es mañana!</h2>
            <p><strong>Fecha:</strong> ${new Date(booking.sessionDate).toLocaleDateString('es-DO')}</p>
            <p><strong>Hora:</strong> ${booking.startTime}</p>
            <p><strong>Reserva:</strong> ${booking.bookingNumber}</p>
          </div>

          <p>Hola ${booking.clientName},</p>
          <p>Este es un recordatorio amigable de tu sesión de grabación programada.</p>
          
          <p><strong>Recuerda:</strong></p>
          <ul>
            <li>Llega 10 minutos antes</li>
            <li>Trae tu identificación</li>
            <li>Cualquier material que necesites para tu grabación</li>
          </ul>

          <p>📍 ${businessConfig.address || 'Dirección por confirmar'}</p>
          <p>📧 ${businessConfig.email} | 📱 ${businessConfig.phone || ''}</p>

          <p>¡Nos vemos pronto!</p>
        </div>
        <div class="footer">
          <p>${businessConfig.businessName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: booking.clientEmail,
    subject: `Recordatorio: Tu sesión es mañana - ${booking.bookingNumber}`,
    html,
    text: `Recordatorio: Tu sesión ${booking.bookingNumber} es mañana ${booking.sessionDate} a las ${booking.startTime}.`
  });
};

// Booking cancellation email
const sendBookingCancellation = async (booking, businessConfig, reason) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reserva Cancelada</h1>
        </div>
        <div class="content">
          <p>Hola ${booking.clientName},</p>
          <p>Tu reserva ${booking.bookingNumber} ha sido cancelada.</p>
          
          ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ''}

          <p><strong>Detalles de la reserva cancelada:</strong></p>
          <p>Fecha: ${booking.sessionDate}<br>
          Hora: ${booking.startTime} - ${booking.endTime}</p>

          <p>Si tienes preguntas sobre esta cancelación, por favor contáctanos.</p>
          <p>📧 ${businessConfig.email} | 📱 ${businessConfig.phone || ''}</p>
        </div>
        <div class="footer">
          <p>${businessConfig.businessName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: booking.clientEmail,
    subject: `Cancelación de Reserva - ${booking.bookingNumber}`,
    html,
    text: `Tu reserva ${booking.bookingNumber} ha sido cancelada. ${reason || ''}`
  });
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendBookingReminder,
  sendBookingCancellation
};
