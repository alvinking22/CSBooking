import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { bookingAPI, equipmentAPI, configAPI, serviceAPI } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConfig } from '../contexts/ConfigContext';

const NewBooking = () => {
  const navigate = useNavigate();
  const { config: globalConfig } = useConfig();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [allEquipment, setAllEquipment] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableHours, setAvailableHours] = useState([]);
  const [selectedStart, setSelectedStart] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [equipmentDetails, setEquipmentDetails] = useState({});
  const [pricing, setPricing] = useState({ base: 0, equipment: 0, total: 0 });
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    projectDescription: '', clientNotes: '',
  });

  const useTimeBlocks = config?.useTimeBlocks || false;
  const configTimeBlocks = config?.timeBlocks
    ? (typeof config.timeBlocks === 'string' ? JSON.parse(config.timeBlocks) : config.timeBlocks)
    : [
        { time: '10:00', label: 'Mañana (10am)' },
        { time: '15:00', label: 'Tarde (3pm)' },
        { time: '17:00', label: 'Tarde-Noche (5pm)' },
        { time: '19:00', label: 'Noche (7pm)' },
      ];

  const equipmentCategories = {
    cameras: 'Cámaras', microphones: 'Micrófonos', lights: 'Luces',
    backgrounds: 'Fondos', audio: 'Audio', accessories: 'Accesorios',
    furniture: 'Mobiliario', other: 'Otros',
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [configRes, equipRes, servicesRes] = await Promise.all([
          configAPI.getPublicConfig(),
          equipmentAPI.getAll({ isActive: true }),
          serviceAPI.getAll(),
        ]);
        setConfig(configRes.data.data.config);
        setAllEquipment(equipRes.data.data.equipment);
        setServices(servicesRes.data.data.services);
      } catch { toast.error('Error al cargar datos'); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedDate || !config) return;
    const fetchSlots = async () => {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await bookingAPI.getCalendar({ startDate: dateStr, endDate: dateStr });
        const booked = res.data.data.bookings;
        const dayMap = { 0:'sunday',1:'monday',2:'tuesday',3:'wednesday',4:'thursday',5:'friday',6:'saturday' };
        const dayConf = config.operatingHours?.[dayMap[selectedDate.getDay()]];
        if (!dayConf?.enabled) { setAvailableHours([]); return; }
        const [openH] = dayConf.open.split(':').map(Number);
        const [closeH] = dayConf.close.split(':').map(Number);
        const hours = [];
        for (let h = openH; h < closeH; h++) {
          const t = `${String(h).padStart(2,'0')}:00`;
          const occupied = booked.some(b => {
            const s = parseInt(b.startTime.substring(0,2));
            const e = parseInt(b.endTime.substring(0,2));
            return h >= s && h < e;
          });
          hours.push({ time: t, available: !occupied });
        }
        setAvailableHours(hours);
        setSelectedStart('');
      } catch {}
    };
    fetchSlots();
  }, [selectedDate, config]);

  useEffect(() => {
    if (!selectedService) return;
    const base = parseFloat(selectedService.basePrice);
    const eqCost = allEquipment
      .filter(e => selectedEquipment.includes(e.id) && !e.isIncluded)
      .reduce((s, e) => s + parseFloat(e.extraCost), 0);
    setPricing({ base, equipment: eqCost, total: base + eqCost });
  }, [selectedService, selectedEquipment]);

  const isDateDisabled = ({ date }) => {
    const today = new Date(); today.setHours(0,0,0,0);
    if (date < today) return true;
    const dayMap = { 0:'sunday',1:'monday',2:'tuesday',3:'wednesday',4:'thursday',5:'friday',6:'saturday' };
    return !config?.operatingHours?.[dayMap[date.getDay()]]?.enabled;
  };

  const isBlockAvailable = (blockTime) => {
    if (!selectedService || !availableHours.length) return false;
    const duration = selectedService.duration;
    const [bH] = blockTime.split(':').map(Number);
    for (let h = bH; h < bH + duration; h++) {
      const timeStr = `${String(h).padStart(2,'0')}:00`;
      const slot = availableHours.find(s => s.time === timeStr);
      if (!slot || !slot.available) return false;
    }
    return true;
  };

  const calculateEndTime = (start, duration) => {
    const [h] = start.split(':').map(Number);
    return `${String(h + (duration || 0)).padStart(2,'0')}:00`;
  };

  const toggleEquipment = (id) => setSelectedEquipment(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);
  const updateEquipmentDetail = (id, field, value) => {
    setEquipmentDetails(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const handleSubmit = async () => {
    const duration = selectedService.duration;
    const startH = parseInt(selectedStart);
    const endH = startH + duration;
    setSaving(true);
    try {
      const eqDetails = selectedEquipment.map(id => ({
        equipmentId: id,
        quantity: equipmentDetails[id]?.quantity || 1,
        selectedOption: equipmentDetails[id]?.selectedOption || null,
      }));
      const res = await bookingAPI.create({
        ...formData,
        sessionDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: `${String(startH).padStart(2,'0')}:00:00`,
        endTime: `${String(endH).padStart(2,'0')}:00:00`,
        duration,
        serviceTypeId: selectedService.id,
        equipmentIds: selectedEquipment,
        equipmentDetails: eqDetails,
      });
      toast.success('Reserva creada');
      navigate(`/admin/bookings/${res.data.data.booking.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear reserva');
    } finally { setSaving(false); }
  };

  const canProceed = () => {
    if (step === 1) return !!selectedService;
    if (step === 2) return selectedDate && selectedStart;
    if (step === 4) return formData.clientName && formData.clientEmail && formData.clientPhone;
    return true;
  };

  const steps = ['Servicio', 'Fecha y Hora', 'Equipos', 'Cliente', 'Confirmar'];
  const duration = selectedService?.duration || 0;
  const endTimeStr = selectedStart ? calculateEndTime(selectedStart, duration) : '';
  const grouped = allEquipment.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
  const pc = globalConfig?.primaryColor || '#3B82F6';

  if (loading) return <Loading fullScreen text="Cargando..." />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => navigate('/admin/bookings')} className="text-gray-500 hover:text-gray-700">←</button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Reserva</h1>
          <p className="text-gray-600">Paso {step} de {steps.length}: {steps[step-1]}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              i+1 < step ? 'bg-green-500 text-white' : i+1 === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i+1 < step ? '✓' : i+1}
            </div>
            <span className={`ml-2 text-sm font-medium ${i+1===step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
            {i < steps.length-1 && <div className={`flex-1 h-1 mx-3 ${i+1 < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* PASO 1: Servicio */}
      {step === 1 && (
        <Card title="Selecciona el Tipo de Servicio">
          {services.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay servicios configurados. Ve a Servicios para crear uno.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(service => {
                const selected = selectedService?.id === service.id;
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className="text-left p-5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selected ? pc : '#E5E7EB',
                      background: selected ? `${pc}10` : 'white',
                    }}
                  >
                    <h3 className="font-bold text-gray-900">{service.name}</h3>
                    {service.description && <p className="text-sm text-gray-500 mt-1">{service.description}</p>}
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-gray-500">{service.duration}h</span>
                      <span className="font-bold text-lg" style={{ color: pc }}>
                        ${parseFloat(service.basePrice).toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* PASO 2: Fecha y Hora */}
      {step === 2 && (
        <div className="space-y-4">
          {selectedService && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              Servicio: <strong>{selectedService.name}</strong> — {selectedService.duration}h — ${parseFloat(selectedService.basePrice).toFixed(2)}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Selecciona la Fecha">
              <Calendar onChange={(date) => { setSelectedDate(date); setSelectedStart(''); }}
                value={selectedDate} tileDisabled={isDateDisabled}
                minDate={new Date()} maxDate={addMonths(new Date(), 3)} locale="es-ES" />
            </Card>

            {selectedDate && (
              <Card title={`Horarios - ${format(selectedDate, 'PPP', { locale: es })}`}>
                {!useTimeBlocks ? (
                  availableHours.length === 0 ? (
                    <div className="text-center py-8 text-gray-500"><p>No hay horarios disponibles</p></div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableHours.map(({ time, available }) => (
                        <button key={time} disabled={!available} onClick={() => setSelectedStart(time)}
                          className={`p-3 rounded-lg text-sm font-medium ${
                            selectedStart === time ? 'bg-primary-600 text-white' :
                            available ? 'bg-gray-100 hover:bg-primary-100' : 'bg-red-50 text-red-200 cursor-not-allowed line-through'
                          }`}>
                          {time}
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">Bloques para {selectedService?.duration}h:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {configTimeBlocks.map(block => {
                        const available = isBlockAvailable(block.time);
                        const selected = selectedStart === block.time;
                        return (
                          <button key={block.time} disabled={!available}
                            onClick={() => available && setSelectedStart(block.time)}
                            className={`p-3 rounded-xl text-sm font-medium border-2 ${
                              selected ? 'bg-primary-600 text-white border-primary-600' :
                              available ? 'bg-gray-50 border-gray-200 hover:border-primary-300' :
                              'bg-red-50 text-red-300 border-red-100 cursor-not-allowed'
                            }`}>
                            <div className="font-bold">{block.label || block.time}</div>
                            <div className="text-xs opacity-75">
                              {available ? `hasta ${calculateEndTime(block.time, selectedService?.duration)}` : 'Ocupado'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedStart && (
                  <div className="mt-4 p-3 bg-primary-50 rounded-lg text-sm">
                    <span className="text-primary-700 font-medium">
                      {selectedStart} – {endTimeStr} ({duration}h) · ${pricing.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* PASO 3: Equipos */}
      {step === 3 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat} title={equipmentCategories[cat] || cat}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(item => {
                  const sel = selectedEquipment.includes(item.id);
                  const detail = equipmentDetails[item.id] || {};
                  const itemOptions = item.options
                    ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options)
                    : null;
                  const optionTypes = itemOptions
                    ? Object.values(itemOptions).flatMap(c => c.types || [])
                    : [];
                  return (
                    <div key={item.id}
                      className={`rounded-xl border-2 overflow-hidden ${sel ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                      <button onClick={() => toggleEquipment(item.id)} className="w-full flex items-center justify-between p-4 text-left">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                          <p className={`text-xs font-semibold mt-1 ${item.isIncluded ? 'text-green-600' : 'text-orange-500'}`}>
                            {item.isIncluded ? '✓ Incluido' : `+$${parseFloat(item.extraCost).toFixed(2)}`}
                          </p>
                        </div>
                        {sel && <span className="text-primary-600 text-lg">✓</span>}
                      </button>
                      {sel && (item.allowQuantitySelection || optionTypes.length > 0) && (
                        <div className="px-4 pb-4 space-y-3 border-t border-primary-100 pt-3">
                          {item.allowQuantitySelection && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-600">Cantidad:</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateEquipmentDetail(item.id, 'quantity', Math.max(1, (detail.quantity||1)-1))}
                                  className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">-</button>
                                <span className="text-sm font-medium w-6 text-center">{detail.quantity||1}</span>
                                <button onClick={() => updateEquipmentDetail(item.id, 'quantity', Math.min(10, (detail.quantity||1)+1))}
                                  className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">+</button>
                              </div>
                            </div>
                          )}
                          {optionTypes.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-600 mb-2">Variante:</p>
                              <div className="space-y-1">
                                {optionTypes.map(opt => (
                                  <button key={opt.id}
                                    onClick={() => updateEquipmentDetail(item.id, 'selectedOption', opt.id)}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left text-xs ${
                                      detail.selectedOption === opt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                                    }`}>
                                    {opt.image && <img src={`http://localhost:5000${opt.image}`} alt={opt.name} className="w-8 h-8 object-cover rounded" />}
                                    <span className="font-medium">{opt.name}</span>
                                    {opt.extraCost > 0 && <span className="text-orange-500 ml-auto">+${opt.extraCost}</span>}
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
            </Card>
          ))}
        </div>
      )}

      {/* PASO 4: Cliente */}
      {step === 4 && (
        <Card title="Información del Cliente">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre Completo" required value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Juan Pérez" />
              <Input label="Email" type="email" required value={formData.clientEmail}
                onChange={e => setFormData({...formData, clientEmail: e.target.value})} placeholder="juan@email.com" />
              <Input label="Teléfono" required value={formData.clientPhone}
                onChange={e => setFormData({...formData, clientPhone: e.target.value})} placeholder="+1 809-555-0100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del Proyecto</label>
              <textarea rows="3" value={formData.projectDescription}
                onChange={e => setFormData({...formData, projectDescription: e.target.value})}
                placeholder="Descripción del proyecto..."
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas del Cliente</label>
              <textarea rows="2" value={formData.clientNotes}
                onChange={e => setFormData({...formData, clientNotes: e.target.value})}
                placeholder="Requerimientos especiales..."
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </Card>
      )}

      {/* PASO 5: Confirmar */}
      {step === 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Resumen">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Servicio</p>
                <p className="font-semibold">{selectedService?.name}</p>
                <p className="text-sm text-gray-600">{selectedService?.duration}h · ${parseFloat(selectedService?.basePrice||0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Fecha y Hora</p>
                <p className="font-semibold">{selectedDate && format(selectedDate, 'PPP', { locale: es })}</p>
                <p className="text-sm text-gray-600">{selectedStart} – {endTimeStr} ({duration}h)</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <p className="font-semibold">{formData.clientName}</p>
                <p className="text-sm text-gray-600">{formData.clientEmail}</p>
                <p className="text-sm text-gray-600">{formData.clientPhone}</p>
              </div>
              {selectedEquipment.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">Equipos</p>
                  <div className="flex flex-wrap gap-2">
                    {allEquipment.filter(e => selectedEquipment.includes(e.id)).map(e => {
                      const detail = equipmentDetails[e.id] || {};
                      const qty = detail.quantity || 1;
                      let optName = null;
                      if (detail.selectedOption && e.options) {
                        const opts = typeof e.options === 'string' ? JSON.parse(e.options) : e.options;
                        for (const cat of Object.values(opts)) {
                          if (cat.types) { const opt = cat.types.find(t => t.id === detail.selectedOption); if (opt) { optName = opt.name; break; } }
                        }
                      }
                      return (
                        <span key={e.id} className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                          {qty > 1 ? `${qty}x ` : ''}{e.name}{optName ? ` (${optName})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card title="Precio">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{selectedService?.name}</span>
                <span>${pricing.base.toFixed(2)}</span>
              </div>
              {pricing.equipment > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Equipos extras</span>
                  <span>${pricing.equipment.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl border-t pt-3">
                <span>Total</span>
                <span className="text-primary-600">{config?.currency} ${pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Navegación */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => step === 1 ? navigate('/admin/bookings') : setStep(step - 1)}>
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {step < 5 ? (
          <Button variant="primary" disabled={!canProceed()} onClick={() => setStep(step + 1)}>Siguiente</Button>
        ) : (
          <Button variant="success" loading={saving} onClick={handleSubmit}>Crear Reserva</Button>
        )}
      </div>
    </div>
  );
};

export default NewBooking;
