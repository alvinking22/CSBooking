"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getBookings } from "@/actions/bookings";
import { getStudios } from "@/actions/studios";
import { confirmBooking, cancelBooking } from "@/actions/bookings";
import { formatMoney } from "@/utils/formatMoney";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonTable } from "@/components/common/Skeleton";
import { useConfig } from "@/contexts/ConfigContext";
import toast from "react-hot-toast";
import { Check, X, ChevronRight, RefreshCw, Plus, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PayVariant = "warning" | "orange" | "success" | "muted";
const PAY_STATUS: Record<string, { label: string; variant: PayVariant }> = {
  PENDING:      { label: "Pendiente",    variant: "warning" },
  DEPOSIT_PAID: { label: "Señal",        variant: "orange"  },
  PAID:         { label: "Pagado",       variant: "success" },
  REFUNDED:     { label: "Reembolsado",  variant: "muted"   },
};

type Studio = { id: string; name: string; color?: string | null };
type Booking = {
  id: string;
  bookingNumber: string;
  clientId?: string | null;
  clientName: string;
  clientEmail: string;
  projectDescription?: string | null;
  client?: { id: string; projectName?: string | null } | null;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  totalPrice: unknown;
  studio?: Studio | null;
};

export default function BookingsPage() {
  const { config } = useConfig();
  const pc = config?.primaryColor || "#3B82F6";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  useEffect(() => {
    getStudios().then((s) => setStudios(s)).catch(() => {});
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBookings({ page, status: statusFilter, search });
      setBookings(result.bookings as Booking[]);
      setTotalPages(result.pages);
      setTotal(result.total);
    } catch {
      toast.error("Error al cargar las reservas");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleConfirm = async (id: string) => {
    try {
      await confirmBooking(id);
      toast.success("Reserva confirmada");
      fetchBookings();
    } catch {
      toast.error("Error al confirmar");
    }
  };

  const handleCancelConfirm = async () => {
    if (!confirmCancel) return;
    try {
      await cancelBooking(confirmCancel, "Cancelado por administrador");
      toast.success("Reserva cancelada");
      fetchBookings();
    } catch {
      toast.error("Error al cancelar");
    } finally {
      setConfirmCancel(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm">{total} reservas en total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchBookings} aria-label="Actualizar listado de reservas">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Link href="/admin/bookings/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="bookings-search" className="sr-only">Buscar reservas por nombre o email</label>
          <input
            id="bookings-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none transition-colors"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none sm:w-48"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: `${pc}12` }}>
              <CalendarDays className="h-7 w-7" style={{ color: pc }} />
            </div>
            <p className="font-medium text-gray-700">No se encontraron reservas</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter ? "Intenta cambiar los filtros" : "Crea tu primera reserva para comenzar"}
            </p>
            {!search && !statusFilter && (
              <Link href="/admin/bookings/new">
                <Button size="sm" className="mt-4 gap-1.5 text-white" style={{ background: pc }}>
                  <Plus className="h-4 w-4" /> Nueva Reserva
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE (hidden on mobile) ── */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sesión
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => {
                    const payInfo = PAY_STATUS[b.paymentStatus] || PAY_STATUS.PENDING;
                    const dateStr = b.sessionDate.toString().slice(0, 10);
                    const projectName = b.projectDescription || b.client?.projectName || null;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        {/* Cliente */}
                        <td className="pl-4 pr-3 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5"
                              style={{ background: b.studio?.color || pc }}
                              aria-hidden="true"
                            />
                            <div>
                              <p className="font-bold text-gray-900 text-base leading-tight">{b.clientName}</p>
                              {projectName && (
                                <p className="text-xs text-gray-400 mt-0.5 font-medium">{projectName}</p>
                              )}
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">{b.clientEmail}</p>
                              <span className="font-mono text-[10px] text-gray-400">{b.bookingNumber}</span>
                            </div>
                          </div>
                        </td>
                        {/* Sesión */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(dateStr + "T12:00:00"), "d MMM yyyy", { locale: es })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {b.startTime?.slice(0, 5)} – {b.endTime?.slice(0, 5)}
                          </p>
                          {b.studio && (
                            <span className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.studio.color || pc }} />
                              {b.studio.name}
                            </span>
                          )}
                        </td>
                        {/* Estado */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={b.status.toLowerCase()} />
                            {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(b.status) && (
                              <Badge variant={payInfo.variant}>{payInfo.label}</Badge>
                            )}
                          </div>
                        </td>
                        {/* Total */}
                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-gray-900 text-sm">${formatMoney(Number(b.totalPrice))}</span>
                        </td>
                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {b.status === "PENDING" && (
                              <button
                                onClick={() => handleConfirm(b.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                                aria-label={`Confirmar reserva ${b.bookingNumber}`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Confirmar
                              </button>
                            )}
                            {!["CANCELLED", "COMPLETED"].includes(b.status) && (
                              <button
                                onClick={() => setConfirmCancel(b.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label={`Cancelar reserva ${b.bookingNumber}`}
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            )}
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                              aria-label={`Ver detalle de reserva ${b.bookingNumber}`}
                            >
                              Ver
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS (hidden on desktop) ── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {bookings.map((b) => {
                const payInfo = PAY_STATUS[b.paymentStatus] || PAY_STATUS.PENDING;
                const dateStr = b.sessionDate.toString().slice(0, 10);
                const projectName = b.projectDescription || b.client?.projectName || null;
                return (
                  <div key={b.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* Client — prominent */}
                    <p className="font-bold text-gray-900 text-lg leading-tight">{b.clientName}</p>
                    {projectName && (
                      <p className="text-sm text-gray-500 font-medium mt-0.5">{projectName}</p>
                    )}
                    {/* Booking # and badges */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-gray-400">{b.bookingNumber}</span>
                      <StatusBadge status={b.status.toLowerCase()} />
                      {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(b.status) && (
                        <Badge variant={payInfo.variant}>{payInfo.label}</Badge>
                      )}
                    </div>
                    {/* Session info */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-600 font-medium">
                        {format(new Date(dateStr + "T12:00:00"), "d MMM yyyy", { locale: es })}
                        {" · "}
                        {b.startTime?.slice(0, 5)}–{b.endTime?.slice(0, 5)}
                      </span>
                      {b.studio && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-2 h-2 rounded-full" style={{ background: b.studio.color || pc }} />
                          {b.studio.name}
                        </span>
                      )}
                      <span className="ml-auto font-bold text-gray-900 text-sm">
                        ${formatMoney(Number(b.totalPrice))}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {b.status === "PENDING" && (
                        <button
                          onClick={() => handleConfirm(b.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                          aria-label={`Confirmar reserva ${b.bookingNumber}`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Confirmar
                        </button>
                      )}
                      {!["CANCELLED", "COMPLETED"].includes(b.status) && (
                        <button
                          onClick={() => setConfirmCancel(b.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label={`Cancelar reserva ${b.bookingNumber}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancelar
                        </button>
                      )}
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                        aria-label={`Ver detalle de reserva ${b.bookingNumber} — ${b.clientName}`}
                      >
                        Ver detalle <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Página <span className="font-semibold text-gray-700">{page}</span> de {totalPages}
                  <span className="text-gray-400 ml-1">· {total} reservas</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">Anterior</Button>
                  <Button size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente"
                    className="text-white"
                    style={page < totalPages ? { background: pc } : undefined}
                  >Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title="¿Cancelar esta reserva?"
        description="El cliente será notificado. Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
