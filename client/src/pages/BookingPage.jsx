import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { bookingAPI, equipmentAPI, serviceAPI } from '../services/api';
import ModernCalendar from '../components/booking/ModernCalendar';

const CATEGORY_LABELS = {
  cameras: 'Cámaras', microphones: 'Micrófonos', lights: 'Iluminación',
  backgrounds: 'Fondos', audio: 'Audio', accessories: 'Accesorios',
  furniture: 'Mobiliario', other: 'Otros'
};

const STEPS = ['Servicio', 'Fecha y Hora', 'Personalizar Set', 'Tus Datos', 'Confirmar'];

export default function BookingPage() {
  const { config } = useConfig();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Paso 1: Servicio
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Paso 2: Fecha y hora
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStart, setSelectedStart] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);

  // Paso 3: Equipos
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [equipmentDetails, setEquipmentDetails] = useState({});

  // Paso 4: Datos cliente
  const [clientData, setClientData] = useState({ name: '', email: '', phone: '', projectDescription: '', notes: '' });

  // Precios
  const [pricing, setPricing] = useState({ base: 0, extras: 0, total: 0, deposit: 0 });
  const [loading, setLoading] = useState(false);

  const useTimeBlocks = config?.useTimeBlocks || false;
  const configTimeBlocks = config?.timeBlocks
    ? (typeof config.timeBlocks === 'string' ? JSON.parse(config.timeBlocks) : config.timeBlocks)
    : [
        { time: '10:00', label: 'Mañana (10am)' },
        { time: '15:00', label: 'Tarde (3pm)' },
        { time: '17:00', label: 'Tarde-Noche (5pm)' },
        { time: '19:00', label: 'Noche (7pm)' },
      ];

  // Cargar servicios y equipos
  useEffect(() => {
    serviceAPI.getAll().then(res => setServices(res.data.data.services)).catch(() => {});
    equipmentAPI.getAll({ isActive: true }).then(res => setEquipment(res.data.data.equipment)).catch(() => {});
  }, []);

  // Cargar slots cuando cambia la fecha
  useEffect(() => {
    if (selectedDate && config) {
      loadDaySlots(selectedDate);
    }
  }, [selectedDate, config]);

  // Calcular precios
  useEffect(() => {
    if (selectedService) {
      const basePrice = parseFloat(selectedService.basePrice);
      const extrasPrice = selectedEquipment.reduce((sum, id) => {
        const item = equipment.find(e => e.id === id);
        if (!item || item.isIncluded) return sum;
        const detail = equipmentDetails[id];
        const qty = detail?.quantity || 1;
        let unitCost = parseFloat(item.extraCost || 0);
        if (detail?.selectedOption && item.options) {
          const opts = typeof item.options === 'string' ? JSON.parse(item.options) : item.options;
          for (const cat of Object.values(opts)) {
            if (cat.types) {
              const opt = cat.types.find(t => t.id === detail.selectedOption);
              if (opt) { unitCost = parseFloat(opt.extraCost || 0); break; }
            }
          }
        }
        return sum + unitCost * qty;
      }, 0);
      const totalPrice = basePrice + extrasPrice;
      let deposit = 0;
      if (config?.requireDeposit) {
        deposit = config.depositType === 'percentage'
          ? (totalPrice * parseFloat(config.depositAmount || 50)) / 100
          : parseFloat(config.depositAmount || 0);
      }
      setPricing({ base: basePrice, extras: extrasPrice, total: totalPrice, deposit });
    }
  }, [selectedService, selectedEquipment, equipmentDetails, equipment, config]);

  const loadDaySlots = async (date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const [year, month] = [date.getFullYear(), date.getMonth()];
      const start = format(new Date(year, month, 1), 'yyyy-MM-dd');
      const end = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
      const res = await bookingAPI.getCalendar({ startDate: start, endDate: end });
      const dayBookings = res.data.data.bookings.filter(b => b.sessionDate === dateStr);
      setOccupiedSlots(dayBookings);
      if (config?.operatingHours) {
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        const hours = config.operatingHours[dayName];
        if (hours?.enabled) {
          const slots = generateTimeSlots(hours.open, hours.close, dayBookings, config.bufferTime || 30);
          setAvailableSlots(slots);
        } else {
          setAvailableSlots([]);
        }
      }
    } catch {
      setAvailableSlots(generateTimeSlots('09:00', '18:00', [], 30));
    }
  };

  const generateTimeSlots = (openTime, closeTime, occupied, bufferMinutes) => {
    const slots = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    let currentH = openH, currentM = openM;
    while (currentH < closeH || (currentH === closeH && currentM < closeM)) {
      const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
      const isOccupied = occupied.some(b => {
        const s = b.startTime.slice(0, 5);
        const e = b.endTime.slice(0, 5);
        return timeStr >= s && timeStr < e;
      });
      slots.push({ time: timeStr, occupied: isOccupied });
      currentM += 60;
      if (currentM >= 60) { currentH++; currentM -= 60; }
    }
    return slots;
  };

  const isBlockAvailable = (blockTime) => {
    if (!selectedService) return false;
    const duration = selectedService.duration;
    const [bH, bM] = blockTime.split(':').map(Number);
    const blockStart = bH * 60 + bM;
    const blockEnd = blockStart + duration * 60;
    return !occupiedSlots.some(b => {
      const sTime = b.startTime.slice(0, 5).split(':').map(Number);
      const eTime = b.endTime.slice(0, 5).split(':').map(Number);
      const bookStart = sTime[0] * 60 + sTime[1];
      const bookEnd = eTime[0] * 60 + eTime[1];
      return blockStart < bookEnd && blockEnd > bookStart;
    });
  };

  const calculateEndTime = (start, duration) => {
    const [h, m] = start.split(':').map(Number);
    const endMinutes = h * 60 + m + (duration || 0) * 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const toggleEquipment = (id) => {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
    if (!equipmentDetails[id]) {
      setEquipmentDetails(prev => ({ ...prev, [id]: { quantity: 1, selectedOption: null } }));
    }
  };

  const updateEquipmentDetail = (id, field, value) => {
    setEquipmentDetails(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const groupedEquipment = equipment.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const duration = selectedService.duration;
      const endTime = calculateEndTime(selectedStart, duration);
      const eqDetails = selectedEquipment.map(id => ({
        equipmentId: id,
        quantity: equipmentDetails[id]?.quantity || 1,
        selectedOption: equipmentDetails[id]?.selectedOption || null,
      }));
      const res = await bookingAPI.create({
        clientName: clientData.name,
        clientEmail: clientData.email,
        clientPhone: clientData.phone,
        sessionDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedStart + ':00',
        endTime: endTime + ':00',
        duration,
        serviceTypeId: selectedService.id,
        projectDescription: clientData.projectDescription,
        clientNotes: clientData.notes,
        equipmentIds: selectedEquipment,
        equipmentDetails: eqDetails,
      });
      const bookingNumber = res.data.data.booking.bookingNumber;
      toast.success('¡Reserva creada exitosamente!');
      navigate(`/booking/confirmation/${bookingNumber}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return !!selectedService;
    if (step === 2) return selectedDate && selectedStart;
    if (step === 3) return true;
    if (step === 4) return clientData.name && clientData.email && clientData.phone;
    return true;
  };

  const primaryColor = config?.primaryColor || '#3B82F6';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config?.logo
              ? <img src={`http://localhost:5000${config.logo}`} alt="Logo" className="h-10 w-auto object-contain" />
              : <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: primaryColor }}>
                  {(config?.businessName || 'S').charAt(0)}
                </div>
            }
            <div>
              <h1 className="font-bold text-gray-900">{config?.businessName || 'Estudio de Grabación'}</h1>
              <p className="text-xs text-gray-500">Reserva tu sesión online</p>
            </div>
          </div>
          <a href="/booking/check" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Ver mi reserva
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200" />
            {STEPS.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center z-10">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: step >= i + 1 ? primaryColor : '#E5E7EB',
                    color: step >= i + 1 ? 'white' : '#6B7280',
                  }}
                >
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`mt-2 text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PASO 1: Selección de Servicio */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">¿Qué tipo de sesión necesitas?</h2>
              <p className="text-gray-500 mt-2">Selecciona el servicio que mejor se adapta a tu proyecto</p>
            </div>
            {services.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>No hay servicios disponibles en este momento</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service => {
                  const selected = selectedService?.id === service.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className="text-left p-6 rounded-2xl border-2 transition-all hover:shadow-md"
                      style={{
                        borderColor: selected ? primaryColor : '#E5E7EB',
                        background: selected ? `${primaryColor}10` : 'white',
                      }}
                    >
                      {selected && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mb-3"
                          style={{ background: primaryColor }}
                        >
                          ✓
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-500">{service.duration} hora(s)</span>
                        <span className="text-xl font-bold" style={{ color: primaryColor }}>
                          ${parseFloat(service.basePrice).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: Fecha y Hora */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-500">
                Servicio: <strong>{selectedService?.name}</strong> — {selectedService?.duration}h
              </p>
            </div>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Selecciona Fecha y Hora</h2>

            {!useTimeBlocks && (
              <ModernCalendar
                selectedDate={selectedDate}
                onDateSelect={(date) => { setSelectedDate(date); setSelectedStart(''); }}
                availableSlots={availableSlots}
                selectedSlot={selectedStart}
                onSlotSelect={setSelectedStart}
                config={config}
              />
            )}

            {useTimeBlocks && (
              <div className="space-y-4">
                {/* Calendario solo para elegir fecha */}
                <ModernCalendar
                  selectedDate={selectedDate}
                  onDateSelect={(date) => { setSelectedDate(date); setSelectedStart(''); }}
                  availableSlots={[]}
                  selectedSlot=""
                  onSlotSelect={() => {}}
                  config={config}
                  hideSlots={true}
                />
                {/* Bloques */}
                {selectedDate && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Horarios Disponibles</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {configTimeBlocks.map(block => {
                        const available = isBlockAvailable(block.time);
                        const selected = selectedStart === block.time;
                        return (
                          <button
                            key={block.time}
                            onClick={() => available && setSelectedStart(block.time)}
                            disabled={!available}
                            className="py-3 px-4 rounded-xl text-sm font-medium transition-all"
                            style={{
                              background: selected ? primaryColor : available ? '#F9FAFB' : '#FEF2F2',
                              color: selected ? 'white' : available ? '#374151' : '#FCA5A5',
                              cursor: available ? 'pointer' : 'not-allowed',
                              border: `2px solid ${selected ? primaryColor : available ? '#E5E7EB' : '#FECACA'}`,
                            }}
                          >
                            <div className="font-bold">{block.label || block.time}</div>
                            <div className="text-xs mt-1 opacity-75">
                              {available
                                ? `hasta ${calculateEndTime(block.time, selectedService?.duration)}`
                                : 'Ocupado'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedStart && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Horario: <strong>{selectedStart} → {calculateEndTime(selectedStart, selectedService?.duration)}</strong> ({selectedService?.duration}h)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Personalizar Set */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Personaliza tu Set</h2>
              <p className="text-gray-500 mt-1">Selecciona los equipos que necesitas para tu sesión</p>
            </div>
            {Object.keys(groupedEquipment).length === 0 ? (
              <div className="text-center py-12 text-gray-400"><p>No hay equipos configurados aún</p></div>
            ) : (
              Object.entries(groupedEquipment).map(([category, items]) => (
                <div key={category} className="mb-8">
                  <h3 className="font-semibold text-gray-700 mb-3">{CATEGORY_LABELS[category] || category}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(item => {
                      const selected = selectedEquipment.includes(item.id);
                      const detail = equipmentDetails[item.id] || {};
                      const itemOptions = item.options
                        ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options)
                        : null;
                      const optionTypes = itemOptions
                        ? Object.values(itemOptions).flatMap(cat => cat.types || [])
                        : [];

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border-2 overflow-hidden transition-all"
                          style={{
                            borderColor: selected ? primaryColor : '#E5E7EB',
                            background: selected ? `${primaryColor}08` : 'white',
                          }}
                        >
                          <button onClick={() => toggleEquipment(item.id)} className="w-full text-left p-4">
                            {selected && (
                              <div className="float-right w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                style={{ background: primaryColor }}>✓</div>
                            )}
                            {item.image && (
                              <img src={`http://localhost:5000${item.image}`} alt={item.name}
                                className="w-full h-28 object-cover rounded-lg mb-3" />
                            )}
                            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                            {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                            <div className="mt-2">
                              {item.isIncluded
                                ? <span className="text-xs text-green-600 font-medium">✓ Incluido</span>
                                : <span className="text-xs text-orange-600 font-medium">+${item.extraCost}</span>
                              }
                            </div>
                          </button>

                          {selected && (item.allowQuantitySelection || optionTypes.length > 0) && (
                            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                              {item.allowQuantitySelection && (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-600">Cantidad:</span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => updateEquipmentDetail(item.id, 'quantity', Math.max(1, (detail.quantity || 1) - 1))}
                                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-sm font-bold">-</button>
                                    <span className="text-sm font-medium w-6 text-center">{detail.quantity || 1}</span>
                                    <button onClick={() => updateEquipmentDetail(item.id, 'quantity', Math.min(10, (detail.quantity || 1) + 1))}
                                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-sm font-bold">+</button>
                                  </div>
                                </div>
                              )}
                              {optionTypes.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-600 mb-2">Variante:</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {optionTypes.map(opt => (
                                      <button key={opt.id}
                                        onClick={() => updateEquipmentDetail(item.id, 'selectedOption', opt.id)}
                                        className="flex items-center gap-3 p-2 rounded-lg border text-left transition-all"
                                        style={{
                                          borderColor: detail.selectedOption === opt.id ? primaryColor : '#E5E7EB',
                                          background: detail.selectedOption === opt.id ? `${primaryColor}10` : 'white',
                                        }}
                                      >
                                        {opt.image && (
                                          <img src={`http://localhost:5000${opt.image}`} alt={opt.name}
                                            className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-900">{opt.name}</p>
                                          {opt.extraCost > 0 && <p className="text-xs text-orange-500">+${opt.extraCost}</p>}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            {pricing.extras > 0 && (
              <div className="mt-4 p-4 bg-orange-50 rounded-xl text-sm text-orange-700">
                <strong>Extras seleccionados: +${pricing.extras.toFixed(2)}</strong>
              </div>
            )}
          </div>
        )}

        {/* PASO 4: Tus Datos */}
        {step === 4 && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Tus Datos</h2>
              <p className="text-gray-500 mt-1">Necesitamos esta información para confirmar tu reserva</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <label className="label">Nombre Completo *</label>
                <input type="text" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })}
                  className="input-field" placeholder="Tu nombre completo" />
              </div>
              <div>
                <label className="label">Correo Electrónico *</label>
                <input type="email" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })}
                  className="input-field" placeholder="tucorreo@ejemplo.com" />
              </div>
              <div>
                <label className="label">Teléfono *</label>
                <input type="tel" value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                  className="input-field" placeholder="+1 809-000-0000" />
              </div>
              <div>
                <label className="label">Descripción del Proyecto</label>
                <textarea value={clientData.projectDescription} onChange={e => setClientData({ ...clientData, projectDescription: e.target.value })}
                  className="input-field h-24 resize-none" placeholder="Cuéntanos sobre tu proyecto..." />
              </div>
              <div>
                <label className="label">Notas Adicionales</label>
                <textarea value={clientData.notes} onChange={e => setClientData({ ...clientData, notes: e.target.value })}
                  className="input-field h-20 resize-none" placeholder="Requerimientos especiales, preguntas, etc." />
              </div>
            </div>
          </div>
        )}

        {/* PASO 5: Confirmación */}
        {step === 5 && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">✅ Confirma tu Reserva</h2>
              <p className="text-gray-500 mt-1">Revisa los detalles antes de confirmar</p>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">🎬 Servicio</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{selectedService?.name}</p>
                    {selectedService?.description && <p className="text-sm text-gray-500">{selectedService.description}</p>}
                    <p className="text-sm text-gray-500 mt-1">{selectedService?.duration} hora(s)</p>
                  </div>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>
                    ${parseFloat(selectedService?.basePrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">📅 Detalles de la Sesión</h3>
                <div className="space-y-3">
                  <Row label="Fecha" value={selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es }) : ''} />
                  <Row label="Hora" value={`${selectedStart} → ${calculateEndTime(selectedStart, selectedService?.duration)}`} />
                  <Row label="Duración" value={`${selectedService?.duration} hora(s)`} />
                </div>
              </div>

              {selectedEquipment.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">🎬 Equipos Seleccionados</h3>
                  <div className="space-y-2">
                    {selectedEquipment.map(id => {
                      const item = equipment.find(e => e.id === id);
                      if (!item) return null;
                      const detail = equipmentDetails[id] || {};
                      const qty = detail.quantity || 1;
                      let optName = null;
                      if (detail.selectedOption && item.options) {
                        const opts = typeof item.options === 'string' ? JSON.parse(item.options) : item.options;
                        for (const cat of Object.values(opts)) {
                          if (cat.types) {
                            const opt = cat.types.find(t => t.id === detail.selectedOption);
                            if (opt) { optName = opt.name; break; }
                          }
                        }
                      }
                      return (
                        <div key={id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">
                            {qty > 1 ? `${qty}x ` : ''}{item.name}{optName ? ` (${optName})` : ''}
                          </span>
                          <span className={item.isIncluded ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                            {item.isIncluded ? 'Incluido' : `+$${item.extraCost}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">👤 Tus Datos</h3>
                <div className="space-y-3">
                  <Row label="Nombre" value={clientData.name} />
                  <Row label="Email" value={clientData.email} />
                  <Row label="Teléfono" value={clientData.phone} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">💰 Precio</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{selectedService?.name}</span>
                    <span>${pricing.base.toFixed(2)}</span>
                  </div>
                  {pricing.extras > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Equipos adicionales</span>
                      <span>+${pricing.extras.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span style={{ color: primaryColor }}>${pricing.total.toFixed(2)} {config?.currency}</span>
                  </div>
                  {config?.requireDeposit && pricing.deposit > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700 mt-2">
                      💳 Se requiere señal de <strong>${pricing.deposit.toFixed(2)}</strong> para confirmar
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="btn-secondary disabled:invisible"
          >
            ← Anterior
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext()}
              className="btn-primary"
              style={{ background: primaryColor }}
            >
              Siguiente ›
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary px-8"
              style={{ background: primaryColor }}
            >
              {loading ? 'Procesando...' : '🎬 Confirmar Reserva'}
            </button>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-gray-400 mt-8">
        <p>{config?.businessName} · {config?.email} · {config?.phone}</p>
      </footer>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right">{value}</span>
  </div>
);
