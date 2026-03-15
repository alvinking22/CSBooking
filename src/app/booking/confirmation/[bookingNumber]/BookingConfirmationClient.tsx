"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { formatMoney } from "@/utils/formatMoney";
import { useConfig } from "@/contexts/ConfigContext";
import { Calendar, Clock, MessageSquare, Download } from "lucide-react";

interface Booking {
  id: string; bookingNumber: string; clientName: string; clientEmail: string;
  clientPhone?: string | null; sessionDate: string; startTime: string; endTime: string;
  duration: unknown; totalPrice: unknown; status: string;
  serviceType?: { name: string } | null;
  studio?: { name: string; color?: string | null } | null;
}

export default function BookingConfirmationClient({ booking }: { booking: Booking }) {
  const { config } = useConfig();
  const pc = config?.primaryColor || "#3B82F6";
  const dateStr = booking.sessionDate.toString().slice(0, 10);
  const checkUrl = typeof window !== "undefined"
    ? `${window.location.origin}/booking/check?ref=${booking.bookingNumber}`
    : `/booking/check?ref=${booking.bookingNumber}`;

  const generateICS = () => {
    const d = dateStr.replace(/-/g, "");
    const dtStart = `${d}T${booking.startTime.slice(0,2)}${booking.startTime.slice(3,5)}00`;
    const dtEnd = `${d}T${booking.endTime.slice(0,2)}${booking.endTime.slice(3,5)}00`;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CSBooking//ES",
      "BEGIN:VEVENT",
      `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
      `SUMMARY:Reserva ${booking.bookingNumber} - ${config?.businessName || "CS Booking"}`,
      `LOCATION:${config?.address || ""}`,
      `DESCRIPTION:Reserva ${booking.bookingNumber}\\nCliente: ${booking.clientName}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reserva-${booking.bookingNumber}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const phone = (config?.phone || "").replace(/[^0-9+]/g, "");
  const waText = encodeURIComponent(
    `Hola! Acabo de hacer una reserva.\n\nNúmero: ${booking.bookingNumber}\nFecha: ${format(new Date(dateStr + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}\nHorario: ${booking.startTime?.slice(0,5)} - ${booking.endTime?.slice(0,5)}`
  );
  const waUrl = phone ? `https://wa.me/${phone.replace("+", "")}?text=${waText}` : null;

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Success card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: `${pc}20`, color: pc }}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">¡Reserva Confirmada!</h1>
          <p className="text-gray-500 text-sm">Tu reserva ha sido recibida exitosamente</p>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Número de reserva</p>
            <p className="text-2xl font-mono font-bold" style={{ color: pc }}>{booking.bookingNumber}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-4 h-4 mt-0.5 shrink-0" style={{ color: pc }} />
              <div>
                <p className="text-xs text-gray-400">Fecha</p>
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(dateStr + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: pc }} />
              <div>
                <p className="text-xs text-gray-400">Horario</p>
                <p className="text-sm font-semibold text-gray-900">
                  {booking.startTime?.slice(0,5)} - {booking.endTime?.slice(0,5)}
                </p>
              </div>
            </div>
            {booking.serviceType && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-4 h-4 mt-0.5 shrink-0 rounded-full" style={{ background: pc }} />
                <div>
                  <p className="text-xs text-gray-400">Servicio</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.serviceType.name}</p>
                </div>
              </div>
            )}
            {booking.studio && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-4 h-4 mt-0.5 shrink-0 rounded-full" style={{ background: booking.studio.color || pc }} />
                <div>
                  <p className="text-xs text-gray-400">Estudio</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.studio.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 border border-gray-100 rounded-xl text-left">
            <p className="text-xs text-gray-400 mb-1">Total a pagar</p>
            <p className="text-2xl font-bold text-gray-900">${formatMoney(Number(booking.totalPrice))}</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-900 mb-4">Código QR de tu reserva</p>
          <div className="p-4 bg-white border border-gray-100 rounded-xl">
            <QRCodeSVG value={checkUrl} size={160} level="M" />
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Muestra este código en el estudio para verificar tu reserva
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
          <button onClick={generateICS}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Agregar al calendario
          </button>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: "#25D366" }}>
              <MessageSquare className="w-4 h-4" />
              Contactar por WhatsApp
            </a>
          )}
          <Link href="/booking/check"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Ver estado de mi reserva
          </Link>
          <Link href="/"
            className="w-full flex items-center justify-center py-3 px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
