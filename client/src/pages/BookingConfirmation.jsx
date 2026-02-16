import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { bookingAPI } from '../services/api';
import { useConfig } from '../contexts/ConfigContext';

export default function BookingConfirmation() {
  const { bookingNumber } = useParams();
  const { config } = useConfig();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const primaryColor = config?.primaryColor || '#3B82F6';

  useEffect(() => {
    bookingAPI.getByNumber(bookingNumber)
      .then(res => setBooking(res.data.data.booking))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingNumber]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl" style={{ background: `${primaryColor}20`, color: primaryColor }}>
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva Creada!</h1>
          <p className="text-gray-500 mb-6">Recibirás un email de confirmación en breve</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Número de Reserva</p>
            <p className="text-2xl font-bold" style={{ color: primaryColor }}>{bookingNumber}</p>
          </div>

          {booking && (
            <div className="text-left space-y-3 mb-6">
              <DetailRow
                label="Fecha"
                value={format(new Date(booking.sessionDate + 'T12:00:00'), "EEEE, d 'de' MMMM yyyy", { locale: es })} />
              <DetailRow
                label="Horario"
                value={`${booking.startTime?.slice(0, 5)} - ${booking.endTime?.slice(0, 5)}`} />
              <DetailRow
                label="Email"
                value={booking.clientEmail} />
              <DetailRow
                label="Total"
                value={`${config?.currency || 'USD'} $${parseFloat(booking.totalPrice).toFixed(2)}`} />
              {booking.depositAmount > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                  💳 Señal requerida: <strong>${parseFloat(booking.depositAmount).toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Link to="/" className="block w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 text-center"
              style={{ background: primaryColor }}>
              Hacer otra reserva
            </Link>
            <Link to="/booking/check" className="block w-full py-3 rounded-xl font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 text-center">
              Ver mi reserva
            </Link>
          </div>

          {config && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
              <p className="font-medium text-gray-700 mb-1">{config.businessName}</p>
              {config.address && <p>{config.address}</p>}
              {config.phone && <p>{config.phone}</p>}
              {config.email && <p>{config.email}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-gray-900 text-sm">{value}</p>
  </div>
);
