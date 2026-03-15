"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, resetUserPassword } from "@/actions/users";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { SkeletonTable } from "@/components/common/Skeleton";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Pencil, KeyRound, UserCog, Search } from "lucide-react";

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: string; isActive: boolean; lastLogin?: string | null; createdAt: string;
}

const EMPTY = { email: "", firstName: "", lastName: "", role: "STAFF", isActive: true, password: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetch = async () => {
    try { setUsers(await getUsers() as unknown as User[]); }
    catch { toast.error("Error al cargar usuarios"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isActive: u.isActive, password: "" });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("email", form.email);
      fd.append("firstName", form.firstName);
      fd.append("lastName", form.lastName);
      fd.append("role", form.role);
      fd.append("isActive", String(form.isActive));
      if (!editing) fd.append("password", form.password);

      if (editing) { await updateUser(editing.id, fd); toast.success("Usuario actualizado"); }
      else { await createUser(fd); toast.success("Usuario creado"); }
      setShowModal(false);
      fetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!showResetModal || !newPassword) return;
    setSaving(true);
    try {
      await resetUserPassword(showResetModal, newPassword);
      toast.success("Contraseña actualizada");
      setShowResetModal(null);
      setNewPassword("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar contraseña");
    } finally { setSaving(false); }
  };

  const filtered = search
    ? users.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none transition-colors";

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} usuarios del sistema</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Nuevo Usuario</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 outline-none bg-white transition-colors"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? "No se encontraron usuarios" : "No hay usuarios del sistema"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? "Intenta con otro nombre o email" : "Crea un usuario para otorgar acceso al panel"}
            </p>
            {!search && (
              <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nuevo Usuario
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Nombre", "Email", "Rol", "Estado", "Último acceso", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role.toLowerCase()} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.isActive ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.lastLogin ? format(new Date(u.lastLogin), "d MMM yyyy HH:mm", { locale: es }) : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setShowResetModal(u.id); setNewPassword(""); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors" title="Cambiar contraseña">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{editing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className={inputCls} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={inputCls}>
                  <option value="ADMIN">Administrador</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputCls} minLength={6} required />
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Activo</p>
                  <p className="text-xs text-gray-400">Puede iniciar sesión</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={v => setForm({...form, isActive: v})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" loading={saving}>{editing ? "Guardar cambios" : "Crear usuario"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={!!showResetModal} onOpenChange={(o) => !o && setShowResetModal(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Cambiar Contraseña</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetModal(null)}>Cancelar</Button>
            <Button onClick={handleResetPassword} loading={saving} disabled={newPassword.length < 6}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
