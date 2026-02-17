import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../services/api';
import { useConfig } from '../contexts/ConfigContext';
import toast from 'react-hot-toast';

const CATS = [
  { value: 'cameras', label: '📷 Cámaras' }, { value: 'microphones', label: '🎙️ Micrófonos' },
  { value: 'lights', label: '💡 Iluminación' }, { value: 'backgrounds', label: '🖼️ Fondos' },
  { value: 'audio', label: '🎧 Audio' }, { value: 'accessories', label: '🔧 Accesorios' },
  { value: 'furniture', label: '🪑 Mobiliario' }, { value: 'other', label: '📦 Otros' },
];
const EMPTY = { name: '', category: 'cameras', description: '', quantity: 1, isIncluded: true, extraCost: 0, isActive: true, allowQuantitySelection: false, options: null };

export default function EquipmentPage() {
  const { config } = useConfig();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterCat, setFilterCat] = useState('');
  const [saving, setSaving] = useState(false);
  const pc = config?.primaryColor || '#3B82F6';

  const fetch = async () => {
    try { const r = await equipmentAPI.getAll(); setEquipment(r.data.data.equipment); }
    catch { toast.error('Error al cargar equipos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('El nombre es requerido');
    setSaving(true);
    try {
      if (editing) { await equipmentAPI.update(editing, form); toast.success('Actualizado'); }
      else { await equipmentAPI.create(form); toast.success('Creado'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); fetch();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name, category: item.category, description: item.description || '',
      quantity: item.quantity, isIncluded: item.isIncluded, extraCost: item.extraCost,
      isActive: item.isActive, allowQuantitySelection: item.allowQuantitySelection || false,
      options: item.options ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options) : null,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este equipo?')) return;
    try { await equipmentAPI.delete(id); toast.success('Eliminado'); fetch(); }
    catch { toast.error('Error al eliminar'); }
  };

  const handleToggle = async (item) => {
    try { await equipmentAPI.update(item.id, { isActive: !item.isActive }); toast.success('Estado actualizado'); fetch(); }
    catch { toast.error('Error'); }
  };

  const handleImage = async (id, e) => {
    const file = e.target.files[0]; if (!file) return;
    try { await equipmentAPI.uploadImage(id, file); toast.success('Imagen actualizada'); fetch(); }
    catch { toast.error('Error al subir imagen'); }
  };

  const filtered = filterCat ? equipment.filter(e => e.category === filterCat) : equipment;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Equipos del Set</h1>
          <p className="text-gray-500 text-sm">{equipment.length} equipos configurados</p></div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); }} className="btn-primary" style={{ background: pc }}>
          + Agregar Equipo
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fade-in">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="ej: Shure SM7B" required />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cantidad</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field h-16 resize-none" />
            </div>
            <div className="flex items-center gap-4">
              <label className="label mb-0">¿Incluido gratis?</label>
              <input type="checkbox" checked={form.isIncluded} onChange={() => setForm({ ...form, isIncluded: !form.isIncluded })}
                className="w-5 h-5 text-green-500 rounded" />
              <span className="text-sm text-gray-600">{form.isIncluded ? 'Incluido' : 'Costo extra'}</span>
            </div>
            {!form.isIncluded && (
              <div>
                <label className="label">Costo Extra ($)</label>
                <input type="number" min="0" step="0.01" value={form.extraCost} onChange={e => setForm({ ...form, extraCost: parseFloat(e.target.value) || 0 })} className="input-field" />
              </div>
            )}
            <div className="sm:col-span-2 flex items-center gap-3 py-2 border-t border-gray-100 mt-2">
              <input type="checkbox" id="allowQty" checked={form.allowQuantitySelection} onChange={e => setForm({ ...form, allowQuantitySelection: e.target.checked })} className="w-4 h-4 rounded" />
              <label htmlFor="allowQty" className="text-sm text-gray-700 cursor-pointer">Permitir que el cliente seleccione cantidad (1-10)</label>
            </div>

            {/* Variantes/Opciones */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Variantes/Opciones</label>
                <button
                  type="button"
                  onClick={() => {
                    const currentOpts = form.options || { default: { types: [] } };
                    const types = currentOpts.default?.types || [];
                    const newOpt = { id: `opt_${Date.now()}`, name: 'Nueva variante', extraCost: 0, image: null };
                    setForm({ ...form, options: { default: { types: [...types, newOpt] } } });
                  }}
                  className="text-sm font-medium"
                  style={{ color: pc }}
                >
                  + Agregar variante
                </button>
              </div>
              {form.options?.default?.types?.length > 0 && (
                <div className="space-y-2">
                  {form.options.default.types.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={opt.name}
                          onChange={e => {
                            const types = [...form.options.default.types];
                            types[i] = { ...types[i], name: e.target.value };
                            setForm({ ...form, options: { default: { types } } });
                          }}
                          placeholder="Nombre variante"
                          className="input-field text-xs"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={opt.extraCost || 0}
                          onChange={e => {
                            const types = [...form.options.default.types];
                            types[i] = { ...types[i], extraCost: parseFloat(e.target.value) || 0 };
                            setForm({ ...form, options: { default: { types } } });
                          }}
                          placeholder="Costo extra"
                          className="input-field text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const types = form.options.default.types.filter((_, j) => j !== i);
                          setForm({ ...form, options: types.length > 0 ? { default: { types } } : null });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(!form.options?.default?.types?.length) && (
                <p className="text-xs text-gray-400">Sin variantes configuradas. Las variantes permiten al cliente elegir entre diferentes opciones del mismo equipo.</p>
              )}
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary" style={{ background: pc }}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterCat ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`} style={{ background: !filterCat ? pc : undefined }}>
          Todos ({equipment.length})
        </button>
        {CATS.filter(c => equipment.some(e => e.category === c.value)).map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterCat === c.value ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`} style={{ background: filterCat === c.value ? pc : undefined }}>
            {c.label} ({equipment.filter(e => e.category === c.value).length})
          </button>
        ))}
      </div>

      {loading
        ? <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: pc }}></div></div>
        : filtered.length === 0
        ? <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-500">No hay equipos en esta categoría</p></div>
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${item.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                <div className="relative h-32 bg-gray-50 group">
                  {item.image ? <img src={`http://localhost:5000${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Sin imagen</div>}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 cursor-pointer transition-all">
                    <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">Cambiar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImage(item.id, e)} />
                  </label>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{CATS.find(c => c.value === item.category)?.label}</p>
                  {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium ${item.isIncluded ? 'text-green-600' : 'text-orange-600'}`}>
                      {item.isIncluded ? '✓ Incluido' : `+$${item.extraCost}`}
                    </span>
                    <span className="text-xs text-gray-400">x{item.quantity}</span>
                  </div>
                  <div className="flex gap-1 mt-3 pt-2 border-t border-gray-100">
                    <button onClick={() => handleEdit(item)} className="flex-1 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1">Editar</button>
                    <button onClick={() => handleToggle(item)} className="flex-1 py-1 rounded text-xs text-gray-600 hover:bg-gray-100">{item.isActive ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={() => handleDelete(item.id)} className="py-1 px-2 rounded text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
