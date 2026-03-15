"use client";

import { useState, useEffect, useMemo, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useConfig } from "@/contexts/ConfigContext";
import { StepService } from "@/components/booking/steps/StepService";
import { StepStudio } from "@/components/booking/steps/StepStudio";
import { StepDateTime } from "@/components/booking/steps/StepDateTime";
import { StepCustomize } from "@/components/booking/steps/StepCustomize";
import { StepClientData } from "@/components/booking/steps/StepClientData";
import { StepConfirm } from "@/components/booking/steps/StepConfirm";
import type {
  BookingService,
  BookingStudio,
  BookingEquipmentItem,
  EquipmentDetail,
  CalendarBooking,
  ClientData,
} from "@/components/booking/booking-types";
import type { TimeSlot } from "@/components/booking/ModernCalendar";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Servicio", "Estudio", "Fecha y Hora", "Personalizar Set", "Tus Datos", "Confirmar"];

type AvailableHoursConfig = Record<string, { enabled: boolean; hours: string[] }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayName(date: Date): string {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    date.getDay()
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BookingFlowProps {
  initialServices: BookingService[];
  initialStudios: BookingStudio[];
}

export default function BookingFlow({ initialServices, initialStudios }: BookingFlowProps) {
  const { config } = useConfig();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);

  // Step 1: Service
  const [services] = useState<BookingService[]>(initialServices);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);

  // Step 2: Studio
  const [studios] = useState<BookingStudio[]>(initialStudios);
  const [selectedStudio, setSelectedStudio] = useState<BookingStudio | null>(null);

  // Step 3: Date & Time
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStart, setSelectedStart] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Step 4: Equipment
  const [equipment, setEquipment] = useState<BookingEquipmentItem[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [equipmentDetails, setEquipmentDetails] = useState<Record<string, EquipmentDetail>>({});
  const [participants, setParticipants] = useState<number | null>(null);
  const [equipmentLoaded, setEquipmentLoaded] = useState(false);

  // Step 5: Client data
  const [clientData, setClientData] = useState<ClientData>({
    name: "",
    email: "",
    phone: "",
    projectDescription: "",
    notes: "",
  });

  // Step 6: Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Conditional equipment logic
  const [lockedCategories, setLockedCategories] = useState<Record<string, string>>({});
  const [mesaSelectionId, setMesaSelectionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const pc = config?.primaryColor || "#3B82F6";

  // ─── Load equipment when entering step 4 ───────────────────────────────────

  useEffect(() => {
    if (step !== 4) return;
    setEquipmentLoaded(false);
    const params = new URLSearchParams();
    if (selectedStudio?.id) params.set("studioId", selectedStudio.id);
    if (selectedService?.id) params.set("serviceId", selectedService.id);
    fetch(`/api/public/equipment?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const items: BookingEquipmentItem[] = (d.data?.equipment || []).map(
          (e: BookingEquipmentItem & { options: unknown }) => ({
            ...e,
            extraCost: Number(e.extraCost ?? 0),
            options: e.options
              ? typeof e.options === "string"
                ? JSON.parse(e.options)
                : e.options
              : null,
          })
        );
        setEquipment(items);
        const requiredIds = items.filter((e) => e.isRequired).map((e) => e.id);
        setSelectedEquipment((prev) => [...new Set([...prev, ...requiredIds])]);
        setEquipmentLoaded(true);
      })
      .catch(() => setEquipmentLoaded(true));
  }, [step, selectedStudio?.id, selectedService?.id]);

  // ─── Load slots when date changes ──────────────────────────────────────────

  useEffect(() => {
    if (selectedDate && config && selectedService) {
      loadDaySlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, config, selectedService, selectedStudio]);

  const loadDaySlots = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const [year, month] = [date.getFullYear(), date.getMonth()];
      const start = format(new Date(year, month, 1), "yyyy-MM-dd");
      const end = format(new Date(year, month + 1, 0), "yyyy-MM-dd");

      const res = await fetch(`/api/public/calendar?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      const dayBookings: CalendarBooking[] = (data.data?.bookings || []).filter(
        (b: CalendarBooking) => b.sessionDate === dateStr
      );

      const availHours = config?.availableHours as AvailableHoursConfig | undefined;
      if (availHours) {
        const dayName = getDayName(date);
        const dayConf = availHours[dayName];
        if (dayConf?.enabled && dayConf.hours?.length > 0) {
          const slots: TimeSlot[] = dayConf.hours.map((hour) => ({
            time: hour,
            available: isSlotAvailable(hour, dayBookings, dayConf.hours),
          }));
          setAvailableSlots(slots);
        } else {
          setAvailableSlots([]);
        }
      }
    } catch {
      setAvailableSlots([]);
    }
  };

  const isSlotAvailable = (
    slotTime: string,
    bookings: CalendarBooking[],
    dayHours: string[]
  ): boolean => {
    if (!selectedService) return false;
    const serviceDurationHours = Number(selectedService.duration);
    const bufferMin = config?.bufferTime || 0;

    const [slotH, slotM] = slotTime.split(":").map(Number);
    const slotStart = slotH * 60 + slotM;
    const slotEnd = slotStart + serviceDurationHours * 60;

    // Check minimum advance time
    const minAdvance = config?.minAdvanceHours || 0;
    if (minAdvance > 0 && selectedDate) {
      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(slotH, slotM, 0, 0);
      const now = new Date();
      const diffHours = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < minAdvance) return false;
    }

    // Check contiguous hours coverage
    for (let h = slotH; h < slotH + serviceDurationHours; h++) {
      const hourStr = `${String(h).padStart(2, "0")}:00`;
      if (!dayHours.includes(hourStr)) return false;
    }

    // Check booking conflicts
    const relevant = bookings.filter((b) => {
      if (selectedStudio && b.studioId && b.studioId !== selectedStudio.id) return false;
      return true;
    });

    for (const booking of relevant) {
      const [bsH, bsM] = booking.startTime.slice(0, 5).split(":").map(Number);
      const [beH, beM] = booking.endTime.slice(0, 5).split(":").map(Number);
      const bookStart = bsH * 60 + bsM;
      const bookEnd = beH * 60 + beM;
      if (slotStart < bookEnd + bufferMin && slotEnd + bufferMin > bookStart) return false;
    }
    return true;
  };

  // ─── Derived state: pricing computed during render (rerender-derived-state-no-effect) ──

  const pricing = useMemo(() => {
    if (!selectedService) return { base: 0, extras: 0, total: 0, deposit: 0 };
    const base = Number(selectedService.basePrice);
    const extras = selectedEquipment.reduce((sum, id) => {
      const item = equipment.find((e) => e.id === id);
      if (!item || item.isIncluded) return sum;
      return sum + Number(item.extraCost || 0);
    }, 0);
    const total = base + extras;
    let deposit = 0;
    if (config?.requireDeposit) {
      deposit =
        config.depositType === "percentage"
          ? (total * Number(config.depositAmount || 50)) / 100
          : Number(config.depositAmount || 0);
    }
    return { base, extras, total, deposit };
  }, [selectedService, selectedEquipment, equipment, config]);

  // ─── Equipment helpers ──────────────────────────────────────────────────────

  const selectCategoryItem = (category: string, itemId: string) => {
    if (lockedCategories[category]) return; // Locked categories can't be changed
    const categoryItems = groupedEquipment[category] || [];
    const otherIds = categoryItems.filter((i) => i.id !== itemId).map((i) => i.id);
    setSelectedEquipment((prev) => {
      const alreadySelected = prev.includes(itemId);
      const filtered = prev.filter((id) => !otherIds.includes(id));
      return alreadySelected
        ? filtered.filter((id) => id !== itemId)
        : [...filtered, itemId];
    });
  };

  const handleSetParticipants = (n: number) => {
    setParticipants(n);
    equipment
      .filter(e => e.syncWithParticipants && selectedEquipment.includes(e.id))
      .forEach(e => {
        const clamped = Math.min(e.quantity, Math.max(e.minQuantity || 1, n));
        setEquipmentDetails(prev => ({
          ...prev,
          [e.id]: { ...(prev[e.id] || { quantity: 1, selectedOption: null, textFieldValue: "" }), quantity: clamped },
        }));
      });
  };

  // Memoized: only recomputed when equipment list changes — rerender-derived-state-no-effect
  const groupedEquipment = useMemo(
    () =>
      equipment.reduce<Record<string, BookingEquipmentItem[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {}),
    [equipment]
  );

  // ─── Equipment item tag helper ─────────────────────────────────────────────

  const getItemTag = (item: BookingEquipmentItem): string | undefined => {
    const specs = item.specifications as { tag?: string } | null;
    return specs?.tag;
  };

  const findItemByTag = (category: string, tag: string): BookingEquipmentItem | undefined => {
    return (groupedEquipment[category] || []).find(item => getItemTag(item) === tag);
  };

  // ─── Conditional mesa → muebles/base mic logic ────────────────────────────

  useEffect(() => {
    if (!equipmentLoaded) return;
    const accesoriosItems = groupedEquipment["ACCESORIOS"] || [];
    const selectedMesa = accesoriosItems.find(item => selectedEquipment.includes(item.id));
    const newMesaId = selectedMesa?.id || null;

    if (newMesaId === mesaSelectionId) return;
    setMesaSelectionId(newMesaId);

    if (!selectedMesa) {
      setLockedCategories({});
      return;
    }

    const mesaTag = getItemTag(selectedMesa);

    if (mesaTag === "mesa_blanca" || mesaTag === "mesa_madera") {
      const sillaEjecutiva = findItemByTag("MOBILIARIOS", "silla_ejecutiva");
      const baseMesa = findItemByTag("PERSONAS", "base_mesa");

      const newLocks: Record<string, string> = {};
      const newSelectedIds = [...selectedEquipment];

      if (sillaEjecutiva) {
        newLocks["MOBILIARIOS"] = sillaEjecutiva.id;
        const mobIds = (groupedEquipment["MOBILIARIOS"] || []).map(i => i.id);
        mobIds.forEach(id => {
          const idx = newSelectedIds.indexOf(id);
          if (idx !== -1) newSelectedIds.splice(idx, 1);
        });
        if (!newSelectedIds.includes(sillaEjecutiva.id)) newSelectedIds.push(sillaEjecutiva.id);
      }

      if (baseMesa) {
        newLocks["PERSONAS"] = baseMesa.id;
        const persIds = (groupedEquipment["PERSONAS"] || []).map(i => i.id);
        persIds.forEach(id => {
          const idx = newSelectedIds.indexOf(id);
          if (idx !== -1) newSelectedIds.splice(idx, 1);
        });
        if (!newSelectedIds.includes(baseMesa.id)) newSelectedIds.push(baseMesa.id);
      }

      setLockedCategories(newLocks);
      setSelectedEquipment(newSelectedIds);
    } else if (mesaTag === "sin_mesa") {
      const stand = findItemByTag("PERSONAS", "stand");
      const newLocks: Record<string, string> = {};
      const newSelectedIds = [...selectedEquipment];

      const mobIds = (groupedEquipment["MOBILIARIOS"] || []).map(i => i.id);
      mobIds.forEach(id => {
        const idx = newSelectedIds.indexOf(id);
        if (idx !== -1) newSelectedIds.splice(idx, 1);
      });

      if (stand) {
        newLocks["PERSONAS"] = stand.id;
        const persIds = (groupedEquipment["PERSONAS"] || []).map(i => i.id);
        persIds.forEach(id => {
          const idx = newSelectedIds.indexOf(id);
          if (idx !== -1) newSelectedIds.splice(idx, 1);
        });
        if (!newSelectedIds.includes(stand.id)) newSelectedIds.push(stand.id);
      }

      setLockedCategories(newLocks);
      setSelectedEquipment(newSelectedIds);
    } else {
      setLockedCategories({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEquipment, equipmentLoaded]);

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedStart) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const duration = Number(selectedService.duration);
      const equipmentItems = selectedEquipment.map((id) => {
        const item = equipment.find((e) => e.id === id)!;
        return {
          equipmentId: id,
          quantity: 1,
          cost: item.isIncluded ? 0 : Number(item.extraCost || 0),
        };
      });

      const body = {
        clientName: clientData.name,
        clientEmail: clientData.email,
        clientPhone: clientData.phone || undefined,
        sessionDate: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedStart,
        duration,
        serviceTypeId: selectedService.id,
        studioId: selectedStudio?.id || undefined,
        projectDescription: clientData.projectDescription || undefined,
        clientNotes: clientData.notes || undefined,
        participants: participants || undefined,
        termsAccepted: termsAccepted || undefined,
        equipmentItems: equipmentItems.length > 0 ? equipmentItems : undefined,
        turnstileToken: turnstileToken || undefined,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al crear la reserva");
      }

      toast.success("¡Reserva creada exitosamente!");
      router.push(`/booking/confirmation/${data.data.booking.bookingNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la reserva");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // ─── Navigation guard ───────────────────────────────────────────────────────

  const canGoNext = (): boolean => {
    if (step === 1) return !!selectedService;
    if (step === 2) return !!selectedStudio;
    if (step === 3) return !!(selectedDate && selectedStart);
    if (step === 4) {
      const cats = Object.keys(groupedEquipment);
      return cats.every((cat) => {
        if (lockedCategories[cat]) return true;
        return groupedEquipment[cat].some((item) => selectedEquipment.includes(item.id));
      });
    }
    if (step === 5) return !!(clientData.name && clientData.email && clientData.phone);
    if (step === 6) return termsAccepted && (!turnstileSiteKey || !!turnstileToken);
    return true;
  };

  // ─── Memoized handlers for step navigation (rerender-transitions) ─────────

  const goNext = useCallback(() => {
    startTransition(() => setStep((s) => s + 1));
  }, [startTransition]);

  const goPrev = useCallback(() => {
    startTransition(() => setStep((s) => s - 1));
  }, [startTransition]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config?.logo ? (
              <NextImage src={config.logo} alt="Logo" width={160} height={40} className="h-10 w-auto object-contain" />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: pc }}
              >
                {(config?.businessName || "S").charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900">
                {config?.businessName || "Estudio de Grabación"}
              </h1>
              <p className="text-xs text-gray-500">Reserva tu sesión online</p>
            </div>
          </div>
          <a href="/booking/check" className="text-sm font-medium hover:underline" style={{ color: pc }}>
            Ver mi reserva
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-500">
              Paso {step} de {STEPS.length}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s}>
                <div
                  className={`h-1.5 rounded-full transition-all duration-300${step === i + 1 ? " animate-pulse" : ""}`}
                  style={{ background: step >= i + 1 ? pc : "#E5E7EB" }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1.5 mt-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-[10px] text-center hidden sm:block ${
                  step === i + 1
                    ? "font-bold text-gray-900"
                    : step > i + 1
                      ? "font-medium text-gray-500"
                      : "font-medium text-gray-300"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* ─── Steps ────────────────────────────────────────────────────────── */}

        {step === 1 && (
          <StepService
            services={services}
            selectedService={selectedService}
            onSelect={setSelectedService}
            pc={pc}
          />
        )}

        {step === 2 && (
          <StepStudio
            studios={studios}
            selectedStudio={selectedStudio}
            onSelect={setSelectedStudio}
            pc={pc}
          />
        )}

        {step === 3 && (
          <StepDateTime
            selectedDate={selectedDate}
            selectedStart={selectedStart}
            availableSlots={availableSlots}
            selectedService={selectedService}
            selectedStudio={selectedStudio}
            onDateSelect={setSelectedDate}
            onSlotSelect={setSelectedStart}
            config={config ?? null}
            pc={pc}
          />
        )}

        {step === 4 && (
          <StepCustomize
            equipment={equipment}
            selectedEquipment={selectedEquipment}
            equipmentDetails={equipmentDetails}
            participants={participants}
            equipmentLoaded={equipmentLoaded}
            lockedCategories={lockedCategories}
            groupedEquipment={groupedEquipment}
            notes={clientData.notes}
            selectedStudio={selectedStudio}
            selectCategoryItem={selectCategoryItem}
            handleSetParticipants={handleSetParticipants}
            onNotesChange={(notes) => setClientData((d) => ({ ...d, notes }))}
            pc={pc}
          />
        )}

        {step === 5 && (
          <StepClientData
            clientData={clientData}
            onChange={setClientData}
          />
        )}

        {step === 6 && (
          <StepConfirm
            selectedService={selectedService}
            selectedStudio={selectedStudio}
            selectedDate={selectedDate}
            selectedStart={selectedStart}
            participants={participants}
            selectedEquipment={selectedEquipment}
            equipment={equipment}
            clientData={clientData}
            pricing={pricing}
            config={config ?? null}
            termsAccepted={termsAccepted}
            turnstileSiteKey={turnstileSiteKey}
            onTermsChange={setTermsAccepted}
            onTurnstileSuccess={setTurnstileToken}
            onTurnstileExpire={() => setTurnstileToken(null)}
            onTurnstileError={() => setTurnstileToken(null)}
            pc={pc}
          />
        )}

        {/* ─── Navigation ─────────────────────────────────────────────────── */}
        <div className="flex justify-between mt-8">
          <button
            onClick={goPrev}
            disabled={step === 1 || isPending}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:invisible"
          >
            ← Anterior
          </button>

          {step < STEPS.length ? (
            <button
              onClick={goNext}
              disabled={!canGoNext() || isPending}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: pc }}
            >
              Siguiente ›
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canGoNext()}
              className="px-8 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
              style={{ background: pc }}
            >
              {loading ? "Procesando..." : "Confirmar Reserva"}
            </button>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-gray-400 mt-8">
        <p>
          {config?.businessName} · {config?.email} · {config?.phone}
        </p>
      </footer>
    </div>
  );
}
