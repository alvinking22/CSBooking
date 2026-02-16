import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiCheck } from 'react-icons/hi';
import { configAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

const SetupWizard = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [businessData, setBusinessData] = useState({
    businessName: '', email: '', phone: '', address: '',
    primaryColor: '#3B82F6', secondaryColor: '#1E40AF',
  });
  const [hoursData, setHoursData] = useState({
    monday: { enabled: true, open: '09:00', close: '18:00' },
    tuesday: { enabled: true, open: '09:00', close: '18:00' },
    wednesday: { enabled: true, open: '09:00', close: '18:00' },
    thursday: { enabled: true, open: '09:00', close: '18:00' },
    friday: { enabled: true, open: '09:00', close: '18:00' },
    saturday: { enabled: false, open: '10:00', close: '14:00' },
    sunday: { enabled: false, open: '10:00', close: '14:00' },
  });
  const [pricingData, setPricingData] = useState({
    hourlyRate: 50, currency: 'USD',
    requireDeposit: false, depositType: 'percentage', depositAmount: 50,
    minSessionDuration: 1, maxSessionDuration: 8, bufferTime: 30,
  });

  const days = [
    { key: 'monday', label: 'Lunes' }, { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' }, { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' }, { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
  ];

  const steps = [
    { title: 'Administrador', desc: 'Crea tu cuenta' },
    { title: 'Tu Negocio', desc: 'Información básica' },
    { title: 'Horarios', desc: 'Cuándo estás disponible' },
    { title: 'Precios', desc: 'Configura tus tarifas' },
    { title: '¡Listo!', desc: 'Empieza a recibir reservas' },
  ];

  const handleCreateAdmin = async () => {
    if (adminData.password !== adminData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (adminData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      await authAPI.register({
        email: adminData.email,
        password: adminData.password,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
      });
      await login(adminData.email, adminData.password);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear cuenta');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      await configAPI.updateConfig({
        ...businessData,
        email: businessData.email || adminData.email,
      });
      setStep(3);
    } catch (e) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      await configAPI.updateOperatingHours({ operatingHours: hoursData });
      setStep(4);
    } catch (e) {
      toast.error('Error al guardar horarios');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      await configAPI.updatePricing(pricingData);
      await configAPI.completeSetup();
      setStep(5);
    } catch (e) {
      toast.error('Error al guardar precios');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return adminData.firstName && adminData.lastName && adminData.email && adminData.password && adminData.confirmPassword;
    if (step === 2) return businessData.businessName && businessData.email;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">CS Booking</h1>
          <p className="text-gray-600 mt-2">Configura tu sistema de reservas en minutos</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all ${
                i + 1 < step ? 'bg-green-500 text-white' :
                i + 1 === step ? 'bg-primary-600 text-white scale-110' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i + 1 < step ? <HiCheck className="w-5 h-5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1 transition-all ${i + 1 < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{steps[step - 1].title}</h2>
          <p className="text-gray-500 mb-6">{steps[step - 1].desc}</p>

          {/* Step 1: Admin Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" required value={adminData.firstName}
                  onChange={e => setAdminData({ ...adminData, firstName: e.target.value })}
                  placeholder="Juan" />
                <Input label="Apellido" required value={adminData.lastName}
                  onChange={e => setAdminData({ ...adminData, lastName: e.target.value })}
                  placeholder="Pérez" />
              </div>
              <Input label="Email" type="email" required value={adminData.email}
                onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                placeholder="admin@tuestudio.com" />
              <Input label="Contraseña" type="password" required value={adminData.password}
                onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                helperText="Mínimo 8 caracteres" />
              <Input label="Confirmar Contraseña" type="password" required value={adminData.confirmPassword}
                onChange={e => setAdminData({ ...adminData, confirmPassword: e.target.value })} />
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <div className="space-y-4">
              <Input label="Nombre del Estudio" required value={businessData.businessName}
                onChange={e => setBusinessData({ ...businessData, businessName: e.target.value })}
                placeholder="CS Booking" />
              <Input label="Email de Contacto" type="email" required value={businessData.email}
                onChange={e => setBusinessData({ ...businessData, email: e.target.value })}
                placeholder="info@tuestudio.com" />
              <Input label="Teléfono" value={businessData.phone}
                onChange={e => setBusinessData({ ...businessData, phone: e.target.value })}
                placeholder="+1 809-555-0100" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea rows="2" value={businessData.address}
                  onChange={e => setBusinessData({ ...businessData, address: e.target.value })}
                  placeholder="Calle Principal #123, Ciudad"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Primario</label>
                  <div className="flex items-center space-x-3">
                    <input type="color" value={businessData.primaryColor}
                      onChange={e => setBusinessData({ ...businessData, primaryColor: e.target.value })}
                      className="h-10 w-16 rounded border cursor-pointer" />
                    <span className="text-sm text-gray-600">{businessData.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Secundario</label>
                  <div className="flex items-center space-x-3">
                    <input type="color" value={businessData.secondaryColor}
                      onChange={e => setBusinessData({ ...businessData, secondaryColor: e.target.value })}
                      className="h-10 w-16 rounded border cursor-pointer" />
                    <span className="text-sm text-gray-600">{businessData.secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Hours */}
          {step === 3 && (
            <div className="space-y-3">
              {days.map(day => (
                <div key={day.key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-28 flex items-center">
                    <input type="checkbox" checked={hoursData[day.key].enabled}
                      onChange={e => setHoursData(p => ({ ...p, [day.key]: { ...p[day.key], enabled: e.target.checked } }))}
                      className="w-4 h-4 text-primary-600 rounded mr-2" />
                    <span className={`text-sm font-medium ${hoursData[day.key].enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day.label}
                    </span>
                  </div>
                  {hoursData[day.key].enabled && (
                    <div className="flex items-center space-x-2 flex-1">
                      <input type="time" value={hoursData[day.key].open}
                        onChange={e => setHoursData(p => ({ ...p, [day.key]: { ...p[day.key], open: e.target.value } }))}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <span className="text-gray-400">–</span>
                      <input type="time" value={hoursData[day.key].close}
                        onChange={e => setHoursData(p => ({ ...p, [day.key]: { ...p[day.key], close: e.target.value } }))}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  )}
                  {!hoursData[day.key].enabled && <span className="text-gray-400 text-sm">Cerrado</span>}
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Pricing */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Precio por Hora" type="number" min="0" step="0.01"
                  value={pricingData.hourlyRate}
                  onChange={e => setPricingData({ ...pricingData, hourlyRate: parseFloat(e.target.value) })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select value={pricingData.currency}
                    onChange={e => setPricingData({ ...pricingData, currency: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="USD">USD - Dólar</option>
                    <option value="DOP">DOP - Peso Dominicano</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Mín. horas" type="number" min="1"
                  value={pricingData.minSessionDuration}
                  onChange={e => setPricingData({ ...pricingData, minSessionDuration: parseInt(e.target.value) })} />
                <Input label="Máx. horas" type="number" min="1"
                  value={pricingData.maxSessionDuration}
                  onChange={e => setPricingData({ ...pricingData, maxSessionDuration: parseInt(e.target.value) })} />
                <Input label="Buffer (min)" type="number" min="0"
                  value={pricingData.bufferTime}
                  onChange={e => setPricingData({ ...pricingData, bufferTime: parseInt(e.target.value) })}
                  helperText="Entre sesiones" />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center mb-3">
                  <input type="checkbox" id="deposit" checked={pricingData.requireDeposit}
                    onChange={e => setPricingData({ ...pricingData, requireDeposit: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded mr-2" />
                  <label htmlFor="deposit" className="text-sm font-medium text-gray-900">
                    Requerir señal/depósito para confirmar
                  </label>
                </div>
                {pricingData.requireDeposit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                      <select value={pricingData.depositType}
                        onChange={e => setPricingData({ ...pricingData, depositType: e.target.value })}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Monto Fijo</option>
                      </select>
                    </div>
                    <Input label={pricingData.depositType === 'percentage' ? 'Porcentaje' : 'Monto'} type="number" min="0"
                      value={pricingData.depositAmount}
                      onChange={e => setPricingData({ ...pricingData, depositAmount: parseFloat(e.target.value) })} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <HiCheck className="w-14 h-14 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">¡Todo listo!</h3>
              <p className="text-gray-600 mb-8">
                Tu sistema de reservas está configurado. Ahora puedes agregar equipos y empezar a recibir reservas.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary-50 rounded-xl text-left">
                  <p className="font-semibold text-primary-800 mb-1">🎬 Próximos pasos</p>
                  <ul className="text-sm text-primary-700 space-y-1">
                    <li>• Agregar equipos disponibles</li>
                    <li>• Compartir tu link de reservas</li>
                    <li>• Configurar email de notificaciones</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-left">
                  <p className="font-semibold text-green-800 mb-1">✅ Configurado</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Cuenta de administrador</li>
                    <li>• Información del negocio</li>
                    <li>• Horarios de operación</li>
                    <li>• Precios y política de depósito</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            {step > 1 && step < 5 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>← Atrás</Button>
            ) : <div />}

            {step === 1 && (
              <Button variant="primary" disabled={!canProceed()} loading={saving} onClick={handleCreateAdmin}>
                Crear Cuenta
              </Button>
            )}
            {step === 2 && (
              <Button variant="primary" disabled={!canProceed()} loading={saving} onClick={handleSaveBusiness}>
                Guardar y Continuar
              </Button>
            )}
            {step === 3 && (
              <Button variant="primary" loading={saving} onClick={handleSaveHours}>
                Guardar Horarios
              </Button>
            )}
            {step === 4 && (
              <Button variant="success" loading={saving} onClick={handleSavePricing}>
                Finalizar Configuración
              </Button>
            )}
            {step === 5 && (
              <Button variant="primary" onClick={() => navigate('/admin/equipment')}>
                Ir al Panel →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
