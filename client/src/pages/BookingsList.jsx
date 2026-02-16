import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { bookingAPI } from '../services/api';
import { useConfig } from '../contexts/ConfigContext';
import toast from 'react-hot-toast';

const STATUS = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmed: { label: 'Confirmada', bg: 'bg-blue-100', text: 'text-blue-800' },
  completed: { label: 'Completada', bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-800' },
  no_show: { label: 'No Show', bg: 'bg-gray-100', text: 'text-gray-800' },
};

const PAY_STATUS = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  deposit_paid: { label: 'Señal', bg: 'bg-orange-100', text: 'text-orange-800' },
  paid: { label: 'Pagado', bg: 'bg-green-100', text: 'text-green-800' },
  refunded: { label: 'Reembolsado', bg: 'bg-gray-100', text: 'text-gray-800' },
};

export default function BookingsList() {
  const { config } = useConfig();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [payFilter, setPayFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pc = config?.primaryColor || '#3B82F6';

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (payFilter) params.paymentStatus = payFilter;
      if (search) params.clientEmail = search;
      const res = await bookingAPI.getAll(params);
      setBookings(res.data.data.bookings);
      setTotalPages(res.data.pages);
      setTotal(res.data.count);
    } catch (err) {
      toast.error('Error al cargar las reservas');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, payFilter, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleConfirm = async (e, id) => {
    e.preventDefault();
    try {
      await bookingAPI.confirm(id);
      toast.success('Reserva confirmada');
      fetchBookings();
    } catch { toast.error('Error al confirmar'); }
  };

  const handleCancel = async (e, id) => {
    e.preventDefault();
    if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
      await bookingAPI.cancel(id, { reason: 'Cancelado por administrador' });
      toast.success('Reserva cancelada');
      fetchBookings();
    } catch { toast.error('Error al cancelar'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm">{total} reservas en total</p>
        </div>
        <button onClick={fetchBookings} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por email..." className="input-field" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field sm:w-44">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1); }}
            className="input-field sm:w-44">
            <option value="">Todos los pagos</option>
            {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading
          ? <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: pc }}></div></div>
          : bookings.length === 0
          ? <div className="p-12 text-center text-gray-400">
              <p className="font-medium">No se encontraron reservas</p>
              <p className="text-sm mt-1">Intenta cambiar los filtros</p>
            </div>
          : <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Reserva', 'Cliente', 'Fecha', 'Estado', 'Pago', 'Total', 'Acciones'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.map(b => {
                      const sc = STATUS[b.status] || STATUS.pending;
                      const pc2 = PAY_STATUS[b.paymentStatus] || PAY_STATUS.pending;
                      return (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-semibold text-gray-700">{b.bookingNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-sm">{b.clientName}</p>
                            <p className="text-xs text-gray-500">{b.clientEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(b.sessionDate + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
                            </p>
                            <p className="text-xs text-gray-500">{b.startTime?.slice(0, 5)} - {b.endTime?.slice(0, 5)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc2.bg} ${pc2.text}`}>{pc2.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-900 text-sm">${parseFloat(b.totalPrice).toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {b.status === 'pending' && (
                                <button onClick={e => handleConfirm(e, b.id)}
                                  className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors" title="Confirmar">
                                  ✓
                                </button>
                              )}
                              {!['cancelled', 'completed'].includes(b.status) && (
                                <button onClick={e => handleCancel(e, b.id)}
                                  className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors" title="Cancelar">
                                  ✕
                                </button>
                              )}
                              <Link to={`/admin/bookings/${b.id}`}
                                className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" title="Ver detalle">
                                ›
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Anterior</button>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
                  </div>
                </div>
              )}
            </>
        }
      </div>
    </div>
  );
}
