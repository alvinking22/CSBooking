"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getBookingByNumber } from "@/actions/bookings";
import { formatMoney } from "@/utils/formatMoney";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfig } from "@/contexts/ConfigContext";
import { Search } from "lucide-react";

interface Booking {
  bookingNumber: string; clientName: string; clientEmail: string;
  sessionDate: string; startTime: string; endTime: string;
  status: string; paymentStatus: string; totalPrice: unknown;
  paidAmount?: unknown; remainingAmount?: unknown;
  serviceType?: { name: string } | null;
  studio?: { name: string; color?: string | null } | null;
  equipment?: Array<{ id: string; equipment: { name: string } }>;
}

function CheckBookingContent() {
  const { config } = useConfig();
  const searchParams = useSearchParams();
  const pc = config?.primaryColor || "#3B82F6";
  const [bookingNumber, setBookingNumber] = useState(searchParams.get("ref") || "");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-search if ref is in URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) handleSearch(undefined, ref);
  }, []);

  const handleSearch = async (e?: React.FormEvent, refOverride?: string) => {
    e?.preventDefault();
    const num = refOverride || bookingNumber.trim();
    if (!num) return;
    setLoading(true);
    setError("");
    setBooking(null);
    try {
      const result = await getBookingByNumber(num);
      if (!result) setError("No se encontró la reserva. Verifica el número.");
      else setBooking(result as unknown as Booking);
    } catch {
      setError("Error al buscar la reserva. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          ← Volver al inicio
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Consultar Reserva</h1>
          <p className="text-gray-500 mb-6 text-sm">Ingresa tu número de reserva para ver los detalles</p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Reserva</label>
              <input
                type="text" value={bookingNumber}
                onChange={e => setBookingNumber(e.target.value)}
                className={inputCls} placeholder="CS-20260101-001"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !bookingNumber.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: pc }}
            >
              <Search className="w-4 h-4" />
              {loading ? "Buscando..." : "Buscar Reserva"}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {booking && (
            <div className="mt-6 border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">{booking.bookingNumber}</h2>
                <StatusBadge status={booking.status.toLowerCase()} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-0.5">Fecha</p>
                  <p className="font-semibold text-sm text-gray-900">
                    {format(new Date(booking.sessionDate.slice(0,10) + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-0.5">Horario</p>
                  <p className="font-semibold text-sm text-gray-900">
                    {booking.startTime?.slice(0,5)} - {booking.endTime?.slice(0,5)}
                  </p>
                </div>
                {booking.serviceType && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-0.5">Servicio</p>
                    <p className="font-semibold text-sm text-gray-900">{booking.serviceType.name}</p>
                  </div>
                )}
                {booking.studio && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-0.5">Estudio</p>
                    <p className="font-semibold text-sm text-gray-900">{booking.studio.name}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-0.5">Total</p>
                  <p className="font-semibold text-sm text-gray-900">
                    ${formatMoney(Number(booking.totalPrice))} {config?.currency || ""}
                  </p>
                </div>
                {Number(booking.remainingAmount) > 0 && (
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <p className="text-xs text-orange-600 mb-0.5">Pendiente de pago</p>
                    <p className="font-semibold text-sm text-orange-700">
                      ${formatMoney(Number(booking.remainingAmount))}
                    </p>
                  </div>
                )}
              </div>

              {booking.equipment && booking.equipment.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Equipos seleccionados</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.equipment.map(eq => (
                      <span key={eq.id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {eq.equipment.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckBookingPage() {
  return (
    <Suspense>
      <CheckBookingContent />
    </Suspense>
  );
}
