import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { bookingAPI } from '../services/api';
import { useConfig } from '../contexts/ConfigContext';
import { FiSearch, FiArrowLeft, FiCalendar, FiClock, FiDollarSign, FiPackage } from 'react-icons/fi';

const STATUS_LABELS = {
  pending: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmada', class: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completada', class: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelada', class: 'bg-red-100 text-red-800' },
};

const PAYMENT_LABELS = {
  pending: { label: 'Pendiente', class: 'bg-yellow-100 text-yellow-800' },
  deposit_paid: { label: 'Señal Pagada', class: 'bg-orange-100 text-orange-800' },
  paid: { label: 'Pagado', class: 'bg-green-100 text-green-800' },
  refunded: { label: 'Reembolsado', class: 'bg-gray-100 text-gray-800' },
};

export default function CheckBooking() {
  const { config } = useConfig();
  const [bookingNumber, setBookingNumber] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const primaryColor = config?.primaryColor || '#3B82F6';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!bookingNumber.trim()) return;
    setLoading(true);
    setError('');
    setBooking(null);
    try {
      const res = await bookingAPI.getByNumber(bookingNumber.trim(), email);
      setBooking(res.data.data.booking);
    } catch (err) {
      setError('No se encontró la reserva. Verifica el número y tu correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <FiArrowLeft /> Volver al inicio
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Consultar Reserva</h1>
          <p className="text-gray-500 mb-6">Ingresa tu número de reserva para ver los detalles</p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="label">Número de Reserva</label>
              <input type="text" value={bookingNumber} onChange={e => setBookingNumber(e.target.value)}
                className="input-field" placeholder="BK-20240215-001" />
            </div>
            <div>
              <label className="label">Tu Correo Electrónico (opcional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="tucorreo@ejemplo.com" />
            </div>
            <button type="submit" disabled={loading || !bookingNumber.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: primaryColor }}>
              <FiSearch /> {loading ? 'Buscando...' : 'Buscar Reserva'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {booking && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">{booking.bookingNumber}</h2>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[booking.status]?.class}`}>
                      {STATUS_LABELS[booking.status]?.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_LABELS[booking.paymentStatus]?.class}`}>
                      {PAYMENT_LABELS[booking.paymentStatus]?.label}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FiCalendar style={{ color: primaryColor }} className="mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha</p>
                      <p className="font-medium text-sm">
                        {format(new Date(booking.sessionDate + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiClock style={{ color: primaryColor }} className="mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Horario</p>
                      <p className="font-medium text-sm">
                        {booking.startTime?.slice(0, 5)} - {booking.endTime?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiDollarSign style={{ color: primaryColor }} className="mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-medium text-sm">${parseFloat(booking.totalPrice).toFixed(2)} {config?.currency}</p>
                    </div>
                  </div>
                  {booking.remainingAmount > 0 && (
                    <div className="flex items-start gap-3">
                      <FiDollarSign className="mt-0.5 text-orange-500" />
                      <div>
                        <p className="text-xs text-gray-500">Pendiente</p>
                        <p className="font-medium text-sm text-orange-600">${parseFloat(booking.remainingAmount).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {booking.equipment && booking.equipment.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <FiPackage size={12} /> Equipos seleccionados
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {booking.equipment.map(eq => (
                        <span key={eq.id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {eq.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
