import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { bookingAPI, equipmentAPI, configAPI } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const NewBooking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [allEquipment, setAllEquipment] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableHours, setAvailableHours] = useState([]);
  const [selectedStart, setSelectedStart] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [pricing, setPricing] = useState({ base: 0, equipment: 0, total: 0 });
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    contentType: 'podcast', projectDescription: '', clientNotes: '',
  });

  const contentTypes = [
    { value: 'podcast', label: 'Podcast' }, { value: 'youtube', label: 'YouTube' },
    { value: 'social_media', label: 'Redes Sociales' }, { value: 'interview', label: 'Entrevista' },
    { value: 'other', label: 'Otro' },
  ];

  const equipmentCategories = {
    cameras: 'Cámaras', microphones: 'Micrófonos', lights: 'Luces',
    backgrounds: 'Fondos', audio: 'Audio', accessories: 'Accesorios',
    furniture: 'Mobiliario', other: 'Otros',
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [configRes, equipRes] = await Promise.all([
          configAPI.getPublicConfig(),
          equipmentAPI.getAll({ isActive: true }),
        ]);
        setConfig(configRes.data.data.config);
        setAllEquipment(equipRes.data.data.equipment);
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
    if (!config || !selectedDuration) return;
    const base = parseFloat(config.hourlyRate) * selectedDuration;
    const eqCost = allEquipment
      .filter(e => selectedEquipment.includes(e.id) && !e.isIncluded)
      .reduce((s, e) => s + parseFloat(e.extraCost), 0);
    setPricing({ base, equipment: eqCost, total: base + eqCost });
  }, [selectedDuration, selectedEquipment, config]);

  const isDateDisabled = ({ date }) => {
    const today = new Date(); today.setHours(0,0,0,0);
    if (date < today) return true;
    const dayMap = { 0:'sunday',1:'monday',2:'tuesday',3:'wednesday',4:'thursday',5:'friday',6:'saturday' };
    return !config?.operatingHours?.[dayMap[date.getDay()]]?.enabled;
  };

  const toggleEquipment = (id) => setSelectedEquipment(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);

  const handleSubmit = async () => {
    const startH = parseInt(selectedStart);
    const endH = startH + selectedDuration;
    setSaving(true);
    try {
      const res = await bookingAPI.create({
        ...formData,
        sessionDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: `${String(startH).padStart(2,'0')}:00:00`,
        endTime: `${String(endH).padStart(2,'0')}:00:00`,
        duration: selectedDuration,
        equipmentIds: selectedEquipment,
      });
      toast.success('Reserva creada');
      navigate(`/admin/bookings/${res.data.data.booking.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear reserva');
    } finally { setSaving(false); }
  };

  const canProceed = () => {
    if (step === 1) return selectedDate && selectedStart && selectedDuration;
    if (step === 3) return formData.clientName && formData.clientEmail && formData.clientPhone;
    return true;
  };

  const steps = ['Fecha y Hora', 'Equipos', 'Cliente', 'Confirmar'];
  const endTimeStr = selectedStart ? `${String(parseInt(selectedStart) + selectedDuration).padStart(2,'0')}:00` : '';
  const grouped = allEquipment.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) return <Loading fullScreen text="Cargando..." />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => navigate('/admin/bookings')} className="text-gray-500 hover:text-gray-700">
          ←
        </button>
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

      {/* Step 1: Date & Time */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Selecciona la Fecha">
            <Calendar onChange={setSelectedDate} value={selectedDate} tileDisabled={isDateDisabled}
              minDate={new Date()} maxDate={addMonths(new Date(), 3)} locale="es-ES" />
          </Card>
          {selectedDate && (
            <Card title={`Horarios - ${format(selectedDate, 'PPP', { locale: es })}`}>
              {availableHours.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay horarios disponibles</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
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
                  {selectedStart && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Duración:</p>
                      <div className="flex flex-wrap gap-2">
                        {[1,2,3,4,5,6,7,8].map(h => {
                          const end = parseInt(selectedStart) + h;
                          const close = availableHours.length ? parseInt(availableHours[availableHours.length-1].time)+1 : 24;
                          const valid = h >= (config?.minSessionDuration||1) && h <= (config?.maxSessionDuration||8) && end <= close;
                          return (
                            <button key={h} disabled={!valid} onClick={() => setSelectedDuration(h)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                selectedDuration === h ? 'bg-primary-600 text-white' :
                                valid ? 'bg-gray-100 hover:bg-primary-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              }`}>
                              {h}h
                            </button>
                          );
                        })}
                      </div>
                      {pricing.total > 0 && (
                        <div className="mt-4 p-3 bg-primary-50 rounded-lg text-sm">
                          <div className="flex justify-between">
                            <span className="text-primary-700">{selectedStart} – {endTimeStr} ({selectedDuration}h)</span>
                            <span className="font-bold text-primary-700">${pricing.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Equipment */}
      {step === 2 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat} title={equipmentCategories[cat]}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(item => {
                  const sel = selectedEquipment.includes(item.id);
                  return (
                    <button key={item.id} onClick={() => toggleEquipment(item.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 text-left ${
                        sel ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                        <p className={`text-xs font-semibold mt-1 ${item.isIncluded ? 'text-green-600' : 'text-orange-500'}`}>
                          {item.isIncluded ? '✓ Incluido' : `+$${parseFloat(item.extraCost).toFixed(2)}`}
                        </p>
                      </div>
                      {sel && <span className="text-primary-600 flex-shrink-0 text-lg">✓</span>}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Step 3: Client Info */}
      {step === 3 && (
        <Card title="Información del Cliente">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre Completo" required value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Juan Pérez" />
              <Input label="Email" type="email" required value={formData.clientEmail}
                onChange={e => setFormData({...formData, clientEmail: e.target.value})} placeholder="juan@email.com" />
              <Input label="Teléfono" required value={formData.clientPhone}
                onChange={e => setFormData({...formData, clientPhone: e.target.value})} placeholder="+1 809-555-0100" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contenido</label>
                <select value={formData.contentType} onChange={e => setFormData({...formData, contentType: e.target.value})}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
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

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Resumen">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Fecha y Hora</p>
                <p className="font-semibold">{format(selectedDate, 'PPP', { locale: es })}</p>
                <p className="text-sm text-gray-600">{selectedStart} – {endTimeStr} ({selectedDuration}h)</p>
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
                    {allEquipment.filter(e => selectedEquipment.includes(e.id)).map(e => (
                      <span key={e.id} className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">{e.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card title="Precio">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base ({selectedDuration}h × ${config?.hourlyRate})</span>
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

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => step === 1 ? navigate('/admin/bookings') : setStep(step - 1)}>
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        {step < 4 ? (
          <Button variant="primary" disabled={!canProceed()} onClick={() => setStep(step + 1)}>Siguiente</Button>
        ) : (
          <Button variant="success" loading={saving} onClick={handleSubmit}>Crear Reserva</Button>
        )}
      </div>
    </div>
  );
};

export default NewBooking;
