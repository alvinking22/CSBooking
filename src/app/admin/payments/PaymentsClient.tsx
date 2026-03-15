"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { deletePayment } from "@/actions/payments";
import { formatMoney } from "@/utils/formatMoney";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, DollarSign, Search } from "lucide-react";

const PAY_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", AZUL: "Azul", OTHER: "Otro",
};
const PAY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Seña", FULL: "Completo", PARTIAL: "Parcial", REFUND: "Reembolso",
};

interface Payment {
  id: string; amount: unknown; paymentMethod: string; paymentType: string;
  notes?: string | null; createdAt: string; status: string;
  booking: { bookingNumber: string; clientName: string };
  processedBy?: { firstName: string; lastName: string } | null;
}

export default function PaymentsClient({ payments: initial }: { payments: Payment[] }) {
  const router = useRouter();
  const [payments, setPayments] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search
    ? payments.filter(
        (p) =>
          p.booking.clientName.toLowerCase().includes(search.toLowerCase()) ||
          p.booking.bookingNumber.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const totalRevenue = payments
    .filter((p) => p.status === "COMPLETED" && p.paymentType !== "REFUND")
    .reduce((s, p) => s + Number(p.amount), 0);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePayment(confirmDelete);
      setPayments((prev) => prev.filter((p) => p.id !== confirmDelete));
      toast.success("Pago eliminado");
      router.refresh();
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {payments.length} registros · Total: ${formatMoney(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total recibido", value: `$${formatMoney(totalRevenue)}`, color: "#10B981" },
          { label: "Efectivo", value: `$${formatMoney(payments.filter(p=>p.paymentMethod==="CASH").reduce((s,p)=>s+Number(p.amount),0))}`, color: "#3B82F6" },
          { label: "Transferencia", value: `$${formatMoney(payments.filter(p=>p.paymentMethod==="TRANSFER").reduce((s,p)=>s+Number(p.amount),0))}`, color: "#8B5CF6" },
          { label: "Tarjeta/Azul", value: `$${formatMoney(payments.filter(p=>["CARD","AZUL"].includes(p.paymentMethod)).reduce((s,p)=>s+Number(p.amount),0))}`, color: "#F59E0B" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="w-2 h-2 rounded-full mb-2" style={{ background: c.color }} />
            <p className="text-lg font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <label htmlFor="payments-search" className="sr-only">Buscar pagos por cliente o número de reserva</label>
        <input
          id="payments-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o número de reserva..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none bg-white transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? "No se encontraron pagos" : "No hay pagos registrados"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? "Intenta con otro término de búsqueda" : "Los pagos se registran desde el detalle de cada reserva"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Fecha", "Reserva", "Cliente", "Método", "Tipo", "Monto", ""].map(h => (
                    <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(p.createdAt), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${p.booking.bookingNumber}`} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                        {p.booking.bookingNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.booking.clientName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{PAY_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{PAY_TYPE_LABELS[p.paymentType] || p.paymentType}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-sm">${formatMoney(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmDelete(p.id)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Eliminar pago de $${formatMoney(Number(p.amount))} — ${p.booking.clientName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}
        title="¿Eliminar pago?" description="Se recalculará el estado de pago de la reserva."
        confirmLabel="Eliminar" onConfirm={handleDelete}
      />
    </div>
  );
}
