import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { bookingAPI, equipmentAPI, configAPI } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const PublicBooking = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableHours, setAvailableHours] = useState([]);
  const [selectedStart, setSelectedStart] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [pricing, setPricing] = useState({ base: 0, equipment: 0, total: 0, deposit: 0 });
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [formData, setFormData] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    contentType: 'podcast', projectDescription: '', clientNotes: '',
  });

  const equipmentCategories = {
    cameras: 'Cámaras', microphones: 'Micrófonos', lights: 'Luces',
    backgrounds: 'Fondos', audio: 'Audio', accessories: 'Accesorios',
    furniture: 'Mobiliario', other: 'Otros',
  };

  const contentTypes = [
    { value: 'podcast', label: '🎙️ Podcast' },
    { value: 'youtube', label: '📹 YouTube' },
    { value: 'social_media', label: '📱 Redes Sociales' },
    { value: 'interview', label: '🎤 Entrevista' },
    { value: 'other', label: '✨ Otro' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const [configRes, equipRes] = await Promise.all([
          configAPI.getPublicConfig(),
          equipmentAPI.getAll({ isActive: true }),
        ]);
        setConfig(configRes.data.data.config);
        setEquipment(equipRes.data.data.equipment);
      } catch (e) {
        toast.error('Error al cargar la página');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedDate || !config) return;
    const fetchSlots = async () => {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await bookingAPI.getCalendar({ startDate: dateStr, endDate: dateStr });
        setBookedSlots(res.data.data.bookings);
        generateHours(selectedDate, res.data.data.bookings);
      } catch (e) {}
    };
    fetchSlots();
  }, [selectedDate, config]);

  useEffect(() => {
    if (!config || !selectedDuration) return;
    const base = parseFloat(config.hourlyRate) * selectedDuration;
    const eqCost = equipment
      .filter(e => selectedEquipment.includes(e.id) && !e.isIncluded)
      .reduce((s, e) => s + parseFloat(e.extraCost), 0);
    const total = base + eqCost;
    const deposit = config.requireDeposit
      ? config.depositType === 'percentage'
        ? (total * parseFloat(config.depositAmount)) / 100
        : parseFloat(config.depositAmount)
      : 0;
    setPricing({ base, equipment: eqCost, total, deposit });
  }, [selectedDuration, selectedEquipment, config]);

  const generateHours = (date, booked) => {
    if (!config?.operatingHours) return;
    const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
    const dayKey = dayMap[date.getDay()];
    const dayConf = config.operatingHours[dayKey];
    if (!dayConf?.enabled) { setAvailableHours([]); return; }
    const [openH] = dayConf.open.split(':').map(Number);
    const [closeH] = dayConf.close.split(':').map(Number);
    const hours = [];
    for (let h = openH; h < closeH; h++) {
      const t = `${String(h).padStart(2, '0')}:00`;
      const occupied = booked.some(b => {
        const s = parseInt(b.startTime.substring(0, 2));
        const e = parseInt(b.endTime.substring(0, 2));
        return h >= s && h < e;
      });
      hours.push({ time: t, available: !occupied });
    }
    setAvailableHours(hours);
    setSelectedStart('');
  };

  const isDisabled = ({ date }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (!config?.operatingHours) return false;
    const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
    return !config.operatingHours[dayMap[date.getDay()]]?.enabled;
  };

  const toggleEq = (id) => {
    setSelectedEquipment(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    const startH = parseInt(selectedStart);
    const endH = startH + selectedDuration;
    setSubmitting(true);
    try {
      const res = await bookingAPI.create({
        ...formData,
        sessionDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: `${String(startH).padStart(2, '0')}:00:00`,
        endTime: `${String(endH).padStart(2, '0')}:00:00`,
        duration: selectedDuration,
        equipmentIds: selectedEquipment,
      });
      setConfirmedBooking(res.data.data.booking);
      setStep(5);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedEquipment = equipment.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const canProceed = () => {
    if (step === 1) return selectedDate && selectedStart && selectedDuration;
    if (step === 2) return true;
    if (step === 3) return formData.clientName && formData.clientEmail && formData.clientPhone;
    return true;
  };

  if (loading) return <Loading fullScreen text="Cargando disponibilidad..." />;

  const primaryColor = config?.primaryColor || '#3B82F6';

  // Step 5: Success
  if (step === 5 && confirmedBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-green-600">
            ✓
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Reserva Confirmada!</h2>
          <p className="text-gray-600 mb-6">Te hemos enviado los detalles por email</p>

          <div className="bg-gray-50 rounded-xl p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Número de Reserva</span>
              <span className="font-bold text-primary-600">{confirmedBooking.bookingNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fecha</span>
              <span className="font-medium">{format(new Date(confirmedBooking.sessionDate), 'PPP', { locale: es })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Hora</span>
              <span className="font-medium">{confirmedBooking.startTime?.substring(0, 5)} – {confirmedBooking.endTime?.substring(0, 5)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-lg">{config?.currency} ${parseFloat(confirmedBooking.totalPrice).toFixed(2)}</span>
            </div>
            {config?.requireDeposit && (
              <div className="flex justify-between text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <span>Señal requerida</span>
                <span className="font-bold">${parseFloat(confirmedBooking.depositAmount || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Llega 10 minutos antes de tu sesión. ¡Nos vemos pronto! 🎬
          </p>

          <button
            onClick={() => { setStep(1); setConfirmedBooking(null); setSelectedDate(null); setSelectedStart(''); setSelectedEquipment([]); }}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Hacer otra reserva
          </button>
        </div>
      </div>
    );
  }

  const stepTitles = ['Fecha y Hora', 'Equipos del Set', 'Tus Datos', 'Confirmar'];
  const endTime = selectedStart ? `${String(parseInt(selectedStart) + selectedDuration).padStart(2, '0')}:00` : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: primaryColor }} className="py-8 px-4 text-white">
        <div className="max-w-3xl mx-auto text-center">
          {config?.logo && (
            <img src={config.logo} alt="logo" className="h-16 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-3xl font-bold">{config?.businessName}</h1>
          <p className="mt-2 text-white/80">Sistema de Reservas Online</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {stepTitles.map((title, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  i + 1 < step ? 'bg-green-500 text-white' :
                  i + 1 === step ? 'text-white' : 'bg-gray-200 text-gray-500'
                }`} style={i + 1 === step ? { backgroundColor: primaryColor } : {}}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`ml-2 text-xs font-medium hidden md:block ${i + 1 === step ? 'text-gray-900' : 'text-gray-400'}`}>
                  {title}
                </span>
                {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${i + 1 < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Step 1: Calendar & Time */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Selecciona la Fecha
              </h2>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileDisabled={isDisabled}
                minDate={new Date()}
                maxDate={addMonths(new Date(), 3)}
                locale="es-ES"
              />
            </div>

            {selectedDate && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Horario Disponible - {format(selectedDate, 'EEEE d', { locale: es })}
                </h2>

                {availableHours.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Este día no está disponible. Selecciona otro.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {availableHours.map(({ time, available }) => (
                        <button
                          key={time}
                          disabled={!available}
                          onClick={() => setSelectedStart(time)}
                          className={`p-3 rounded-xl text-sm font-semibold transition-all ${
                            selectedStart === time ? 'text-white scale-105 shadow-md' :
                            available ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' :
                            'bg-red-50 text-red-200 cursor-not-allowed'
                          }`}
                          style={selectedStart === time ? { backgroundColor: primaryColor } : {}}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    {selectedStart && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">¿Cuántas horas necesitas?</h3>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(h => {
                            const endH = parseInt(selectedStart) + h;
                            const closeH = availableHours.length > 0 ? parseInt(availableHours[availableHours.length - 1].time) + 1 : 24;
                            const valid = h >= (config?.minSessionDuration || 1) && h <= (config?.maxSessionDuration || 8) && endH <= closeH;
                            return (
                              <button key={h} disabled={!valid}
                                onClick={() => setSelectedDuration(h)}
                                className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                                  selectedDuration === h ? 'text-white scale-105' :
                                  valid ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' :
                                  'bg-gray-50 text-gray-200 cursor-not-allowed'
                                }`}
                                style={selectedDuration === h ? { backgroundColor: primaryColor } : {}}>
                                {h}h
                              </button>
                            );
                          })}
                        </div>

                        {pricing.total > 0 && (
                          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: primaryColor + '15' }}>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold" style={{ color: primaryColor }}>
                                  {selectedStart} – {endTime}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {selectedDuration} hora{selectedDuration > 1 ? 's' : ''} · {format(selectedDate, 'PPP', { locale: es })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                                  {config?.currency} ${pricing.total.toFixed(2)}
                                </p>
                                {config?.requireDeposit && (
                                  <p className="text-xs text-gray-500">Señal: ${pricing.deposit.toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Personaliza tu Set</h2>
              <p className="text-gray-600 mb-6">Selecciona los equipos que necesitas para tu grabación</p>

              {Object.entries(groupedEquipment).map(([cat, items]) => (
                <div key={cat} className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">{equipmentCategories[cat]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(item => {
                      const sel = selectedEquipment.includes(item.id);
                      return (
                        <button key={item.id} onClick={() => toggleEq(item.id)}
                          className={`flex items-start justify-between p-4 rounded-xl border-2 text-left transition-all ${
                            sel ? 'border-primary-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={sel ? { borderColor: primaryColor, backgroundColor: primaryColor + '08' } : {}}>
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                            <span className={`text-xs font-semibold mt-2 inline-block ${item.isIncluded ? 'text-green-600' : 'text-orange-500'}`}>
                              {item.isIncluded ? '✓ Incluido gratis' : `+${config?.currency} $${parseFloat(item.extraCost).toFixed(2)}`}
                            </span>
                          </div>
                          {sel && <span className="flex-shrink-0 mt-1 text-lg" style={{ color: primaryColor }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Base ({selectedDuration}h)</span><span>${pricing.base.toFixed(2)}</span></div>
                {pricing.equipment > 0 && <div className="flex justify-between"><span className="text-gray-600">Equipos extras</span><span>${pricing.equipment.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>{config?.currency} ${pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Client Info */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Tu Información
            </h2>
            <div className="space-y-4">
              <Input label="Nombre Completo" required
                value={formData.clientName}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Juan Pérez" />
              <Input label="Email" type="email" required
                value={formData.clientEmail}
                onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="juan@email.com"
                helperText="Recibirás la confirmación en este email" />
              <Input label="Teléfono" required
                value={formData.clientPhone}
                onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+1 809-555-0100" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Contenido</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {contentTypes.map(ct => (
                    <button key={ct.value} onClick={() => setFormData({ ...formData, contentType: ct.value })}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        formData.contentType === ct.value ? 'text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                      style={formData.contentType === ct.value ? { borderColor: primaryColor, backgroundColor: primaryColor } : {}}>
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Proyecto <span className="text-gray-400">(opcional)</span></label>
                <textarea rows="3" value={formData.projectDescription}
                  onChange={e => setFormData({ ...formData, projectDescription: e.target.value })}
                  placeholder="Cuéntanos sobre tu proyecto..."
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 resize-none"
                  style={{ '--tw-ring-color': primaryColor }} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requerimientos Especiales <span className="text-gray-400">(opcional)</span></label>
                <textarea rows="2" value={formData.clientNotes}
                  onChange={e => setFormData({ ...formData, clientNotes: e.target.value })}
                  placeholder="¿Tienes alguna petición especial?"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Confirma tu Reserva</h2>
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">Fecha y Hora</p>
                    <p className="font-semibold text-gray-900">{format(selectedDate, 'PPP', { locale: es })}</p>
                    <p className="text-sm text-gray-600">{selectedStart} – {endTime} ({selectedDuration}h)</p>
                  </div>
                </div>
                {/* Client */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-semibold text-gray-900">{formData.clientName}</p>
                    <p className="text-sm text-gray-600">{formData.clientEmail} · {formData.clientPhone}</p>
                  </div>
                </div>
                {/* Equipment */}
                {selectedEquipment.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-2">Equipos</p>
                    <div className="flex flex-wrap gap-2">
                      {equipment.filter(e => selectedEquipment.includes(e.id)).map(e => (
                        <span key={e.id} className="text-xs px-3 py-1 rounded-full text-white" style={{ backgroundColor: primaryColor }}>
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Price */}
                <div className="p-4 rounded-xl text-white" style={{ backgroundColor: primaryColor }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/80 text-sm">Total a Pagar</p>
                      <p className="text-3xl font-bold">{config?.currency} ${pricing.total.toFixed(2)}</p>
                    </div>
                    {config?.requireDeposit && (
                      <div className="text-right">
                        <p className="text-white/80 text-xs">Señal requerida</p>
                        <p className="text-xl font-semibold">${pricing.deposit.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {config?.termsAndConditions && (
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl">
                    <p className="font-medium mb-1">Términos y Condiciones:</p>
                    <p>{config.termsAndConditions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium">
              ← Atrás
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              disabled={!canProceed()}
              onClick={() => setStep(step + 1)}
              className="px-8 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor }}>
              Continuar →
            </button>
          ) : (
            <Button
              variant="success"
              loading={submitting}
              onClick={handleSubmit}
              className="px-8 py-3 rounded-xl font-semibold"
            >
              ¡Confirmar Reserva!
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 py-8 text-center text-sm text-gray-400 border-t">
        <p>{config?.businessName} · {config?.phone} · {config?.email}</p>
      </div>
    </div>
  );
};

export default PublicBooking;
