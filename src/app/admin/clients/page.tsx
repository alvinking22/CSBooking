"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getClients, createClient, updateClient, deleteClient } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonTable } from "@/components/common/Skeleton";
import { useConfig } from "@/contexts/ConfigContext";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";

interface Client {
  id: string; name: string; email: string; phone?: string | null;
  projectName?: string | null; notes?: string | null;
}

const EMPTY = { name: "", email: "", phone: "", projectName: "", notes: "" };

export default function ClientsPage() {
  const { config } = useConfig();
  const pc = config?.primaryColor || "#3B82F6";
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try { setClients(await getClients(search || undefined) as Client[]); }
    catch { toast.error("Error al cargar clientes"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email, phone: c.phone || "", projectName: c.projectName || "", notes: c.notes || "" });
    setShowModal(true);
  };

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

      if (editing) { await updateClient(editing.id, fd); toast.success("Cliente actualizado"); }
      else { await createClient(fd); toast.success("Cliente creado"); }
      setShowModal(false);
      fetch();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteClient(confirmDelete); toast.success("Cliente eliminado"); fetch(); }
    catch { toast.error("Error al eliminar"); }
    finally { setConfirmDelete(null); }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none transition-colors";

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} clientes registrados</p>
        </div>
        <Button onClick={openCreate} className="text-white" style={{ background: pc }}><Plus className="w-4 h-4 mr-1.5" />Nuevo Cliente</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <label htmlFor="clients-search" className="sr-only">Buscar clientes por nombre o email</label>
        <input
          id="clients-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none bg-white transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : clients.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: `${pc}12` }}>
              <Users className="w-7 h-7" style={{ color: pc }} />
            </div>
            <p className="text-gray-700 font-medium">
              {search ? "No se encontraron clientes" : "No hay clientes registrados"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? "Intenta con otro nombre o email" : "Crea tu primer cliente para comenzar"}
            </p>
            {!search && (
              <Button size="sm" className="mt-4 gap-1.5 text-white" style={{ background: pc }} onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nuevo Cliente
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Nombre", "Email", "Teléfono", "Proyecto", "Acciones"].map(h => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/admin/clients/${c.id}`} className="font-medium text-gray-900 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <a href={`mailto:${c.email}`} className="hover:text-blue-600">{c.email}</a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.phone || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.projectName || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900" aria-label={`Editar cliente: ${c.name}`}>
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button onClick={() => setConfirmDelete(c.id)} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={`Eliminar cliente: ${c.name}`}>
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3 py-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <input value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} className={inputCls} placeholder="Nombre del proyecto" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className={inputCls + " resize-none"} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? "Guardar cambios" : "Crear cliente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}
        title="¿Eliminar cliente?" description="Se eliminarán los datos del cliente."
        confirmLabel="Eliminar" onConfirm={handleDelete}
      />
    </div>
  );
}
