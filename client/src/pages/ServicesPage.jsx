import React, { useState, useEffect } from 'react';
import { serviceAPI } from '../services/api';
import { useConfig } from '../contexts/ConfigContext';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', description: '', basePrice: '', duration: '', isActive: true, order: 0 };

export default function ServicesPage() {
  const { config } = useConfig();
  const pc = config?.primaryColor || '#3B82F6';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await serviceAPI.getAll();
      setServices(res.data.data.services);
    } catch {
      toast.error('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      basePrice: service.basePrice,
      duration: service.duration,
      isActive: service.isActive,
      order: service.order,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.basePrice || !form.duration) {
      toast.error('Nombre, precio y duración son requeridos');
      return;
    }
    setSaving(true);
    try {
      if (editingService) {
        await serviceAPI.update(editingService.id, form);
        toast.success('Servicio actualizado');
      } else {
        await serviceAPI.create(form);
        toast.success('Servicio creado');
      }
      setShowModal(false);
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service) => {
    try {
      await serviceAPI.update(service.id, { isActive: !service.isActive });
      toast.success(service.isActive ? 'Servicio desactivado' : 'Servicio activado');
      fetchServices();
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDelete = async (service) => {
    if (!window.confirm(`¿Desactivar el servicio "${service.name}"?`)) return;
    try {
      await serviceAPI.delete(service.id);
      toast.success('Servicio desactivado');
      fetchServices();
    } catch {
      toast.error('Error al desactivar servicio');
    }
  };

  const handleReorder = async (service, direction) => {
    const sorted = [...services].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(s => s.id === service.id);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const newOrder = sorted[newIdx].order;
    const swapOrder = sorted[idx].order;
    try {
      await Promise.all([
        serviceAPI.reorder(service.id, { order: newOrder }),
        serviceAPI.reorder(sorted[newIdx].id, { order: swapOrder }),
      ]);
      fetchServices();
    } catch {
      toast.error('Error al reordenar');
    }
  };

  const sortedServices = [...services].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Servicio</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona los servicios disponibles para reservar</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: pc }}
        >
          + Nuevo Servicio
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: pc }} />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-lg">No hay servicios configurados</p>
          <button onClick={openCreate} className="mt-4 text-sm font-medium" style={{ color: pc }}>
            + Crear primer servicio
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Orden</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Servicio</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Duración</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Precio</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedServices.map((service, idx) => (
                <tr key={service.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(service, 'up')}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleReorder(service, 'down')}
                        disabled={idx === sortedServices.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{service.duration}h</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ${parseFloat(service.basePrice).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        service.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                      onClick={() => handleToggleActive(service)}
                    >
                      {service.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(service)}
                        className="text-sm px-3 py-1.5 rounded-lg"
                        style={{ background: `${pc}15`, color: pc }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
                        className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': pc }}
                  placeholder="ej: Podcast, Música, Video"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none h-20 resize-none"
                  placeholder="Descripción del servicio..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basePrice}
                    onChange={e => setForm({ ...form, basePrice: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas) *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={form.duration}
                    onChange={e => setForm({ ...form, duration: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
                    placeholder="2"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <span className="text-sm text-gray-700">Servicio activo</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: pc }}
                >
                  {saving ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear Servicio'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
