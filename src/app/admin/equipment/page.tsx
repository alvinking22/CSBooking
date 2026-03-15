"use client";

import { useState, useEffect } from "react";
import {
  getEquipment, createEquipment, updateEquipment, deleteEquipment,
  uploadEquipmentImage,
} from "@/actions/equipment";
import { getStudios } from "@/actions/studios";
import { getServices } from "@/actions/services";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { SkeletonCard } from "@/components/common/Skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import NextImage from "next/image";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Camera, Search, ChevronDown,
  Mic, Video, Image as ImageIcon, Table2,
  Package, Armchair, Stamp,
} from "lucide-react";

const CATS = [
  { value: "MICROFONOS",  label: "Micrófonos", Icon: Mic },
  { value: "CAMARAS",     label: "Cámaras",    Icon: Video },
  { value: "PERSONAS",    label: "Base Mic",   Icon: Mic },
  { value: "ILUMINACION", label: "Logo",       Icon: Stamp },
  { value: "FONDOS",      label: "Fondos",     Icon: ImageIcon },
  { value: "ACCESORIOS",  label: "Mesas",      Icon: Table2 },
  { value: "MOBILIARIOS", label: "Muebles",    Icon: Armchair },
  { value: "OTROS",       label: "Otros",      Icon: Package },
];

const EMPTY = {
  name: "", category: "MICROFONOS", description: "",
  studioIds: null as string[] | null,
  serviceIds: null as string[] | null,
};

interface Equipment {
  id: string; name: string; category: string; description?: string | null;
  quantity: number; isActive: boolean; image?: string | null; order: number;
  studioIds?: unknown; serviceIds?: unknown;
}
interface Studio  { id: string; name: string; color?: string | null; isActive: boolean }
interface Service { id: string; name: string; isActive: boolean }

export default function EquipmentPage() {
  const [equipment,     setEquipment]     = useState<Equipment[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<Equipment | null>(null);
  const [form,          setForm]          = useState(EMPTY);
  const [search,        setSearch]        = useState("");
  const [saving,        setSaving]        = useState(false);
  const [allStudios,    setAllStudios]    = useState<Studio[]>([]);
  const [allServices,   setAllServices]   = useState<Service[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [openCats,      setOpenCats]      = useState<Set<string>>(new Set());

  const fetchEquipment = async () => {
    try   { setEquipment(await getEquipment() as Equipment[]); }
    catch { toast.error("Error al cargar equipos"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchEquipment();
    getStudios().then(s => setAllStudios(s as Studio[])).catch(() => {});
    getServices().then(s => setAllServices(s as Service[])).catch(() => {});
  }, []);

  /* ─── Handlers ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name",     form.name);
      fd.append("category", form.category);
      if (form.description) fd.append("description", form.description);
      if (form.studioIds)   fd.append("studioIds",   JSON.stringify(form.studioIds));
      if (form.serviceIds)  fd.append("serviceIds",  JSON.stringify(form.serviceIds));

      if (editing) { await updateEquipment(editing.id, fd); toast.success("Actualizado"); }
      else         { await createEquipment(fd);              toast.success("Equipo creado"); }

      setShowForm(false); setEditing(null); setForm(EMPTY); fetchEquipment();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleEdit = (item: Equipment) => {
    setEditing(item);
    setForm({
      name: item.name, category: item.category,
      description: item.description || "",
      studioIds:  (item.studioIds  as string[] | null) || null,
      serviceIds: (item.serviceIds as string[] | null) || null,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try   { await deleteEquipment(confirmDelete); toast.success("Eliminado"); fetchEquipment(); }
    catch { toast.error("Error al eliminar"); }
    finally { setConfirmDelete(null); }
  };

  const handleToggle = async (item: Equipment) => {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!item.isActive));
      await updateEquipment(item.id, fd);
      fetchEquipment();
    } catch { toast.error("Error"); }
  };

  const handleImage = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try   { await uploadEquipmentImage(id, file); toast.success("Imagen actualizada"); fetchEquipment(); }
    catch { toast.error("Error al subir imagen"); }
  };

  const toggleCat = (value: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  /* ─── Derived data ─── */
  const q = search.trim().toLowerCase();
  const filteredEquipment = q
    ? equipment.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
      )
    : equipment;

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none transition-colors";

  const hasAnyResults = CATS.some(c => filteredEquipment.some(e => e.category === c.value));

  /* ─── Render ─── */
  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Equipos del Set</h1>
          <p className="text-sm text-gray-500 mt-0.5">{equipment.length} equipos configurados</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar equipo..."
            aria-label="Buscar equipo"
            className="pl-9 pr-3 py-2 w-52 text-sm border border-gray-200 rounded-xl bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none transition-colors"
          />
        </div>

        <Button
          onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); }}
          aria-label="Agregar nuevo equipo"
        >
          <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />Agregar Equipo
        </Button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
        </div>

      ) : !hasAnyResults ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-500 font-medium">
            {q ? "No se encontraron equipos" : "No hay equipos configurados"}
          </p>
          {q && (
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>

      ) : (
        <div className="space-y-3">

          {/* ── Category grid ── */}
          <div className="grid grid-cols-3 gap-3">
            {CATS.map(cat => {
              const CatIcon        = cat.Icon;
              const allCatItems    = equipment.filter(e => e.category === cat.value);
              const filteredCatItems = filteredEquipment.filter(e => e.category === cat.value);
              if (!allCatItems.length) return null;
              if (q && !filteredCatItems.length) return null;

              const isOpen     = q ? true : openCats.has(cat.value);
              const firstImage = allCatItems.find(i => i.image)?.image;
              const count      = q ? filteredCatItems.length : allCatItems.length;

              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCat(cat.value)}
                  aria-expanded={isOpen}
                  aria-controls={`panel-${cat.value}`}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-[1.5px] bg-white text-left w-full transition-all",
                    isOpen
                      ? "border-gray-900 shadow-sm"
                      : "border-gray-100 hover:border-gray-300 hover:shadow-sm",
                  )}
                >
                  {/* Icon or first image */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {firstImage ? (
                      <NextImage src={firstImage} alt="" fill className="object-cover" />
                    ) : (
                      <CatIcon className="w-[18px] h-[18px] text-gray-500" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{cat.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {count} equipo{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          {/* ── Expanded panels ── */}
          {CATS.map(cat => {
            const CatIcon = cat.Icon;
            const items   = filteredEquipment.filter(e => e.category === cat.value);
            const isOpen  = q ? true : openCats.has(cat.value);
            if (!isOpen || !items.length) return null;

            return (
              <section
                key={cat.value}
                id={`panel-${cat.value}`}
                className="bg-white rounded-xl border-[1.5px] border-gray-900 overflow-hidden"
                aria-labelledby={`cat-heading-${cat.value}`}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <h2 id={`cat-heading-${cat.value}`} className="text-xs font-bold text-gray-900">
                    {cat.label}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setEditing(null);
                      setForm({ ...EMPTY, category: cat.value });
                    }}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Item rows */}
                <div className="divide-y divide-gray-50" role="list">
                  {items.map(item => (
                    <div
                      key={item.id}
                      role="listitem"
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors",
                        !item.isActive && "opacity-50",
                      )}
                    >
                      {/* Thumbnail — click to upload */}
                      <label
                        className="relative w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
                        aria-label={`Cambiar imagen de ${item.name}`}
                      >
                        {item.image ? (
                          <NextImage src={item.image} alt={item.name} fill className="object-cover" />
                        ) : (
                          <CatIcon className="w-4 h-4 text-gray-300 absolute inset-0 m-auto" aria-hidden="true" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <Camera className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(item.id, e)} />
                      </label>

                      {/* Name + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                        )}
                      </div>

                      {/* Inactive badge */}
                      {!item.isActive && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                          Inactivo
                        </Badge>
                      )}

                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900"
                          aria-label={`Editar ${item.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleToggle(item)}
                          className="p-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          aria-label={item.isActive ? `Ocultar ${item.name}` : `Activar ${item.name}`}
                        >
                          {item.isActive
                            ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            : <Eye    className="w-3.5 h-3.5" aria-hidden="true" />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

        </div>
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="¿Eliminar equipo?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />

      {/* ── Add / Edit form Sheet ── */}
      <Sheet open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <SheetContent size="lg">
          <SheetHeader className="border-b border-gray-100 pr-10">
            <SheetTitle>{editing ? "Editar Equipo" : "Nuevo Equipo"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Imagen */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Imagen</p>
                </div>
                <div className="p-4">
                  {editing ? (
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                        {editing.image ? (
                          <NextImage src={editing.image} alt={editing.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                            <Camera className="w-6 h-6 text-gray-300" />
                            <span className="text-[10px] text-gray-400">Sin imagen</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                          {editing.image ? "Cambiar imagen" : "Agregar imagen"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Click para seleccionar archivo</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(editing.id, e)} />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Camera className="w-5 h-5 shrink-0" />
                      <p className="text-xs">Guarda el equipo primero para poder agregar imagen</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información básica */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Información básica</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label htmlFor="eq-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Nombre <span className="text-red-400" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="eq-name"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Mesa Blanca"
                      required
                      aria-required="true"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="eq-category" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Categoría
                    </label>
                    <select
                      id="eq-category"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className={inputCls + " bg-white"}
                    >
                      {CATS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="eq-description" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Descripción
                    </label>
                    <textarea
                      id="eq-description"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      placeholder="Descripción breve del equipo"
                      className={inputCls + " resize-none"}
                    />
                  </div>
                </div>
              </div>

              {/* Compatibilidad */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Compatibilidad</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Vacío = disponible en todos los estudios/servicios</p>
                </div>
                <div className="p-4 space-y-4">
                  <fieldset>
                    <legend className="text-xs font-medium text-gray-600 mb-2">Estudios compatibles</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {allStudios.filter(s => s.isActive).map(s => {
                        const sel = form.studioIds?.includes(s.id);
                        return (
                          <button
                            key={s.id} type="button"
                            onClick={() => {
                              const cur  = form.studioIds || [];
                              const next = sel ? cur.filter(id => id !== s.id) : [...cur, s.id];
                              setForm({ ...form, studioIds: next.length > 0 ? next : null });
                            }}
                            aria-pressed={!!sel}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-gray-900",
                              sel ? "text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
                            )}
                            style={sel ? { background: s.color || "#6B7280" } : {}}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                      {allStudios.filter(s => s.isActive).length === 0 && (
                        <p className="text-xs text-gray-400">No hay estudios activos</p>
                      )}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-xs font-medium text-gray-600 mb-2">Servicios compatibles</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {allServices.filter(s => s.isActive).map(s => {
                        const sel = form.serviceIds?.includes(s.id);
                        return (
                          <button
                            key={s.id} type="button"
                            onClick={() => {
                              const cur  = form.serviceIds || [];
                              const next = sel ? cur.filter(id => id !== s.id) : [...cur, s.id];
                              setForm({ ...form, serviceIds: next.length > 0 ? next : null });
                            }}
                            aria-pressed={!!sel}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-gray-900",
                              sel ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
                            )}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                      {allServices.filter(s => s.isActive).length === 0 && (
                        <p className="text-xs text-gray-400">No hay servicios activos</p>
                      )}
                    </div>
                  </fieldset>
                </div>
              </div>

            </div>

            <SheetFooter className="border-t border-gray-100">
              <Button
                type="button" variant="outline"
                onClick={() => { setShowForm(false); setEditing(null); }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? "Guardar cambios" : "Crear equipo"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
