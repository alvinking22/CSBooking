import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiCash, HiArrowRight } from 'react-icons/hi';
import { paymentAPI } from '../services/api';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PaymentsPage = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, statsRes] = await Promise.all([paymentAPI.getAll(), paymentAPI.getStats()]);
      setPayments(paymentsRes.data.data.payments);
      setStats(statsRes.data.data);
    } catch { toast.error('Error al cargar pagos'); }
    finally { setLoading(false); }
  };

  const methodLabels = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', azul: 'Azul', other: 'Otro' };
  const typeLabels = { deposit: 'Señal', full: 'Completo', partial: 'Parcial', refund: 'Reembolso' };

  const filtered = filter ? payments.filter(p => p.paymentMethod === filter) : payments;

  if (loading) return <Loading fullScreen text="Cargando pagos..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-600 mt-1">Historial y estadísticas de pagos recibidos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <HiCash className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold">${parseFloat(stats?.totalRevenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <HiCash className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Este Mes</p>
              <p className="text-2xl font-bold">${parseFloat(stats?.monthRevenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <HiCash className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de Pagos</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Method Breakdown */}
      {stats?.methodBreakdown?.length > 0 && (
        <Card title="Por Método de Pago" className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.methodBreakdown.map(m => (
              <div key={m.paymentMethod} className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xl font-bold text-gray-900">${parseFloat(m.total).toFixed(2)}</p>
                <p className="text-sm text-gray-600 font-medium">{methodLabels[m.paymentMethod]}</p>
                <p className="text-xs text-gray-400">{m.count} pago{m.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${!filter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Todos
          </button>
          {Object.entries(methodLabels).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === k ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </Card>

      {/* Payments List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(payment => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => payment.Booking && navigate(`/admin/bookings/${payment.Booking.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <HiCash className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <p className="font-bold text-gray-900 text-lg">${parseFloat(payment.amount).toFixed(2)}</p>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {methodLabels[payment.paymentMethod]}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {typeLabels[payment.paymentType]}
                      </span>
                    </div>
                    {payment.Booking && (
                      <p className="text-sm text-gray-600">
                        {payment.Booking.bookingNumber} · {payment.Booking.clientName}
                      </p>
                    )}
                    {payment.reference && <p className="text-xs text-gray-400">Ref: {payment.reference}</p>}
                  </div>
                </div>
                <div className="text-right flex items-center space-x-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {format(new Date(payment.paymentDate), "dd 'de' MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(payment.paymentDate), 'HH:mm')}</p>
                  </div>
                  {payment.Booking && <HiArrowRight className="w-5 h-5 text-gray-400" />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-16">
            <HiCash className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay pagos registrados</p>
            <p className="text-gray-400 text-sm mt-1">Los pagos se registran desde el detalle de cada reserva</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PaymentsPage;
