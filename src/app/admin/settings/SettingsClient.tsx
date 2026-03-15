"use client";

import { useState } from "react";
import { updateConfig } from "@/actions/config";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConfig } from "@/contexts/ConfigContext";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Copy } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Lunes" }, { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" }, { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" }, { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

const formatHourAMPM = (h24: string) => {
  const h = parseInt(h24.split(":")[0]);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12} ${period}`;
};

interface Config {
  businessName: string; email: string; phone: string; address: string;
  primaryColor: string; instagram: string; facebook: string; website: string;
  currency: string; bufferTime: number; minAdvanceHours: number;
  requireDeposit: boolean; depositType: string; depositAmount: unknown;
  sendConfirmationEmail: boolean; sendReminderEmail: boolean; reminderHoursBefore: number;
  availableHours: Record<string, { enabled: boolean; hours: string[] }>;
  blockedDates: string[];
  termsAndConditions?: string | null;
  logo?: string | null;
}

export default function SettingsClient({ config: initial }: { config: Config }) {
  const { refreshConfig } = useConfig();
  const [config, setConfig] = useState<Config>({
    ...initial,
    phone: initial.phone ?? "",
    address: initial.address ?? "",
    instagram: initial.instagram ?? "",
    facebook: initial.facebook ?? "",
    website: initial.website ?? "",
    availableHours: (initial.availableHours as Record<string, { enabled: boolean; hours: string[] }>) || {},
    blockedDates: Array.isArray(initial.blockedDates) ? initial.blockedDates : [],
  });
  const [saving, setSaving] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState("");

  const set = <K extends keyof Config>(field: K, value: Config[K]) =>
    setConfig((p) => ({ ...p, [field]: value }));

  const toggleDay = (day: string, enabled: boolean) =>
    setConfig((p) => ({
      ...p,
      availableHours: {
        ...p.availableHours,
        [day]: { ...p.availableHours[day], enabled, hours: enabled ? p.availableHours[day]?.hours || [] : [] },
      },
    }));

  const toggleHour = (day: string, hour: string) =>
    setConfig((p) => {
      const dayConf = p.availableHours[day] || { enabled: true, hours: [] };
      const hours = dayConf.hours.includes(hour)
        ? dayConf.hours.filter((h) => h !== hour)
        : [...dayConf.hours, hour].sort();
      return { ...p, availableHours: { ...p.availableHours, [day]: { ...dayConf, hours } } };
    });

  const copyToAll = (sourceDay: string) =>
    setConfig((p) => {
      const sourceHours = p.availableHours[sourceDay]?.hours || [];
      const updated = { ...p.availableHours };
      DAYS.forEach((d) => {
        if (d.key !== sourceDay && updated[d.key]?.enabled) {
          updated[d.key] = { ...updated[d.key], hours: [...sourceHours] };
        }
      });
      return { ...p, availableHours: updated };
    });

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    const current = Array.isArray(config.blockedDates) ? config.blockedDates : [];
    if (current.includes(newBlockedDate)) { toast.error("Esta fecha ya está bloqueada"); return; }
    set("blockedDates", [...current, newBlockedDate].sort());
    setNewBlockedDate("");
  };

  const removeBlockedDate = (date: string) =>
    set("blockedDates", config.blockedDates.filter((d) => d !== date));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        businessName: config.businessName,
        email: config.email,
        phone: config.phone,
        address: config.address,
        primaryColor: config.primaryColor,
        instagram: config.instagram,
        facebook: config.facebook,
        website: config.website,
        currency: config.currency,
        bufferTime: config.bufferTime,
        minAdvanceHours: config.minAdvanceHours,
        requireDeposit: config.requireDeposit,
        depositType: config.depositType,
        depositAmount: Number(config.depositAmount),
        sendConfirmationEmail: config.sendConfirmationEmail,
        sendReminderEmail: config.sendReminderEmail,
        reminderHoursBefore: config.reminderHoursBefore,
        availableHours: config.availableHours,
        blockedDates: config.blockedDates,
        termsAndConditions: config.termsAndConditions || null,
      });
      await refreshConfig();
      toast.success("Configuración guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const selectCls = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-0.5">Personaliza tu estudio y sistema de reservas</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="hours">Horarios</TabsTrigger>
          <TabsTrigger value="holidays">Feriados</TabsTrigger>
          <TabsTrigger value="booking">Reservas</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
        </TabsList>

        {/* Business tab */}
        <TabsContent value="business" className="space-y-6 mt-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Información del negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre del negocio" value={config.businessName} onChange={e => set("businessName", e.target.value)} />
              <Input label="Email" type="email" value={config.email} onChange={e => set("email", e.target.value)} />
              <Input label="Teléfono" value={config.phone} onChange={e => set("phone", e.target.value)} />
              <Input label="Dirección" value={config.address} onChange={e => set("address", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color principal</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.primaryColor} onChange={e => set("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200" />
                <Input value={config.primaryColor} onChange={e => set("primaryColor", e.target.value)}
                  className="w-32 font-mono" />
              </div>
            </div>

            <h3 className="font-medium text-gray-900 pt-2">Redes sociales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Instagram" value={config.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@usuario" />
              <Input label="Facebook" value={config.facebook} onChange={e => set("facebook", e.target.value)} placeholder="facebook.com/..." />
              <Input label="Sitio web" value={config.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </TabsContent>

        {/* Hours tab */}
        <TabsContent value="hours" className="space-y-6 mt-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Horarios disponibles</h2>
            <p className="text-sm text-gray-500">
              Selecciona las horas exactas en las que tu estudio estará disponible para reservas. Los clientes solo verán estas horas.
            </p>
            <div className="space-y-4">
              {DAYS.map(day => {
                const dayConf = config.availableHours[day.key] || { enabled: false, hours: [] };
                const selectedHours = dayConf.hours || [];
                return (
                  <div key={day.key} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={dayConf.enabled} onCheckedChange={v => toggleDay(day.key, v)} />
                        <span className={`text-sm font-semibold ${dayConf.enabled ? "text-gray-900" : "text-gray-400"}`}>{day.label}</span>
                        {dayConf.enabled && (
                          <span className="text-xs text-gray-400">{selectedHours.length} hora{selectedHours.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      {dayConf.enabled && selectedHours.length > 0 && (
                        <button onClick={() => copyToAll(day.key)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                          title="Copiar horas de este día a todos los demás días habilitados">
                          <Copy className="h-3 w-3" />
                          Copiar a todos
                        </button>
                      )}
                    </div>
                    {dayConf.enabled ? (
                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5 mt-2">
                        {ALL_HOURS.map(hour => {
                          const isSelected = selectedHours.includes(hour);
                          return (
                            <button key={hour} onClick={() => toggleHour(day.key, hour)}
                              className={`px-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isSelected
                                  ? "text-white shadow-sm bg-gray-900"
                                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
                              }`}>
                              {formatHourAMPM(hour)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Cerrado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Buffer entre sesiones</h2>
            <Input label="Buffer (minutos)" type="number" min="0" step="15" value={config.bufferTime}
              onChange={e => set("bufferTime", parseInt(e.target.value) || 0)} className="w-32"
              helperText="Tiempo de preparación entre reservas" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Tiempo mínimo de anticipación</h2>
            <Input label="Horas mínimas de anticipación" type="number" min="0" value={config.minAdvanceHours}
              onChange={e => set("minAdvanceHours", parseInt(e.target.value) || 0)} className="w-32"
              helperText="0 = sin restricción. Los admin no tienen esta restricción." />
          </div>
        </TabsContent>

        {/* Holidays tab */}
        <TabsContent value="holidays" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Fechas bloqueadas</h2>
            <p className="text-sm text-gray-500">Estas fechas no estarán disponibles para nuevas reservas.</p>
            <div className="flex gap-2">
              <Input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)}
                className="w-48" />
              <Button onClick={addBlockedDate} variant="outline">Bloquear fecha</Button>
            </div>
            {config.blockedDates.length === 0 ? (
              <p className="text-sm text-gray-400">No hay fechas bloqueadas</p>
            ) : (
              <div className="space-y-2">
                {config.blockedDates.map(date => (
                  <div key={date} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-700">
                      {new Date(date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <button onClick={() => removeBlockedDate(date)} className="text-gray-400 hover:text-red-600 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Booking tab */}
        <TabsContent value="booking" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Configuración de reservas</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select value={config.currency} onChange={e => set("currency", e.target.value)} className={selectCls + " w-32"}>
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Requerir seña</p>
                  <p className="text-xs text-gray-400">El cliente debe pagar una seña al reservar</p>
                </div>
                <Switch checked={config.requireDeposit} onCheckedChange={v => set("requireDeposit", v)} />
              </div>
              {config.requireDeposit && (
                <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de seña</label>
                    <select value={config.depositType} onChange={e => set("depositType", e.target.value)} className={selectCls + " w-40"}>
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                  </div>
                  <Input label={config.depositType === "percentage" ? "Porcentaje de seña" : "Monto de seña"}
                    type="number" min="0" step="1" value={String(config.depositAmount)}
                    onChange={e => set("depositAmount", parseFloat(e.target.value) || 0)} className="w-32" />
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-t border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Email de confirmación</p>
                  <p className="text-xs text-gray-400">Enviar email al confirmar reserva</p>
                </div>
                <Switch checked={config.sendConfirmationEmail} onCheckedChange={v => set("sendConfirmationEmail", v)} />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Email de recordatorio</p>
                  <p className="text-xs text-gray-400">Enviar recordatorio antes de la sesión</p>
                </div>
                <Switch checked={config.sendReminderEmail} onCheckedChange={v => set("sendReminderEmail", v)} />
              </div>
              {config.sendReminderEmail && (
                <div className="pl-4 border-l-2 border-gray-100">
                  <Input label="Horas antes del recordatorio" type="number" min="1" value={config.reminderHoursBefore}
                    onChange={e => set("reminderHoursBefore", parseInt(e.target.value) || 24)} className="w-32" />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Legal tab */}
        <TabsContent value="legal" className="mt-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Términos y condiciones</h2>
            <p className="text-sm text-gray-500">Se mostrarán al cliente antes de confirmar la reserva.</p>
            <Textarea
              value={config.termsAndConditions || ""}
              onChange={e => set("termsAndConditions", e.target.value)}
              rows={12}
              className="resize-y"
              placeholder="Escribe aquí los términos y condiciones..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} loading={saving} className="gap-2">
          <Save className="h-4 w-4" />
          Guardar todos los cambios
        </Button>
      </div>
    </div>
  );
}
