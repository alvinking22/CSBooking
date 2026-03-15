"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getServices } from "@/actions/services";
import { getStudios } from "@/actions/studios";
import { getEquipment } from "@/actions/equipment";
import { getClients } from "@/actions/clients";
import { getConfig } from "@/actions/config";
import { getCalendarBookings, updateBooking } from "@/actions/bookings";
import { formatMoney } from "@/utils/formatMoney";
import { useConfig } from "@/contexts/ConfigContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ArrowLeft, ChevronDown, Check, Search, AlertCircle,
  CalendarDays, ChevronRight, AlertTriangle,
  Mic, Camera, Sun, ImageIcon, Users, Package, Armchair, MoreHorizontal, Table2, Stamp,
} from "lucide-react";

/* ─── Types ─── */
interface Service {
  id: string; name: string; description?: string | null;
  basePrice: unknown; duration: unknown; isActive: boolean;
}
interface Studio {
  id: string; name: string; description?: string | null;
  color?: string | null; isActive: boolean; maxParticipants?: number | null;
}
interface EquipmentItem {
  id: string; name: string; category: string; description?: string | null;
  quantity: number; isIncluded: boolean; extraCost: unknown; isActive: boolean;
  isRequired: boolean; allowQuantitySelection: boolean;
  minQuantity?: number | null; maxQuantity?: number | null;
  options?: unknown;
}
interface Client {
  id: string; name: string; email: string; phone?: string | null;
  projectName?: string | null; bookingCount?: number;
}
interface BusinessConfig {
  availableHours?: Record<string, { enabled: boolean; hours: string[] }>;
  blockedDates?: string[];
  currency?: string;
}
interface ExistingBooking {
  id: string;
  bookingNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  projectDescription?: string | null;
  clientNotes?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  duration: unknown;
  participants?: number | null;
  serviceTypeId?: string | null;
  studioId?: string | null;
  equipment?: Array<{
    equipmentId: string;
    quantity: number;
    selectedOption?: string | null;
    textFieldValue?: string | null;
    cost: unknown;
    equipment: { id: string; name: string; category: string };
  }>;
}

/* ─── Helpers ─── */
const CATEGORY_LABELS: Record<string, string> = {
  MICROFONOS: "Micrófonos", CAMARAS: "Cámaras", PERSONAS: "Base Mic",
  ILUMINACION: "Logo", FONDOS: "Fondos", ACCESORIOS: "Mesas",
  MOBILIARIOS: "Muebles", OTROS: "Otros",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  MICROFONOS:  <Mic className="w-3.5 h-3.5" />,
  CAMARAS:     <Camera className="w-3.5 h-3.5" />,
  ILUMINACION: <Stamp className="w-3.5 h-3.5" />,
  FONDOS:      <ImageIcon className="w-3.5 h-3.5" />,
  PERSONAS:    <Mic className="w-3.5 h-3.5" />,
  ACCESORIOS:  <Table2 className="w-3.5 h-3.5" />,
  MOBILIARIOS: <Armchair className="w-3.5 h-3.5" />,
  OTROS:       <MoreHorizontal className="w-3.5 h-3.5" />,
};

function calcEndTime(start: string, dur: number): string {
  const [h] = start.split(":").map(Number);
  return `${String(h + dur).padStart(2, "0")}:00`;
}

function formatHour(time: string): string {
  if (!time) return "";
  const h = parseInt(time.split(":")[0]);
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

function getDayLabel(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr + "T12:00:00"), "EEE d MMM", { locale: es });
  } catch { return ""; }
}

/* ─── SectionCard ─── */
function SectionCard({ step, title, subtitle, headerRight, gray, children, noPadding }: {
  step: string; title: string; subtitle?: string; headerRight?: React.ReactNode;
  gray?: boolean; children: React.ReactNode; noPadding?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50/80 border-b border-gray-100 rounded-t-2xl">
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0",
          gray ? "bg-gray-400" : "bg-gray-900"
        )}>{step}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {noPadding ? children : <div className="p-4">{children}</div>}
    </div>
  );
}

/* ─── Main Component ─── */
export default function EditBookingClient({ booking }: { booking: ExistingBooking }) {
  const router = useRouter();
  const { config: globalConfig } = useConfig();
  const pc = globalConfig?.primaryColor || "#3B82F6";

  // Data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [equipmentLoaded, setEquipmentLoaded] = useState(false);

  // Form — pre-populated from booking
  const [selectedServiceId, setSelectedServiceId] = useState(booking.serviceTypeId || "");
  const [selectedStudioId, setSelectedStudioId] = useState(booking.studioId || "");
  const [selectedDate, setSelectedDate] = useState(booking.sessionDate?.slice(0, 10) || "");
  const [selectedStart, setSelectedStart] = useState(booking.startTime?.slice(0, 5) || "");
  const [clientName, setClientName] = useState(booking.clientName || "");
  const [clientEmail, setClientEmail] = useState(booking.clientEmail || "");
  const [clientPhone, setClientPhone] = useState(booking.clientPhone || "");
  const [projectDescription, setProjectDescription] = useState(booking.projectDescription || "");
  const [clientNotes, setClientNotes] = useState(booking.clientNotes || "");
  const [participants, setParticipants] = useState<number | null>(booking.participants || null);

  // Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [equipmentDetails, setEquipmentDetails] = useState<Record<string, { quantity?: number; selectedOption?: string; textFieldValue?: string }>>({});
  const [equipmentSearch, setEquipmentSearch] = useState("");

  // Client autocomplete
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Availability
  const [availableHours, setAvailableHours] = useState<{ time: string; occupied: boolean; bookingInfo: { bookingNumber?: string; clientName?: string } | null }[]>([]);

  // Time picker
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Mobile equipment panel
  const [mobileEqOpen, setMobileEqOpen] = useState(false);

  // Derived
  const selectedService = services.find(s => s.id === selectedServiceId) || null;
  const duration = selectedService ? parseFloat(String(selectedService.duration)) : parseFloat(String(booking.duration)) || 0;
  const selectedStudio = studios.find(s => s.id === selectedStudioId) || null;

  // Pricing
  const pricing = (() => {
    if (!selectedService) return { base: 0, equipment: 0, total: 0 };
    const base = parseFloat(String(selectedService.basePrice));
    const eqCost = allEquipment
      .filter(e => selectedEquipment.includes(e.id) && !e.isIncluded)
      .reduce((s, e) => s + parseFloat(String(e.extraCost)), 0);
    return { base, equipment: eqCost, total: base + eqCost };
  })();

  const endTimeStr = selectedStart ? calcEndTime(selectedStart, duration) : "";
  const selectCls = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  // ─── EFFECTS ───

  useEffect(() => {
    (async () => {
      try {
        const [svc, stu, cfg] = await Promise.all([
          getServices(), getStudios(), getConfig(),
        ]);
        setConfig(cfg as BusinessConfig | null);
        setServices((svc as Service[]).filter(s => s.isActive));
        setStudios((stu as Studio[]).filter(s => s.isActive));
      } catch { toast.error("Error al cargar datos"); }
      finally { setLoading(false); }
    })();
  }, []);

  // Fetch equipment when service/studio changes
  useEffect(() => {
    if (!selectedServiceId) return;
    setEquipmentLoaded(false);
    const params: { isActive: boolean; studioId?: string; serviceId?: string } = { isActive: true };
    if (selectedStudioId) params.studioId = selectedStudioId;
    if (selectedServiceId) params.serviceId = selectedServiceId;
    getEquipment(params).then(items => {
      const eq = items as EquipmentItem[];
      setAllEquipment(eq);
      setEquipmentLoaded(true);
    }).catch(() => { setEquipmentLoaded(true); });
  }, [selectedServiceId, selectedStudioId]);

  // Pre-populate equipment selections from existing booking (only once when equipment loads)
  useEffect(() => {
    if (!equipmentLoaded || allEquipment.length === 0) return;
    if (!booking.equipment || booking.equipment.length === 0) {
      // Just select required equipment
      const requiredIds = allEquipment.filter(e => e.isRequired).map(e => e.id);
      setSelectedEquipment(requiredIds);
      return;
    }
    // Match existing booking equipment by equipment.id
    const existingIds: string[] = [];
    const details: Record<string, { quantity?: number; selectedOption?: string; textFieldValue?: string }> = {};
    for (const be of booking.equipment) {
      const eqId = be.equipment.id;
      // Check if this equipment exists in current allEquipment
      if (allEquipment.some(e => e.id === eqId)) {
        existingIds.push(eqId);
        details[eqId] = {
          quantity: be.quantity || 1,
          selectedOption: be.selectedOption || undefined,
          textFieldValue: be.textFieldValue || undefined,
        };
      }
    }
    // Also add any required equipment not in existing
    const requiredIds = allEquipment.filter(e => e.isRequired && !existingIds.includes(e.id)).map(e => e.id);
    setSelectedEquipment([...new Set([...existingIds, ...requiredIds])]);
    setEquipmentDetails(details);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentLoaded]);

  // Fetch availability when date changes (excluding current booking)
  useEffect(() => {
    if (!selectedDate || !config) { setAvailableHours([]); return; }
    (async () => {
      try {
        const bookings = await getCalendarBookings(selectedDate, selectedDate) as Array<{
          id: string; startTime: string; endTime: string; studioId?: string | null;
          status: string; bookingNumber?: string; clientName?: string;
        }>;
        const allHours = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);
        const hours = allHours.map(t => {
          const h = parseInt(t.split(":")[0]);
          const conflictBooking = bookings.find(b => {
            // Exclude the booking being edited
            if (b.id === booking.id) return false;
            if (["CANCELLED", "NO_SHOW"].includes(b.status)) return false;
            if (selectedStudioId && b.studioId && b.studioId !== selectedStudioId) return false;
            const s = parseInt(b.startTime.substring(0, 2));
            const e = parseInt(b.endTime.substring(0, 2));
            return h >= s && h < e;
          });
          return {
            time: t,
            occupied: !!conflictBooking,
            bookingInfo: conflictBooking ? { bookingNumber: conflictBooking.bookingNumber, clientName: conflictBooking.clientName } : null,
          };
        });
        setAvailableHours(hours);
      } catch { setAvailableHours([]); }
    })();
  }, [selectedDate, config, selectedStudioId, booking.id]);

  // Reset time when date changes (only if date actually changed from original)
  useEffect(() => {
    const originalDate = booking.sessionDate?.slice(0, 10);
    if (selectedDate !== originalDate) setSelectedStart("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Client autocomplete
  useEffect(() => {
    if (clientEmail.length < 2) { setClientSuggestions([]); setShowSuggestions(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await getClients(clientEmail) as Client[];
        setClientSuggestions(results.filter(c => c.email !== booking.clientEmail));
        if (results.length > 0) setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [clientEmail, booking.clientEmail]);

  // Close time dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setTimeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── HANDLERS ───

  const selectClient = (c: Client) => {
    setClientEmail(c.email);
    setClientName(c.name);
    setClientPhone(c.phone || "");
    setProjectDescription(c.projectName || "");
    setShowSuggestions(false);
  };

  const toggleEquipment = (id: string) => setSelectedEquipment(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);
  const updateEquipmentDetail = (id: string, field: string, value: unknown) => {
    setEquipmentDetails(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const requiredEquipment = allEquipment.filter(e => e.isRequired && e.isActive);
  const allRequiredSelected = requiredEquipment.every(e => selectedEquipment.includes(e.id));
  const canSubmit = selectedServiceId && selectedDate && selectedStart && clientName.trim() && clientEmail.trim() && allRequiredSelected;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const eqItems = selectedEquipment.map(id => {
        const eq = allEquipment.find(e => e.id === id);
        return {
          equipmentId: id,
          quantity: equipmentDetails[id]?.quantity || 1,
          selectedOption: equipmentDetails[id]?.selectedOption || null,
          textFieldValue: equipmentDetails[id]?.textFieldValue || null,
          cost: eq?.isIncluded ? 0 : parseFloat(String(eq?.extraCost || 0)),
        };
      });

      await updateBooking(booking.id, {
        serviceTypeId: selectedServiceId,
        studioId: selectedStudioId || null,
        sessionDate: selectedDate,
        startTime: `${selectedStart.slice(0, 2)}:00:00`,
        endTime: `${endTimeStr.slice(0, 2)}:00:00`,
        duration,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        projectDescription: projectDescription || null,
        clientNotes: clientNotes || null,
        participants: participants || null,
        equipmentItems: eqItems,
      });

      toast.success("Reserva actualizada exitosamente");
      router.push(`/admin/bookings/${booking.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  // Grouped & filtered equipment
  const grouped = allEquipment.reduce<Record<string, EquipmentItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).reduce<Record<string, EquipmentItem[]>>((acc, [cat, items]) => {
    if (!equipmentSearch) { acc[cat] = items; return acc; }
    const filtered = items.filter(i => i.name.toLowerCase().includes(equipmentSearch.toLowerCase()));
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {});

  // ─── SUB-COMPONENTS ───

  const EquipmentItemRow = ({ item }: { item: EquipmentItem }) => {
    const sel = selectedEquipment.includes(item.id);
    const detail = equipmentDetails[item.id] || {};
    const itemOptions = item.options
      ? (typeof item.options === "string" ? JSON.parse(item.options as string) : item.options) as Record<string, { types?: Array<{ id: string; name: string; image?: string; extraCost?: number; hasTextField?: boolean; textFieldLabel?: string }> }>
      : null;
    const optionTypes = itemOptions
      ? Object.values(itemOptions).flatMap(c => c.types || [])
      : [];

    return (
      <div
        className={cn("border rounded-xl transition-all", sel ? "" : "border-gray-100 hover:bg-gray-50")}
        style={sel ? { borderColor: `${pc}60`, backgroundColor: `${pc}08` } : undefined}
      >
        <label className="flex items-center gap-2.5 p-2.5 cursor-pointer">
          <input type="checkbox" checked={sel} onChange={() => toggleEquipment(item.id)}
            className="rounded shrink-0" style={{ accentColor: pc }} />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium truncate", sel ? "text-gray-900" : "text-gray-600")}>{item.name}</p>
            {!item.isIncluded && (
              <p className="text-xs text-orange-500">+${formatMoney(Number(item.extraCost))}</p>
            )}
          </div>
          {item.isRequired && <Badge variant="success" className="shrink-0 text-[10px] px-1.5 py-0">Req</Badge>}
        </label>
        {sel && (item.allowQuantitySelection || optionTypes.length > 0) && (
          <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
            {item.allowQuantitySelection && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-gray-500">Cant:</span>
                <button onClick={() => updateEquipmentDetail(item.id, "quantity", Math.max(item.minQuantity || 1, (detail.quantity || 1) - 1))}
                  className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-300">-</button>
                <span className="text-sm font-medium w-5 text-center">{detail.quantity || 1}</span>
                <button onClick={() => updateEquipmentDetail(item.id, "quantity", Math.min(item.maxQuantity || 10, (detail.quantity || 1) + 1))}
                  className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-300">+</button>
              </div>
            )}
            {optionTypes.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] text-gray-500 mb-1">Variante:</p>
                <div className="space-y-1">
                  {optionTypes.map(opt => (
                    <div key={opt.id}>
                      <button onClick={() => updateEquipmentDetail(item.id, "selectedOption", detail.selectedOption === opt.id ? null : opt.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all",
                          detail.selectedOption !== opt.id && "border-gray-200 hover:border-gray-300"
                        )}
                        style={detail.selectedOption === opt.id ? { borderColor: pc, backgroundColor: `${pc}10` } : undefined}
                      >
                        <span className="font-medium flex-1">{opt.name}</span>
                        {(opt.extraCost ?? 0) > 0 && <span className="text-orange-500">+${opt.extraCost}</span>}
                      </button>
                      {detail.selectedOption === opt.id && opt.hasTextField && (
                        <Textarea
                          value={detail.textFieldValue || ""}
                          onChange={e => updateEquipmentDetail(item.id, "textFieldValue", e.target.value)}
                          placeholder={opt.textFieldLabel || "Escribe aqui..."}
                          className="mt-1 h-14 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const EquipmentList = () => (
    <>
      {Object.entries(filteredGrouped).map(([cat, items], idx) => (
        <div key={cat} className={cn("pb-3 last:pb-0", idx > 0 && "border-t border-gray-100 pt-3")}>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
              {CATEGORY_ICONS[cat] ?? <MoreHorizontal className="w-3.5 h-3.5" />}
            </div>
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              {CATEGORY_LABELS[cat] || cat}
            </p>
          </div>
          <div className="space-y-1">
            {items.map(item => <EquipmentItemRow key={item.id} item={item} />)}
          </div>
        </div>
      ))}
      {Object.keys(filteredGrouped).length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          {equipmentSearch ? "No se encontraron equipos" : "No hay equipos disponibles"}
        </p>
      )}
    </>
  );

  // ─── LOADING ───

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: pc }} />
    </div>
  );

  // ─── RENDER ───

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={`/admin/bookings/${booking.id}`} className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Editar Reserva</h2>
              <p className="font-mono text-[10px] text-gray-400">{booking.bookingNumber}</p>
            </div>
          </div>
          <Badge variant="muted">Edición</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-gray-100">
          {/* ═══ LEFT COLUMN (3/5) ═══ */}
          <div className="lg:col-span-3 p-4 sm:p-5 space-y-3 sm:space-y-4">

            {/* 1. SERVICIO + ESTUDIO */}
            <SectionCard step="1" title="Servicio y Estudio" subtitle="Tipo de sesion y espacio">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Servicio *</label>
                  <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className={selectCls}>
                    <option value="">Seleccionar servicio...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {Number(s.duration)}h — ${formatMoney(Number(s.basePrice))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estudio</label>
                  <select value={selectedStudioId} onChange={e => setSelectedStudioId(e.target.value)} className={selectCls}>
                    <option value="">Cualquier estudio</option>
                    {studios.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.maxParticipants ? ` (${s.maxParticipants} pers.)` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedService && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="muted">{duration}h</Badge>
                  <Badge variant="muted">${formatMoney(Number(selectedService.basePrice))}</Badge>
                  {selectedStudio && <Badge variant="success">Estudio activo</Badge>}
                </div>
              )}
            </SectionCard>

            {/* 2. FECHA + HORA */}
            <SectionCard
              step="2"
              title="Fecha y Hora"
              subtitle="Cuando sera la sesion"
              headerRight={selectedDate ? (
                <span className="text-xs text-gray-400 hidden sm:inline shrink-0 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {getDayLabel(selectedDate)}
                </span>
              ) : undefined}
            >
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3">
                <div>
                  <Input label="Fecha *" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora de inicio *</label>

                  {selectedDate && selectedServiceId ? (
                    <div className="relative" ref={timeDropdownRef}>
                      <button onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                        className={cn(
                          "w-full border rounded-xl px-3 py-2.5 text-sm text-left bg-white flex items-center justify-between transition-colors",
                          timeDropdownOpen ? "border-gray-900 ring-1 ring-gray-900/10" : "border-gray-200 hover:border-gray-300"
                        )}>
                        <span className={selectedStart ? "text-gray-900 font-medium" : "text-gray-400"}>
                          {selectedStart
                            ? `${formatHour(selectedStart)} → ${formatHour(endTimeStr)}`
                            : "Seleccionar hora..."}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", timeDropdownOpen && "rotate-180")} />
                      </button>

                      {timeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1 max-h-[280px] overflow-y-auto">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase">
                            Horarios disponibles
                          </div>
                          {availableHours.map(({ time, occupied, bookingInfo }) => {
                            const isSelected = selectedStart === time;
                            const endT = calcEndTime(time, duration);
                            return (
                              <button key={time}
                                onClick={() => { setSelectedStart(time); setTimeDropdownOpen(false); }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                                  isSelected && "bg-green-50 border-l-2 border-green-500",
                                  !isSelected && "hover:bg-gray-50"
                                )}>
                                <div className={cn("w-2 h-2 rounded-full shrink-0", occupied ? "bg-red-400" : "bg-green-400")} />
                                <span className={cn("text-sm", isSelected && "font-semibold", occupied && "line-through")}>
                                  {formatHour(time)}
                                </span>
                                <span className="text-xs text-gray-400 hidden sm:inline">→ {formatHour(endT)}</span>
                                {occupied && bookingInfo && (
                                  <span className="text-xs text-red-400 truncate hidden sm:inline">
                                    {bookingInfo.bookingNumber} · {bookingInfo.clientName}
                                  </span>
                                )}
                                <span className="ml-auto shrink-0">
                                  {isSelected ? (
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" /></span>
                                  ) : occupied ? (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Ocupado</Badge>
                                  ) : (
                                    <Badge variant="success" className="text-[10px] px-1.5 py-0">Libre</Badge>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedStart && (
                        <p className="text-xs text-green-600 mt-1.5 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {formatHour(selectedStart)} – {formatHour(endTimeStr)} ({duration}h)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-gray-50">
                      {!selectedServiceId ? "Selecciona un servicio primero" : "Selecciona una fecha primero"}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* 3. CLIENTE */}
            <SectionCard step="3" title="Cliente" subtitle="Datos del cliente">
              <div className="space-y-3">
                <div className="relative">
                  <Input label="Email *" type="email" value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    onFocus={() => clientSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="email@cliente.com" />
                  {showSuggestions && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                        Clientes encontrados
                      </div>
                      {clientSuggestions.map(c => (
                        <button key={c.id}
                          onMouseDown={e => { e.preventDefault(); selectClient(c); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left">
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                            {(c.name || "??").substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {c.email}{c.phone ? ` · ${c.phone}` : ""} · {c.bookingCount || 0} reserva{(c.bookingCount || 0) !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nombre *" type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Nombre del cliente" />
                  <Input label="Telefono" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    placeholder="+1 809-000-0000" />
                </div>
                <Input label="Proyecto / Descripcion" type="text" value={projectDescription} onChange={e => setProjectDescription(e.target.value)}
                  placeholder="Ej: Episodio #12 del podcast..." />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notas del cliente</label>
                  <Textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
                    placeholder="Notas adicionales..." className="text-sm h-16 resize-none" />
                </div>
              </div>
            </SectionCard>

            {/* MOBILE: Equipment collapsible */}
            <div className="lg:hidden">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button onClick={() => setMobileEqOpen(!mobileEqOpen)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-green-600">4</div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-gray-900">Equipos del Set</p>
                    <p className="text-[11px] text-gray-500">
                      {selectedStudio?.name || "Sin estudio"}{selectedService ? ` · ${selectedService.name}` : ""}
                    </p>
                  </div>
                  <Badge variant="success" className="shrink-0">{selectedEquipment.length} sel.</Badge>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", mobileEqOpen && "rotate-180")} />
                </button>
                {mobileEqOpen && (
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                      <Input type="text" value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)}
                        placeholder="Buscar equipo..." className="pl-8 text-xs" />
                    </div>
                    <EquipmentList />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT COLUMN (2/5) — desktop only ═══ */}
          <div className="hidden lg:flex lg:col-span-2 flex-col">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Equipos del Set</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedStudio?.name || "Sin estudio"}{selectedService ? ` · ${selectedService.name}` : ""}
                </p>
              </div>
              <Badge variant="success">{selectedEquipment.length} sel.</Badge>
            </div>

            <div className="px-5 py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                <Input type="text" value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)}
                  placeholder="Buscar equipo..." className="pl-8 text-xs" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              <EquipmentList />
            </div>

            {selectedStudio?.maxParticipants && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Participantes (max. {selectedStudio.maxParticipants})
                </p>
                <div className="flex gap-1.5">
                  {Array.from({ length: selectedStudio.maxParticipants }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setParticipants(n)}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 text-center font-bold text-xs transition-all",
                        participants === n
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      )}>{n}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Price + Submit (sticky bottom) */}
            <div className="sticky bottom-0 p-5 border-t border-gray-100 bg-gray-50">
              {selectedService ? (
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{selectedService.name} · {duration}h</span>
                    <span>${formatMoney(pricing.base)}</span>
                  </div>
                  {pricing.equipment > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Equipos extras</span>
                      <span className="text-orange-500">+${formatMoney(pricing.equipment)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 my-1.5" />
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>${formatMoney(pricing.total)} {config?.currency || ""}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2 mb-4">Selecciona un servicio</p>
              )}

              <div className="flex gap-2">
                <Link href={`/admin/bookings/${booking.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">Cancelar</Button>
                </Link>
                <Button onClick={handleSubmit} disabled={!canSubmit || saving} loading={saving}
                  className="flex-1 py-3 rounded-xl" size="lg">
                  Guardar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {!canSubmit && (
                <div className="mt-2 space-y-0.5">
                  {!selectedServiceId && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Selecciona un servicio</p>}
                  {!selectedDate && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Selecciona una fecha</p>}
                  {selectedDate && !selectedStart && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Selecciona un horario</p>}
                  {!clientName.trim() && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Nombre del cliente</p>}
                  {!clientEmail.trim() && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Email del cliente</p>}
                  {!allRequiredSelected && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Equipos obligatorios</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE: Sticky price + submit */}
        <div className="lg:hidden sticky bottom-0 p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">
                {selectedService ? `${selectedService.name} · ${duration}h` : "Sin servicio"}
                {pricing.equipment > 0 ? " + extras" : ""}
              </p>
              {selectedStart && selectedDate && (
                <p className="text-xs text-gray-400">
                  {formatHour(selectedStart)} – {formatHour(endTimeStr)} · {getDayLabel(selectedDate)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">${formatMoney(pricing.total)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/bookings/${booking.id}`} className="flex-1">
              <Button variant="outline" className="w-full">Cancelar</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={!canSubmit || saving} loading={saving}
              className="flex-1 py-3 rounded-xl" size="lg">
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
