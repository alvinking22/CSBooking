"use client";

import { useState, useEffect } from "react";
import {
  getServices, createService, updateService, deleteService,
} from "@/actions/services";
import { formatMoney } from "@/utils/formatMoney";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { SkeletonCard } from "@/components/common/Skeleton";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";

interface Service {
  id: string; name: string; description?: string | null;
  basePrice: unknown; duration: unknown; isActive: boolean; order: number;
}

const EMPTY = { name: "", description: "", basePrice: "", duration: "", isActive: true, order: 0 };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetch = async () => {
    try {
      const res = await getServices();
      setServices(res as Service[]);
    } catch { toast.error("Error al cargar servicios"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", basePrice: String(s.basePrice), duration: String(s.duration), isActive: s.isActive, order: s.order });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.basePrice || !form.duration) return toast.error("Nombre, precio y duración son requeridos");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.description) fd.append("description", form.description);
      fd.append("basePrice", form.basePrice);
      fd.append("duration", form.duration);
      fd.append("isActive", String(form.isActive));
      fd.append("order", String(form.order));

      if (editing) { await updateService(editing.id, fd); toast.success("Servicio actualizado"); }
      else { await createService(fd); toast.success("Servicio creado"); }
      setShowModal(false);
      fetch();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteService(confirmDelete);
      toast.success("Servicio eliminado");
      fetch();
    } catch { toast.error("Error al eliminar"); }
    finally { setConfirmDelete(null); }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none transition-colors";

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{services.length} servicios configurados</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Agregar Servicio</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay servicios configurados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {services.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-gray-50" : ""} hover:bg-gray-50 transition-colors`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <StatusBadge status={s.isActive ? "active" : "inactive"} />
                </div>
                {s.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1" title={s.description}>{s.description}</p>}
                {/* Mobile: price + duration badges */}
                <div className="flex items-center gap-2 mt-1.5 sm:hidden">
                  <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                    ${formatMoney(Number(s.basePrice))}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                    {Number(s.duration)}h
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500 shrink-0">
                <div className="text-center hidden sm:block">
                  <p className="font-semibold text-gray-900">${formatMoney(Number(s.basePrice))}</p>
                  <p className="text-xs">Precio base</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="font-semibold text-gray-900">{Number(s.duration)}h</p>
                  <p className="text-xs">Duración</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900" aria-label={`Editar servicio: ${s.name}`}>
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={`Eliminar servicio: ${s.name}`}>
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className={inputCls + " resize-none"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio base ($) *</label>
                  <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas) *</label>
                  <input type="number" min="0.5" step="0.5" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className={inputCls} required />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Activo</p>
                  <p className="text-xs text-gray-500">Visible para los clientes</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={v => setForm({...form, isActive: v})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? "Guardar cambios" : "Crear servicio"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}
        title="¿Eliminar servicio?" description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar" onConfirm={handleDelete}
      />
    </div>
  );
}
