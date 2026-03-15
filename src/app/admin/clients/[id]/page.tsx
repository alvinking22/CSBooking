"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getClientWithBookings, updateClient, deleteClient } from "@/actions/clients";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatMoney } from "@/utils/formatMoney";
import { useConfig } from "@/contexts/ConfigContext";
import toast from "react-hot-toast";
import {
  ArrowLeft, Mail, Phone, Folder, FileText, Pencil,
  Trash2, CalendarDays, ChevronRight, BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Studio { id: string; name: string; color?: string | null }
interface ServiceType { id: string; name: string }
interface Booking {
  id: string;
  bookingNumber: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  totalPrice: unknown;
  projectDescription?: string | null;
  serviceType?: ServiceType | null;
  studio?: Studio | null;
}
interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  projectName?: string | null;
  notes?: string | null;
  bookingCount: number;
  bookings: Booking[];
}

const PAY_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pendiente", bg: "bg-yellow-100", text: "text-yellow-800" },
  DEPOSIT_PAID: { label: "Señal", bg: "bg-orange-100", text: "text-orange-800" },
  PAID: { label: "Pagado", bg: "bg-green-100", text: "text-green-800" },
  REFUNDED: { label: "Reembolsado", bg: "bg-gray-100", text: "text-gray-800" },
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { config } = useConfig();
  const pc = config?.primaryColor || "#3B82F6";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", projectName: "", notes: "" });

  const loadClient = useCallback(async () => {
    try {
      const data = await getClientWithBookings(id);
      setClient(data as Client);
      if (data) {
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          projectName: data.projectName || "",
          notes: data.notes || "",
        });
      }
    } catch {
      toast.error("Error al cargar el cliente");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadClient(); }, [loadClient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (form.phone) fd.append("phone", form.phone);
      if (form.projectName) fd.append("projectName", form.projectName);
      if (form.notes) fd.append("notes", form.notes);
      await updateClient(id, fd);
      toast.success("Cliente actualizado");
      setShowEdit(false);
      loadClient();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClient(id);
      toast.success("Cliente eliminado");
      router.push("/admin/clients");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none transition-colors";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Link href="/admin/clients">
          <Button variant="outline" className="mt-4">Volver a Clientes</Button>
        </Link>
      </div>
    );
  }

  const totalPaid = client.bookings
    .filter((b) => !["CANCELLED"].includes(b.status))
    .reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);

  const confirmedBookings = client.bookings.filter(
    (b) => !["CANCELLED", "NO_SHOW"].includes(b.status)
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/clients" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{client.name}</span>
      </div>

      {/* Client header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ background: pc }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{client.name}</h1>
              {client.projectName && (
                <p className="text-sm font-medium text-gray-500 mt-0.5">{client.projectName}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </a>
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </a>
                )}
              </div>
              {client.notes && (
                <p className="flex items-start gap-1.5 text-sm text-gray-500 mt-2">
                  <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {client.notes}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{client.bookings.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Reservas totales</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{confirmedBookings}</p>
            <p className="text-xs text-gray-500 mt-0.5">Completadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">${formatMoney(totalPaid)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Valor total</p>
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Historial de Reservas</h2>
          <span className="ml-auto text-xs text-gray-400 font-medium">{client.bookings.length} reservas</span>
        </div>

        {client.bookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay reservas</p>
            <p className="text-sm text-gray-400 mt-1">Este cliente aún no tiene reservas</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sesión</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {client.bookings.map((b) => {
                    const payInfo = PAY_STATUS[b.paymentStatus] || PAY_STATUS.PENDING;
                    const dateStr = b.sessionDate.toString().slice(0, 10);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-sm text-gray-900">
                            {format(new Date(dateStr + "T12:00:00"), "d MMM yyyy", { locale: es })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {b.startTime?.slice(0, 5)} – {b.endTime?.slice(0, 5)}
                            {b.studio && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.studio.color || pc }} />
                                {b.studio.name}
                              </span>
                            )}
                          </p>
                          <span className="font-mono text-[10px] text-gray-400">{b.bookingNumber}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">
                          {b.serviceType?.name || <span className="text-gray-400">—</span>}
                          {b.projectDescription && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Folder className="w-3 h-3" />
                              {b.projectDescription}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={b.status.toLowerCase()} />
                            {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(b.status) && (
                              <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${payInfo.bg} ${payInfo.text}`}>
                                {payInfo.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-sm text-gray-900">
                          ${formatMoney(Number(b.totalPrice))}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-medium transition-colors"
                          >
                            Ver <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {client.bookings.map((b) => {
                const payInfo = PAY_STATUS[b.paymentStatus] || PAY_STATUS.PENDING;
                const dateStr = b.sessionDate.toString().slice(0, 10);
                return (
                  <div key={b.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(new Date(dateStr + "T12:00:00"), "d MMM yyyy", { locale: es })}
                          {" · "}
                          {b.startTime?.slice(0, 5)}–{b.endTime?.slice(0, 5)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{b.serviceType?.name}</p>
                        <span className="font-mono text-[10px] text-gray-400">{b.bookingNumber}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">${formatMoney(Number(b.totalPrice))}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <StatusBadge status={b.status.toLowerCase()} />
                      {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(b.status) && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payInfo.bg} ${payInfo.text}`}>
                          {payInfo.label}
                        </span>
                      )}
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
                      >
                        Ver <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => !o && setShowEdit(false)}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3 py-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <input value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls + " resize-none"} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={(open) => !open && setShowDelete(false)}
        title="¿Eliminar este cliente?"
        description={`Se eliminará a ${client.name} y todos sus datos. Las reservas existentes no se eliminarán.`}
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
}
