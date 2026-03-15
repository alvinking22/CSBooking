"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  confirmBooking, cancelBooking, rescheduleBooking,
  updateBookingStatus, updateBookingNotes,
} from "@/actions/bookings";
import { createPayment, deletePayment } from "@/actions/payments";
import { formatMoney } from "@/utils/formatMoney";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useConfig } from "@/contexts/ConfigContext";
import toast from "react-hot-toast";
import {
  ArrowLeft, Check, X, Calendar, DollarSign, Clock,
  Mail, Phone, Pencil, RotateCcw, Package, Ban, CheckCircle2, AlertTriangle,
  ChevronRight, FilePenLine, FolderOpen, Banknote, CreditCard, ArrowUpRight,
  Trash2, Plus, User,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmada",
  COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No Show",
};

const PAY_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", AZUL: "Azul", OTHER: "Otro",
};

const PAY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Seña", FULL: "Pago completo", PARTIAL: "Parcial", REFUND: "Reembolso",
};

const PAY_TYPE_BADGE: Record<string, "warning" | "success" | "info" | "danger" | "muted"> = {
  DEPOSIT: "warning", FULL: "success", PARTIAL: "info", REFUND: "danger",
};

const PAYMENT_STATUS_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "muted"; label: string }> = {
  PAID:         { variant: "success", label: "Pagado" },
  DEPOSIT_PAID: { variant: "warning", label: "Señal recibida" },
  PENDING:      { variant: "danger",  label: "Pendiente" },
  REFUNDED:     { variant: "muted",   label: "Reembolsado" },
};

const CATEGORY_LABELS: Record<string, string> = {
  microfonos: "Micrófonos", camaras: "Cámaras", personas: "Base Mic",
  iluminacion: "Logo", fondos: "Fondos", accesorios: "Mesas",
  mobiliarios: "Muebles", otros: "Otros",
};

const STATUS_BANNERS: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; msg: string }> = {
  CANCELLED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: <Ban className="h-4 w-4" />, msg: "Esta reserva fue cancelada." },
  COMPLETED:  { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: <CheckCircle2 className="h-4 w-4" />, msg: "Esta reserva fue completada exitosamente." },
  NO_SHOW:    { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: <AlertTriangle className="h-4 w-4" />, msg: "El cliente no se presentó a esta sesión." },
};

function getMethodIcon(method: string) {
  if (method === "CASH") return <Banknote className="h-4 w-4 text-gray-400" />;
  if (method === "TRANSFER") return <ArrowUpRight className="h-4 w-4 text-gray-400" />;
  if (method === "CARD" || method === "AZUL") return <CreditCard className="h-4 w-4 text-gray-400" />;
  return <DollarSign className="h-4 w-4 text-gray-400" />;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface Booking {
  id: string;
  bookingNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  duration: unknown;
  status: string;
  paymentStatus: string;
  totalPrice: unknown;
  paidAmount?: unknown;
  remainingAmount?: unknown;
  adminNotes?: string | null;
  clientNotes?: string | null;
  projectDescription?: string | null;
  termsAcceptedAt?: string | null;
  serviceType?: { id: string; name: string; basePrice: unknown } | null;
  studio?: { id: string; name: string; color?: string | null } | null;
  equipment?: Array<{
    id: string; quantity: number; unitPrice: unknown;
    equipment: { id: string; name: string; category: string };
  }>;
  payments?: Array<{
    id: string; amount: unknown; paymentMethod: string; paymentType: string;
    notes?: string | null; createdAt: string;
    processedBy?: { firstName: string; lastName: string } | null;
  }>;
}

export default function BookingDetailClient({ booking: initial }: { booking: Booking }) {
  const { config } = useConfig();
  const router = useRouter();
  const pc = config?.primaryColor || "#3B82F6";
  const [booking, setBooking] = useState(initial);
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "", paymentMethod: "CASH", paymentType: "FULL", notes: "",
  });
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    sessionDate: "", startTime: "", endTime: "",
  });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dateStr = booking.sessionDate.toString().slice(0, 10);
  const isTerminal = ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status);

  const total = Number(booking.totalPrice);
  const paid = Number(booking.paidAmount ?? 0);
  const remaining = Number(booking.remainingAmount ?? total);
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const handleConfirm = async () => {
    try {
      const res = await confirmBooking(booking.id);
      setBooking((b) => ({ ...b, status: res.data.booking.status }));
      toast.success("Reserva confirmada");
    } catch {
      toast.error("Error al confirmar");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelBooking(booking.id, "Cancelado por administrador");
      setBooking((b) => ({ ...b, status: "CANCELLED" }));
      toast.success("Reserva cancelada");
    } catch {
      toast.error("Error al cancelar");
    }
  };

  const handleComplete = async () => {
    try {
      const res = await updateBookingStatus(booking.id, "COMPLETED");
      setBooking((b) => ({ ...b, status: res.data.booking.status }));
      toast.success("Marcada como completada");
    } catch {
      toast.error("Error");
    }
  };

  const handleNoShow = async () => {
    try {
      const res = await updateBookingStatus(booking.id, "NO_SHOW");
      setBooking((b) => ({ ...b, status: res.data.booking.status }));
      toast.success("Marcada como no show");
    } catch {
      toast.error("Error");
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await updateBookingNotes(booking.id, adminNotes);
      setBooking((b) => ({ ...b, adminNotes }));
      setEditingNotes(false);
      toast.success("Notas guardadas");
    } catch {
      toast.error("Error al guardar notas");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.amount) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("bookingId", booking.id);
      fd.append("amount", payForm.amount);
      fd.append("paymentMethod", payForm.paymentMethod);
      fd.append("paymentType", payForm.paymentType);
      if (payForm.notes) fd.append("notes", payForm.notes);
      await createPayment(fd);
      router.refresh();
      setShowPayForm(false);
      setPayForm({ amount: "", paymentMethod: "CASH", paymentType: "FULL", notes: "" });
      toast.success("Pago registrado");
    } catch {
      toast.error("Error al registrar pago");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!confirmDeletePayment) return;
    try {
      await deletePayment(confirmDeletePayment);
      router.refresh();
      toast.success("Pago eliminado");
    } catch {
      toast.error("Error al eliminar pago");
    } finally {
      setConfirmDeletePayment(null);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleForm.sessionDate || !rescheduleForm.startTime || !rescheduleForm.endTime) return;
    setSaving(true);
    try {
      const res = await rescheduleBooking(
        booking.id,
        rescheduleForm.sessionDate,
        rescheduleForm.startTime,
        rescheduleForm.endTime
      );
      setBooking((b) => ({
        ...b,
        sessionDate: String(res.data.booking.sessionDate),
        startTime: res.data.booking.startTime,
        endTime: res.data.booking.endTime,
      }));
      setShowReschedule(false);
      toast.success("Reserva reprogramada");
    } catch {
      toast.error("Error al reprogramar");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none transition-colors";

  const payStatusInfo = PAYMENT_STATUS_BADGE[booking.paymentStatus] ?? { variant: "muted" as const, label: booking.paymentStatus };
  const liveRemaining = total - (Number(payForm.amount) || 0) - paid;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings"
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            aria-label="Volver a Reservas"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div>
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-xs text-gray-400 mb-1">
              <Link href="/admin/bookings" className="hover:underline focus:outline-none focus:underline transition-colors"
                style={{ color: pc }}>
                Reservas
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-gray-600 font-medium" aria-current="page">{booking.bookingNumber}</span>
            </nav>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{booking.bookingNumber}</h1>
              <StatusBadge status={booking.status.toLowerCase()} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Creada {format(new Date(dateStr + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!isTerminal && (
            <Link href={`/admin/bookings/${booking.id}/edit`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <FilePenLine className="h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
            </Link>
          )}
          {booking.status === "PENDING" && (
            <Button onClick={handleConfirm} size="sm" className="gap-1.5 text-white" style={{ background: pc }}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Confirmar
            </Button>
          )}
          {booking.status === "CONFIRMED" && (
            <>
              <Button onClick={handleComplete} size="sm" variant="secondary">Completar</Button>
              <Button onClick={handleNoShow} size="sm" variant="outline">No Show</Button>
            </>
          )}
          {!isTerminal && (
            <div className="flex items-center gap-2 pl-1 border-l border-gray-200 ml-1">
              <Button
                onClick={() => setShowReschedule(true)}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reprogramar
              </Button>
              <Button
                onClick={() => setConfirmCancel(true)}
                size="sm"
                variant="destructive"
                className="gap-1.5"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Status banner */}
      {STATUS_BANNERS[booking.status] && (() => {
        const b = STATUS_BANNERS[booking.status];
        return (
          <div
            role="status"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${b.bg} ${b.border} ${b.text}`}
          >
            <span aria-hidden="true">{b.icon}</span>
            <span className="text-sm font-medium">{b.msg}</span>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Cliente (FIRST, protagonist) ── */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ background: pc }}
                  aria-hidden="true"
                >
                  {getInitials(booking.clientName)}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Client name — most prominent element on the page */}
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                    {booking.clientName}
                  </h2>
                  {/* Project name — right below if present */}
                  {booking.projectDescription && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <FolderOpen className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
                      <p className="text-base text-gray-500 truncate">{booking.projectDescription}</p>
                    </div>
                  )}
                  {/* Contact info */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <a
                      href={`mailto:${booking.clientEmail}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                      aria-label={`Enviar correo a ${booking.clientEmail}`}
                    >
                      <Mail className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                      {booking.clientEmail}
                    </a>
                    {booking.clientPhone && (
                      <a
                        href={`tel:${booking.clientPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                        aria-label={`Llamar a ${booking.clientPhone}`}
                      >
                        <Phone className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                        {booking.clientPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Client notes */}
              {booking.clientNotes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Notas del cliente</p>
                    <p className="text-sm text-gray-600">{booking.clientNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Sesión ── */}
          <Card className={booking.studio?.color ? `border-l-4` : ""} style={booking.studio?.color ? { borderLeftColor: booking.studio.color } : {}}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                Sesión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Fecha</p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">
                    {format(new Date(dateStr + "T12:00:00"), "d MMM", { locale: es })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(dateStr + "T12:00:00"), "yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Horario</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {booking.startTime?.slice(0, 5)} – {booking.endTime?.slice(0, 5)}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                    <span className="text-xs text-gray-500">{Number(booking.duration)}h</span>
                  </div>
                </div>
                {booking.studio && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Estudio</p>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: booking.studio.color || pc }}
                        aria-hidden="true"
                      />
                      <p className="font-semibold text-gray-900 text-sm">{booking.studio.name}</p>
                    </div>
                  </div>
                )}
                {booking.serviceType && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Servicio</p>
                    <Badge variant="muted" className="text-xs font-medium">
                      {booking.serviceType.name}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Equipos ── */}
          {booking.equipment && booking.equipment.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                  <Package className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  Equipos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const grouped = (booking.equipment || []).reduce<Record<string, typeof booking.equipment>>((acc, eq) => {
                    const cat = eq.equipment.category.toLowerCase();
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat]!.push(eq);
                    return acc;
                  }, {});

                  return (
                    <div className="space-y-3" role="list" aria-label="Lista de equipos reservados">
                      {Object.entries(grouped).map(([cat, eqs]) => (
                        <div key={cat}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            {CATEGORY_LABELS[cat] || cat}
                          </p>
                          <ul className="space-y-1">
                            {eqs!.map((eq) => (
                              <li key={eq.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-2.5">
                                  <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                                  <p className="text-sm font-medium text-gray-900">
                                    {eq.equipment.name}
                                    {eq.quantity > 1 && (
                                      <span className="text-gray-400 font-normal"> ×{eq.quantity}</span>
                                    )}
                                  </p>
                                </div>
                                {Number(eq.unitPrice) > 0 ? (
                                  <span className="text-sm font-medium text-gray-700 shrink-0">
                                    ${formatMoney(Number(eq.unitPrice) * eq.quantity)}
                                  </span>
                                ) : (
                                  <Badge variant="success" className="text-xs shrink-0">Incluido</Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* ── Notas internas ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                  <Pencil className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  Notas internas
                </CardTitle>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                    className="text-xs h-7 px-2"
                    aria-label="Editar notas internas"
                  >
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <label htmlFor="admin-notes" className="sr-only">Notas internas (no visibles al cliente)</label>
                  <textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder="Notas internas (no visibles al cliente)..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none transition-colors"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} loading={saving}>Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setAdminNotes(booking.adminNotes || ""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 min-h-[2rem]">
                  {booking.adminNotes || <span className="text-gray-400 italic">Sin notas</span>}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Payments */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                  <DollarSign className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  Pagos
                </CardTitle>
                <Badge variant={payStatusInfo.variant}>{payStatusInfo.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total amount — hero number */}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Total reserva</p>
                <p className="text-3xl font-bold text-gray-900 leading-none">
                  ${formatMoney(total)}
                </p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{paidPct}% pagado</span>
                  <span>{100 - paidPct}% pendiente</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${paidPct}%`,
                      background: paidPct >= 100 ? "#10b981" : paidPct > 0 ? "#f59e0b" : "#e5e7eb",
                    }}
                  />
                </div>
              </div>

              {/* Paid / Remaining chips */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Pagado</p>
                  <p className="text-base font-bold text-emerald-700">${formatMoney(paid)}</p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Pendiente</p>
                  <p className="text-base font-bold text-red-600">${formatMoney(remaining)}</p>
                </div>
              </div>

              {/* Register payment button */}
              {!isTerminal && (
                <Button
                  onClick={() => setShowPayForm(true)}
                  className="w-full gap-2"
                  aria-label="Registrar nuevo pago"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Registrar pago
                </Button>
              )}

              {/* Payment history */}
              {booking.payments && booking.payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Historial</p>
                    <ul className="space-y-2" aria-label="Historial de pagos">
                      {booking.payments.map((p) => (
                        <li key={p.id} className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="mt-0.5 shrink-0">{getMethodIcon(p.paymentMethod)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">
                                ${formatMoney(Number(p.amount))}
                              </span>
                              <Badge variant={PAY_TYPE_BADGE[p.paymentType] ?? "muted"} className="text-[10px] px-1.5 py-0">
                                {PAY_TYPE_LABELS[p.paymentType] || p.paymentType}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {PAY_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                              {p.notes && ` · ${p.notes}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(p.createdAt), "d MMM yyyy", { locale: es })}
                            </p>
                          </div>
                          <button
                            onClick={() => setConfirmDeletePayment(p.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label={`Eliminar pago de $${formatMoney(Number(p.amount))}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={showReschedule} onOpenChange={(open) => { if (!open) setShowReschedule(false); }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reprogramar Reserva</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReschedule} className="space-y-4 pt-2">
            <div>
              <label htmlFor="reschedule-date" className="block text-xs font-medium text-gray-700 mb-1">
                Nueva fecha <span aria-hidden="true">*</span>
              </label>
              <input
                id="reschedule-date"
                type="date"
                value={rescheduleForm.sessionDate}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, sessionDate: e.target.value })}
                className={inputCls}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="reschedule-start" className="block text-xs font-medium text-gray-700 mb-1">
                Hora de inicio <span aria-hidden="true">*</span>
              </label>
              <input
                id="reschedule-start"
                type="time"
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })}
                className={inputCls}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="reschedule-end" className="block text-xs font-medium text-gray-700 mb-1">
                Hora de fin <span aria-hidden="true">*</span>
              </label>
              <input
                id="reschedule-end"
                type="time"
                value={rescheduleForm.endTime}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, endTime: e.target.value })}
                className={inputCls}
                required
                aria-required="true"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowReschedule(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Payment Dialog */}
      <Dialog
        open={showPayForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowPayForm(false);
            setPayForm({ amount: "", paymentMethod: "CASH", paymentType: "FULL", notes: "" });
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 pt-2">
            {/* Quick fill chip */}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setPayForm((f) => ({ ...f, amount: String(remaining) }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors text-left"
              >
                Completar pendiente →{" "}
                <span className="font-semibold text-gray-900">${formatMoney(remaining)}</span>
              </button>
            )}

            <div>
              <label htmlFor="pay-amount" className="block text-xs font-medium text-gray-700 mb-1">
                Monto ($) <span aria-hidden="true">*</span>
              </label>
              <input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className={inputCls}
                placeholder="0.00"
                required
                aria-required="true"
              />
              {/* Live remaining preview */}
              {payForm.amount && Number(payForm.amount) > 0 && (
                <p className={`text-xs mt-1 ${liveRemaining <= 0 ? "text-emerald-600" : "text-gray-500"}`}>
                  {liveRemaining <= 0
                    ? "✓ Quedará completamente pagado"
                    : `Quedará pendiente: $${formatMoney(Math.max(0, liveRemaining))}`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Método de pago
              </label>
              <Select
                value={payForm.paymentMethod}
                onValueChange={(v) => setPayForm({ ...payForm, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAY_METHOD_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo de pago
              </label>
              <Select
                value={payForm.paymentType}
                onValueChange={(v) => setPayForm({ ...payForm, paymentType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAY_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="pay-notes" className="block text-xs font-medium text-gray-700 mb-1">
                Notas
              </label>
              <input
                id="pay-notes"
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                className={inputCls}
                placeholder="Ref. transferencia..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPayForm(false);
                  setPayForm({ amount: "", paymentMethod: "CASH", paymentType: "FULL", notes: "" });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Registrar pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={(open) => !open && setConfirmCancel(false)}
        title="¿Cancelar esta reserva?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        onConfirm={handleCancel}
      />
      <ConfirmDialog
        open={!!confirmDeletePayment}
        onOpenChange={(open) => !open && setConfirmDeletePayment(null)}
        title="¿Eliminar este pago?"
        description="El monto pagado será revertido del historial."
        confirmLabel="Sí, eliminar"
        onConfirm={handleDeletePayment}
      />
    </div>
  );
}
