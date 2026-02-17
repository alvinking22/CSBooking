import React, { useState, useEffect } from 'react';
import { configAPI } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [config, setConfig] = useState({
    businessName: '', email: '', phone: '', address: '',
    primaryColor: '#3B82F6', secondaryColor: '#1E40AF',
    instagram: '', facebook: '', website: '',
    operatingHours: {},
    minSessionDuration: 1, maxSessionDuration: 8, bufferTime: 30,
    hourlyRate: 50, currency: 'USD', packages: [],
    requireDeposit: false, depositType: 'percentage', depositAmount: 50,
    sendConfirmationEmail: true, sendReminderEmail: true, reminderHoursBefore: 24,
  });
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', price: '' });

  useEffect(() => {
    configAPI.getConfig()
      .then(res => setConfig(res.data.data.config))
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await configAPI.updateConfig(config);
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const set = (field, value) => setConfig(p => ({ ...p, [field]: value }));
  const setHour = (day, field, value) => setConfig(p => ({
    ...p, operatingHours: { ...p.operatingHours, [day]: { ...p.operatingHours[day], [field]: value } }
  }));

  const addPackage = () => {
    if (!newPackage.name || !newPackage.hours || !newPackage.price) { toast.error('Complete todos los campos'); return; }
    setConfig(p => ({ ...p, packages: [...(p.packages||[]), { name: newPackage.name, hours: parseInt(newPackage.hours), price: parseFloat(newPackage.price) }] }));
    setNewPackage({ name: '', hours: '', price: '' });
  };

  const days = [
    { key: 'monday', label: 'Lunes' }, { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' }, { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' }, { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
  ];
  const tabs = [
    { id: 'business', name: 'Negocio' },
    { id: 'hours', name: 'Horarios' },
    { id: 'pricing', name: 'Precios' },
    { id: 'emails', name: 'Emails' },
  ];

  if (loading) return <Loading fullScreen text="Cargando configuración..." />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-1">Personaliza tu estudio y sistema de reservas</p>
        </div>
        <Button variant="primary" onClick={handleSave} loading={saving}>Guardar</Button>
      </div>

      <div className="border-b mb-6 flex space-x-8">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.name}
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="space-y-6">
          <Card title="Información Básica">
            <div className="space-y-4">
              <Input label="Nombre del Estudio" value={config.businessName} onChange={e => set('businessName', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" type="email" value={config.email} onChange={e => set('email', e.target.value)} />
                <Input label="Teléfono" value={config.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea rows="2" value={config.address} onChange={e => set('address', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </Card>
          <Card title="Redes Sociales">
            <div className="space-y-3">
              <Input label="Instagram" value={config.instagram||''} onChange={e => set('instagram', e.target.value)} placeholder="@miestudio" />
              <Input label="Facebook" value={config.facebook||''} onChange={e => set('facebook', e.target.value)} />
              <Input label="Sitio Web" value={config.website||''} onChange={e => set('website', e.target.value)} placeholder="https://..." />
            </div>
          </Card>
          <Card title="Colores de Marca">
            <div className="grid grid-cols-2 gap-6">
              {[['primaryColor','Color Primario'],['secondaryColor','Color Secundario']].map(([k,label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <div className="flex items-center space-x-3">
                    <input type="color" value={config[k]} onChange={e => set(k, e.target.value)}
                      className="h-10 w-20 rounded cursor-pointer border" />
                    <Input value={config[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="space-y-6">
          <Card title="Horarios de Operación">
            <div className="space-y-3">
              {days.map(day => (
                <div key={day.key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-32 flex items-center">
                    <input type="checkbox" checked={config.operatingHours[day.key]?.enabled || false}
                      onChange={e => setHour(day.key, 'enabled', e.target.checked)} className="w-4 h-4 text-primary-600 rounded mr-2" />
                    <span className={`text-sm font-medium ${config.operatingHours[day.key]?.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{day.label}</span>
                  </div>
                  {config.operatingHours[day.key]?.enabled ? (
                    <div className="flex items-center space-x-2">
                      <input type="time" value={config.operatingHours[day.key]?.open || '09:00'}
                        onChange={e => setHour(day.key, 'open', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <span className="text-gray-400">–</span>
                      <input type="time" value={config.operatingHours[day.key]?.close || '18:00'}
                        onChange={e => setHour(day.key, 'close', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  ) : <span className="text-gray-400 text-sm">Cerrado</span>}
                </div>
              ))}
            </div>
          </Card>
          <Card title="Configuración de Sesiones">
            <div className="grid grid-cols-3 gap-4">
              <Input label="Mínimo (horas)" type="number" min="1" value={config.minSessionDuration} onChange={e => set('minSessionDuration', parseInt(e.target.value))} />
              <Input label="Máximo (horas)" type="number" min="1" value={config.maxSessionDuration} onChange={e => set('maxSessionDuration', parseInt(e.target.value))} />
              <Input label="Buffer (minutos)" type="number" min="0" value={config.bufferTime} onChange={e => set('bufferTime', parseInt(e.target.value))} helperText="Entre sesiones" />
            </div>
          </Card>

          <Card title="Bloques de Horario Fijos">
            <p className="text-sm text-gray-500 mb-4">
              Si está activado, los clientes solo pueden reservar en los bloques de horario definidos, en vez de elegir hora libremente.
            </p>
            <div className="flex items-center gap-3 mb-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.useTimeBlocks || false}
                  onChange={e => set('useTimeBlocks', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">Usar bloques de horario fijos</span>
              </label>
            </div>

            {config.useTimeBlocks && (
              <div>
                <div className="space-y-3 mb-4">
                  {(config.timeBlocks || []).map((block, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="time"
                        value={block.time}
                        onChange={e => {
                          const blocks = [...(config.timeBlocks || [])];
                          blocks[i] = { ...blocks[i], time: e.target.value };
                          set('timeBlocks', blocks);
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="text"
                        value={block.label || ''}
                        placeholder="Etiqueta (ej: Mañana)"
                        onChange={e => {
                          const blocks = [...(config.timeBlocks || [])];
                          blocks[i] = { ...blocks[i], label: e.target.value };
                          set('timeBlocks', blocks);
                        }}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={() => set('timeBlocks', (config.timeBlocks || []).filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => set('timeBlocks', [...(config.timeBlocks || []), { time: '09:00', label: 'Nuevo bloque' }])}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Agregar bloque
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <Card title="Precio Base">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Precio por Hora" type="number" min="0" step="0.01" value={config.hourlyRate} onChange={e => set('hourlyRate', parseFloat(e.target.value))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select value={config.currency} onChange={e => set('currency', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="USD">USD - Dólar</option>
                  <option value="DOP">DOP - Peso Dominicano</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </Card>
          <Card title="Paquetes">
            {(config.packages||[]).map((pkg, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
                <div><p className="font-medium">{pkg.name}</p><p className="text-sm text-gray-500">{pkg.hours}h · ${pkg.price}</p></div>
                <button onClick={() => setConfig(p => ({...p, packages: p.packages.filter((_,j) => j!==i)}))} className="text-red-500 hover:text-red-700 text-sm">Eliminar</button>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-3 mt-4 border-t pt-4">
              <Input placeholder="Nombre" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
              <Input type="number" placeholder="Horas" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
              <Input type="number" placeholder="Precio" value={newPackage.price} onChange={e => setNewPackage({...newPackage, price: e.target.value})} />
              <Button variant="primary" onClick={addPackage}>Agregar</Button>
            </div>
          </Card>
          <Card title="Depósito / Señal">
            <div className="space-y-4">
              <div className="flex items-center">
                <input type="checkbox" id="dep" checked={config.requireDeposit} onChange={e => set('requireDeposit', e.target.checked)} className="w-4 h-4 text-primary-600 rounded mr-2" />
                <label htmlFor="dep" className="text-sm text-gray-700">Requerir depósito para confirmar reserva</label>
              </div>
              {config.requireDeposit && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={config.depositType} onChange={e => set('depositType', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo</option>
                    </select>
                  </div>
                  <Input label={config.depositType === 'percentage' ? 'Porcentaje' : 'Monto'} type="number" min="0"
                    value={config.depositAmount} onChange={e => set('depositAmount', parseFloat(e.target.value))} />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'emails' && (
        <Card title="Emails Automáticos">
          <div className="space-y-4">
            {[
              { key: 'sendConfirmationEmail', label: 'Email de Confirmación', desc: 'Se envía al crear una reserva' },
              { key: 'sendReminderEmail', label: 'Email de Recordatorio', desc: 'Se envía antes de la sesión' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={config[item.key]} onChange={e => set(item.key, e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
            {config.sendReminderEmail && (
              <Input label="Horas de anticipación para el recordatorio" type="number" min="1"
                value={config.reminderHoursBefore} onChange={e => set('reminderHoursBefore', parseInt(e.target.value))} />
            )}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              ℹ️ La configuración SMTP (servidor de correo) se configura en el archivo <code>.env</code> del servidor.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
