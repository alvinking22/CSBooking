import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { bookingAPI, paymentAPI } from '../services/api';
import { useConfig } from '../contexts/ConfigContext';

const STATUS = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmed: { label: 'Confirmada', bg: 'bg-blue-100', text: 'text-blue-800' },
  completed: { label: 'Completada', bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-800' },
};

export default function Dashboard() {
  const { config } = useConfig();
  const [stats, setStats] = useState(null);
  const [payStats, setPayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const pc = config?.primaryColor || '#3B82F6';

  useEffect(() => {
    Promise.all([bookingAPI.getDashboardStats(), paymentAPI.getStats()])
      .then(([b, p]) => { setStats(b.data.data); setPayStats(p.data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: pc }}></div></div>;

  const cards = [
    { label: 'Reservas Este Mes', value: stats?.thisMonthBookings || 0, color: pc, sub: `${stats?.totalBookings || 0} en total` },
    { label: 'Ingresos del Mes', value: `$${parseFloat(payStats?.monthRevenue || 0).toFixed(2)}`, color: '#10B981', sub: `$${parseFloat(payStats?.totalRevenue || 0).toFixed(2)} histórico` },
    { label: 'Pendientes', value: stats?.pendingBookings || 0, color: '#F59E0B', sub: 'Esperando confirmación' },
    { label: 'Pagos Pendientes', value: payStats?.pendingPayments || 0, color: '#EF4444', sub: 'Por registrar' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="p-2 rounded-xl w-fit mb-3" style={{ background: `${c.color}15` }}>
              <div className="w-5 h-5 rounded-full" style={{ background: c.color }} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">{c.label}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Próximas Reservas</h2>
          <Link to="/admin/bookings" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todas ›
          </Link>
        </div>
        {!stats?.upcomingBookings?.length
          ? <div className="p-8 text-center text-gray-400"><p>No hay reservas próximas</p></div>
          : <div className="divide-y divide-gray-50">
              {stats.upcomingBookings.map(b => {
                const sc = STATUS[b.status] || STATUS.pending;
                return (
                  <Link key={b.id} to={`/admin/bookings/${b.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0" style={{ background: pc }}>
                      <span className="text-xs font-bold">{format(new Date(b.sessionDate + 'T12:00:00'), 'MMM', { locale: es }).toUpperCase()}</span>
                      <span className="text-lg font-bold leading-none">{format(new Date(b.sessionDate + 'T12:00:00'), 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{b.clientName}</p>
                      <p className="text-sm text-gray-500">{b.startTime?.slice(0, 5)} - {b.endTime?.slice(0, 5)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      <span className="text-sm font-semibold">${parseFloat(b.totalPrice).toFixed(2)}</span>
                    </div>
                    <span className="text-gray-400">›</span>
                  </Link>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}
