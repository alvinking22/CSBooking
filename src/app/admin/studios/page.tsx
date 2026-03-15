"use client";

import { useState, useEffect } from "react";
import { getStudios, createStudio, updateStudio, deleteStudio } from "@/actions/studios";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { SkeletonCard } from "@/components/common/Skeleton";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Mic2 } from "lucide-react";

interface Studio {
  id: string; name: string; description?: string | null;
  color?: string | null; isActive: boolean; order: number;
  maxParticipants?: number | null;
}

const EMPTY = { name: "", description: "", color: "#3B82F6", isActive: true, order: 0, maxParticipants: "" };
const COLORS = ["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#06B6D4","#F97316","#6B7280"];

export default function StudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Studio | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetch = async () => {
    try { setStudios(await getStudios() as Studio[]); }
    catch { toast.error("Error al cargar estudios"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (s: Studio) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", color: s.color || "#3B82F6", isActive: s.isActive, order: s.order, maxParticipants: s.maxParticipants != null ? String(s.maxParticipants) : "" });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast.error("Nombre es requerido");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.description) fd.append("description", form.description);
      fd.append("color", form.color);
      fd.append("isActive", String(form.isActive));
      fd.append("order", String(form.order));
      if (form.maxParticipants) fd.append("maxParticipants", form.maxParticipants);

      if (editing) { await updateStudio(editing.id, fd); toast.success("Estudio actualizado"); }
      else { await createStudio(fd); toast.success("Estudio creado"); }
      setShowModal(false);
      fetch();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteStudio(confirmDelete); toast.success("Estudio eliminado"); fetch(); }
    catch { toast.error("Error al eliminar"); }
    finally { setConfirmDelete(null); }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none transition-colors";

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estudios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{studios.length} estudios configurados</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Agregar Estudio</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <SkeletonCard key={i} lines={2} />)}</div>
      ) : studios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Mic2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay estudios configurados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {studios.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-gray-50" : ""} hover:bg-gray-50 transition-colors`}>
              <div className="w-4 h-10 rounded-lg shrink-0" style={{ background: s.color || "#6B7280" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <StatusBadge status={s.isActive ? "active" : "inactive"} />
                </div>
                {s.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1" title={s.description}>{s.description}</p>}
                {s.maxParticipants && <p className="text-xs text-gray-500">Máx. {s.maxParticipants} personas</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900" aria-label={`Editar estudio: ${s.name}`}>
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={`Eliminar estudio: ${s.name}`}>
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editing ? "Editar Estudio" : "Nuevo Estudio"}</DialogTitle></DialogHeader>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({...form, color: c})}
                      className={`w-7 h-7 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                      style={{ background: c }}
                      aria-label={`Seleccionar color ${c}`}
                      aria-pressed={form.color === c} />
                  ))}
                  <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                    className="w-7 h-7 rounded-full cursor-pointer border-none" title="Color personalizado" aria-label="Color personalizado" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. participantes</label>
                <input type="number" min="1" value={form.maxParticipants} onChange={e => setForm({...form, maxParticipants: e.target.value})} className={inputCls} placeholder="Sin límite" />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Activo</p>
                  <p className="text-xs text-gray-500">Disponible para reservas</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={v => setForm({...form, isActive: v})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? "Guardar cambios" : "Crear estudio"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}
        title="¿Eliminar estudio?" description="Se eliminarán los datos del estudio."
        confirmLabel="Eliminar" onConfirm={handleDelete}
      />
    </div>
  );
}
