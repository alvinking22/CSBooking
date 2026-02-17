import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { bookingAPI, paymentAPI } from '../services/api';
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
  pending: 'Pendiente', deposit_paid: 'Señal Pagada', paid: 'Pagado Completo', refunded: 'Reembolsado'
};

const PAY_METHODS = [
  { value: 'cash', label: '💵 Efectivo' },
  { value: 'transfer', label: '🏦 Transferencia' },
  { value: 'card', label: '💳 Tarjeta' },
  { value: 'azul', label: '💙 Azul' },
  { value: 'other', label: '🔄 Otro' },
];

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { config } = useConfig();
  const [booking, setBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash', paymentType: 'full', notes: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const pc = config?.primaryColor || '#3B82F6';

  const fetch = async () => {
    try {
      const [bookRes, payRes] = await Promise.all([
        bookingAPI.getById(id),
        paymentAPI.getByBooking(id)
      ]);
      const b = bookRes.data.data.booking;
      setBooking(b);
      setAdminNotes(b.adminNotes || '');
      setPayments(payRes.data.data.payments);
    } catch { toast.error('Error al cargar la reserva'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  const handleConfirm = async () => {
    try {
      await bookingAPI.confirm(id);
      toast.success('Reserva confirmada');
      fetch();
    } catch { toast.error('Error al confirmar'); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Ingresa una razón de cancelación'); return; }
    try {
      await bookingAPI.cancel(id, { reason: cancelReason });
      toast.success('Reserva cancelada');
      setShowCancelForm(false);
      fetch();
    } catch { toast.error('Error al cancelar'); }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await bookingAPI.update(id, { status });
      toast.success('Estado actualizado');
      fetch();
    } catch { toast.error('Error al actualizar estado'); }
  };

  const handleSaveNotes = async () => {
    try {
      await bookingAPI.update(id, { adminNotes });
      toast.success('Notas guardadas');
      setEditingNotes(false);
    } catch { toast.error('Error al guardar'); }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    try {
      await paymentAPI.create({ ...paymentForm, bookingId: id, amount: parseFloat(paymentForm.amount) });
      toast.success('Pago registrado');
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', paymentMethod: 'cash', paymentType: 'full', notes: '' });
      fetch();
    } catch { toast.error('Error al registrar pago'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: pc }}></div></div>;
  if (!booking) return <div className="text-center py-12"><p className="text-gray-500">Reserva no encontrada</p><Link to="/admin/bookings" className="text-blue-600 hover:text-blue-700 mt-2 block">← Volver a reservas</Link></div>;

  const sc = STATUS[booking.status] || STATUS.pending;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/bookings" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{booking.bookingNumber}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
          </div>
          <p className="text-gray-500 text-sm">Creada el {format(new Date(booking.createdAt), "d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <button onClick={handleConfirm} className="btn-success text-sm">
              Confirmar
            </button>
          )}
          {!['cancelled', 'completed'].includes(booking.status) && (
            <button onClick={() => setShowCancelForm(true)} className="btn-danger text-sm">
              Cancelar
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button onClick={() => handleStatusUpdate('completed')} className="btn-primary text-sm" style={{ background: '#10B981' }}>
              Completar
            </button>
          )}
        </div>
      </div>

      {/* Cancel Form */}
      {showCancelForm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 mb-3">¿Por qué se cancela esta reserva?</h3>
          <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            className="input-field h-20 resize-none mb-3" placeholder="Razón de cancelación..." />
          <div className="flex gap-2">
            <button onClick={handleCancel} className="btn-danger text-sm">Confirmar Cancelación</button>
            <button onClick={() => setShowCancelForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Session Details */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">📅 Detalles de la Sesión</h3>
            <div className="space-y-3 text-sm">
              <Row label="Fecha" value={format(new Date(booking.sessionDate + 'T12:00:00'), "EEEE, d 'de' MMMM yyyy", { locale: es })} />
              <Row label="Horario" value={`${booking.startTime?.slice(0, 5)} - ${booking.endTime?.slice(0, 5)}`} />
              <Row label="Duración" value={`${booking.duration} hora(s)`} />
              {booking.serviceType && (
                <Row label="Servicio" value={booking.serviceType.name} />
              )}
              {!booking.serviceType && booking.contentType && (
                <Row label="Tipo" value={booking.contentType} />
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">👤 Información del Cliente</h3>
            <div className="space-y-3 text-sm">
              <Row label="Nombre" value={booking.clientName} />
              <Row label="Email" value={<a href={`mailto:${booking.clientEmail}`} className="text-blue-600 hover:underline">{booking.clientEmail}</a>} />
              <Row label="Teléfono" value={<a href={`tel:${booking.clientPhone}`} className="text-blue-600 hover:underline">{booking.clientPhone}</a>} />
            </div>
            {booking.projectDescription && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Descripción del proyecto</p>
                <p className="text-sm text-gray-700">{booking.projectDescription}</p>
              </div>
            )}
            {booking.clientNotes && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Notas del cliente</p>
                <p className="text-sm text-gray-700">{booking.clientNotes}</p>
              </div>
            )}
          </div>

          {/* Equipment */}
          {booking.equipment?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">
                Equipos del Set
              </h3>
              <div className="space-y-2">
                {booking.equipment.map(eq => {
                  const qty = eq.BookingEquipment?.quantity || 1;
                  const selectedOption = eq.BookingEquipment?.selectedOption;
                  let optName = null;
                  if (selectedOption && eq.options) {
                    const opts = typeof eq.options === 'string' ? JSON.parse(eq.options) : eq.options;
                    for (const cat of Object.values(opts)) {
                      if (cat.types) {
                        const opt = cat.types.find(t => t.id === selectedOption);
                        if (opt) { optName = opt.name; break; }
                      }
                    }
                  }
                  return (
                    <div key={eq.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700">
                        {qty > 1 ? `${qty}x ` : ''}{eq.name}{optName ? ` (${optName})` : ''}
                      </span>
                      <span className={eq.isIncluded ? 'text-green-600' : 'text-orange-600'}>
                        {eq.isIncluded ? 'Incluido' : `+$${eq.extraCost}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Pricing */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">💰 Facturación</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Precio base</span><span>${parseFloat(booking.basePrice).toFixed(2)}</span></div>
              {booking.equipmentCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Equipos extras</span><span>+${parseFloat(booking.equipmentCost).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>Total</span><span style={{ color: pc }}>${parseFloat(booking.totalPrice).toFixed(2)} {config?.currency}</span>
              </div>
              <div className="flex justify-between text-green-600"><span>Pagado</span><span>${parseFloat(booking.paidAmount).toFixed(2)}</span></div>
              {booking.remainingAmount > 0 && <div className="flex justify-between text-orange-600 font-semibold"><span>Pendiente</span><span>${parseFloat(booking.remainingAmount).toFixed(2)}</span></div>}
            </div>
          </div>

          {/* Payments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">💳 Pagos Registrados</h3>
              <button onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="text-sm px-3 py-1.5 rounded-lg text-white" style={{ background: pc }}>
                + Registrar Pago
              </button>
            </div>

            {showPaymentForm && (
              <form onSubmit={handleAddPayment} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                <h4 className="font-medium text-gray-800 text-sm">Nuevo Pago</h4>
                <div>
                  <label className="label">Monto *</label>
                  <input type="number" step="0.01" min="0.01" value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="input-field" placeholder="0.00" required />
                </div>
                <div>
                  <label className="label">Método de Pago</label>
                  <select value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="input-field">
                    {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select value={paymentForm.paymentType}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                    className="input-field">
                    <option value="deposit">Señal/Depósito</option>
                    <option value="partial">Pago Parcial</option>
                    <option value="full">Pago Total</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notas</label>
                  <input type="text" value={paymentForm.notes}
                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="input-field" placeholder="Referencia, número de transacción, etc." />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm">Guardar Pago</button>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="btn-secondary text-sm">Cancelar</button>
                </div>
              </form>
            )}

            {payments.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">No hay pagos registrados</p>
              : <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                      <div>
                        <p className="font-medium text-gray-800">${parseFloat(p.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {PAY_METHODS.find(m => m.value === p.paymentMethod)?.label} ·&nbsp;
                          {format(new Date(p.paymentDate), "d MMM yyyy", { locale: es })}
                        </p>
                        {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                      </div>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Completado</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Admin Notes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">📝 Notas Internas</h3>
              <button onClick={() => editingNotes ? handleSaveNotes() : setEditingNotes(true)}
                className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: `${pc}15`, color: pc }}>
                {editingNotes ? 'Guardar' : 'Editar'}
              </button>
            </div>
            {editingNotes
              ? <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  className="input-field h-28 resize-none" placeholder="Notas internas sobre esta reserva..." />
              : <p className="text-sm text-gray-600 min-h-[60px]">{adminNotes || <span className="text-gray-400 italic">Sin notas</span>}</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between items-start">
    <span className="text-gray-500 flex-shrink-0">{label}</span>
    <span className="font-medium text-gray-900 text-right ml-4">{value}</span>
  </div>
);
