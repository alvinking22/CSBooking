"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday as isTodayFn,
  isBefore,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { getCalendarBookings } from "@/actions/bookings";
import { useConfig } from "@/contexts/ConfigContext";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";

interface Booking {
  id: string;
  clientName: string;
  startTime: string;
  endTime: string;
  status: string;
  sessionDate: string;
  duration?: number | null;
  serviceType?: { name: string } | null;
  studio?: { name: string; color?: string | null } | null;
}

type CalMode = "month" | "week" | "day";

const DAY_LABELS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_LABELS_FULL  = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, "0")}${period}`;
}

function BookingCard({
  booking,
  pc,
  highlight = false,
}: {
  booking: Booking;
  pc: string;
  highlight?: boolean;
}) {
  const bgColor = booking.studio?.color || pc;
  const isCancelled = booking.status === "CANCELLED";
  const serviceName = booking.serviceType?.name || "";
  const studioName = booking.studio?.name || "";
  const timeRange = `${formatTime12h(booking.startTime)}-${formatTime12h(booking.endTime)}`;
  const ariaLabel = [
    booking.clientName || "Sin nombre",
    serviceName,
    timeRange,
    studioName,
    isCancelled ? "Cancelada" : "",
  ].filter(Boolean).join(", ");

  return (
    <Link
      href={`/admin/bookings/${booking.id}`}
      aria-label={ariaLabel}
      className={`block rounded-2xl p-5 relative overflow-hidden transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
        highlight ? "ring-2 ring-offset-2 ring-white/50 shadow-lg" : ""
      }`}
      style={{
        backgroundColor: bgColor,
        backgroundImage: isCancelled
          ? "repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(255,255,255,0.18) 8px, rgba(255,255,255,0.18) 16px)"
          : "none",
      }}
    >
      <p className="font-bold text-white text-base leading-snug drop-shadow-sm" aria-hidden="true">
        {booking.clientName || "Sin nombre"}
      </p>
      {serviceName && (
        <p className="text-sm mt-1 drop-shadow-sm" style={{ color: "rgba(255,255,255,0.9)" }} aria-hidden="true">{serviceName}</p>
      )}
      <p className="text-sm mt-0.5 drop-shadow-sm" style={{ color: "rgba(255,255,255,0.8)" }} aria-hidden="true">
        {timeRange}
        {studioName ? ` · ${studioName}` : ""}
      </p>
      {isCancelled && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded bg-red-400 border-2 border-white/80" aria-hidden="true" />
      )}
    </Link>
  );
}

export default function CalendarClient({
  initialBookings,
  isAdmin,
}: {
  initialBookings: Booking[];
  isAdmin: boolean;
}) {
  const { config } = useConfig();
  const pc = config?.primaryColor || "#3B82F6";
  const [calMode, setCalMode] = useState<CalMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const monthGridRef = useRef<HTMLDivElement>(null);

  const getDateRange = (mode: CalMode, date: Date) => {
    if (mode === "month") {
      return { start: startOfMonth(date), end: endOfMonth(date) };
    }
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    return { start: ws, end: we };
  };

  const fetchData = async (mode: CalMode, date: Date) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(mode, date);
      const result = await getCalendarBookings(
        format(start, "yyyy-MM-dd"),
        format(end, "yyyy-MM-dd")
      );
      setBookings(result as unknown as Booking[]);
    } catch {
      toast.error("Error al cargar calendario");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = async (direction: 1 | -1) => {
    let newDate: Date;
    let announcement = "";
    if (calMode === "month") {
      newDate = direction === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
      announcement = format(newDate, "MMMM yyyy", { locale: es });
    } else if (calMode === "week") {
      newDate = direction === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
      const ws = startOfWeek(newDate, { weekStartsOn: 1 });
      const we = endOfWeek(newDate, { weekStartsOn: 1 });
      announcement = `Semana del ${format(ws, "d", { locale: es })} al ${format(we, "d MMM yyyy", { locale: es })}`;
    } else {
      newDate = direction === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1);
      announcement = format(newDate, "EEEE d 'de' MMMM yyyy", { locale: es });
    }
    setCurrentDate(newDate);
    setLiveMessage(announcement);
    await fetchData(calMode, newDate);
  };

  const goToday = async () => {
    const today = new Date();
    setCurrentDate(today);
    setLiveMessage("Hoy, " + format(today, "EEEE d 'de' MMMM yyyy", { locale: es }));
    await fetchData(calMode, today);
  };

  const switchMode = async (mode: CalMode) => {
    setCalMode(mode);
    const labels: Record<CalMode, string> = { month: "Vista mensual", week: "Vista semanal", day: "Vista diaria" };
    setLiveMessage(labels[mode]);
    await fetchData(mode, currentDate);
  };

  const switchToDay = async (day: Date) => {
    setCurrentDate(day);
    setCalMode("day");
    setLiveMessage(format(day, "EEEE d 'de' MMMM yyyy", { locale: es }));
    if (calMode === "month") {
      await fetchData("day", day);
    }
  };

  const getTitle = () => {
    if (calMode === "month") return format(currentDate, "MMMM yyyy", { locale: es });
    if (calMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d", { locale: es })} - ${format(we, "d MMM yyyy", { locale: es })}`;
    }
    return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es });
  };

  const getPrevLabel = () => {
    if (calMode === "month") return "Mes anterior";
    if (calMode === "week") return "Semana anterior";
    return "Día anterior";
  };

  const getNextLabel = () => {
    if (calMode === "month") return "Mes siguiente";
    if (calMode === "week") return "Semana siguiente";
    return "Día siguiente";
  };

  // Keyboard navigation for month grid
  const handleMonthKeyDown = useCallback((e: React.KeyboardEvent, day: Date) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft:  () => subDays(day, 1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp:    () => subDays(day, 7),
      ArrowDown:  () => addDays(day, 7),
      Enter:      () => { switchToDay(day); return day; },
      " ":        () => { switchToDay(day); return day; },
    };
    const mover = moves[e.key];
    if (!mover) return;
    e.preventDefault();
    const newDay = mover();
    setCurrentDate(newDay);
    // Focus the new day button
    setTimeout(() => {
      const btn = monthGridRef.current?.querySelector<HTMLButtonElement>(
        `[data-date="${format(newDay, "yyyy-MM-dd")}"]`
      );
      btn?.focus();
    }, 0);
  }, [switchToDay]);

  // js-index-maps: Map<dateStr, Booking[]> para O(1) lookups en lugar de O(n) filter por día
  // O(1) lookup via Map — getBookingsForDay depends on this, must be declared first
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = b.sessionDate.toString().slice(0, 10);
      const list = map.get(key);
      if (list) {
        list.push(b);
      } else {
        map.set(key, [b]);
      }
    }
    return map;
  }, [bookings]);

  // O(1) lookup via Map instead of O(n) filter — js-index-maps
  const getBookingsForDay = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookingsByDate.get(dateStr) ?? [];
  }, [bookingsByDate]);

  // rerender-derived-state-no-effect: all computed values memoized
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const { monthDays, startPadding } = useMemo(() => {
    const ms = startOfMonth(currentDate);
    return {
      monthDays: eachDayOfInterval({ start: ms, end: endOfMonth(currentDate) }),
      startPadding: (getDay(ms) + 6) % 7,
    };
  }, [currentDate]);

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status !== "CANCELLED"),
    [bookings]
  );

  // js-set-map-lookups: Set for O(1) studio deduplication
  const studioColors = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; color: string }[] = [];
    for (const b of bookings) {
      if (b.studio?.name && b.studio?.color && !seen.has(b.studio.name)) {
        seen.add(b.studio.name);
        result.push({ name: b.studio.name, color: b.studio.color });
      }
    }
    return result;
  }, [bookings]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Aria live region for dynamic announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{liveMessage}</div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-500 text-sm">{activeBookings.length} reservas en este período</p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/bookings/new"
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: pc }}
            aria-label="Crear nueva reserva"
          >
            + Nueva Reserva
          </Link>
        )}
      </div>

      {/* Navigation bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate(-1)}
              aria-label={getPrevLabel()}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 capitalize min-w-[180px] text-center" aria-live="polite">
              {getTitle()}
            </h2>
            <button
              onClick={() => handleNavigate(1)}
              aria-label={getNextLabel()}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              aria-label="Ir a hoy"
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              Hoy
            </button>
            <div className="flex bg-gray-100 rounded-lg p-0.5" role="group" aria-label="Seleccionar vista">
              {(
                [
                  { key: "month", label: "Mes" },
                  { key: "week", label: "Semana" },
                  { key: "day", label: "Día" },
                ] as { key: CalMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  aria-pressed={calMode === m.key}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 ${
                    calMode === m.key
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Studio color legend */}
        {studioColors.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap" aria-label="Leyenda de estudios">
            {studioColors.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} aria-hidden="true" />
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex justify-center py-16" aria-busy="true" aria-label="Cargando calendario">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: pc }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <>
          {/* ===== MONTH VIEW ===== */}
          {calMode === "month" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="max-w-xl mx-auto">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1" role="row">
                  {DAY_LABELS_SHORT.map((d, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-semibold text-gray-400 py-2"
                      role="columnheader"
                      aria-label={DAY_LABELS_FULL[i]}
                    >
                      <span aria-hidden="true">{d}</span>
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div
                  ref={monthGridRef}
                  className="grid grid-cols-7 gap-1"
                  role="grid"
                  aria-label={`Calendario de ${format(currentDate, "MMMM yyyy", { locale: es })}`}
                >
                  {Array.from({ length: startPadding }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square" role="gridcell" aria-hidden="true" />
                  ))}
                  {monthDays.map((day) => {
                    const dayBookings = getBookingsForDay(day);
                    const hasBookings = dayBookings.length > 0;
                    const today = isTodayFn(day);
                    const fullDateLabel = format(day, "EEEE d 'de' MMMM", { locale: es });
                    const bookingCountLabel = hasBookings
                      ? `, ${dayBookings.length} reserva${dayBookings.length > 1 ? "s" : ""}`
                      : ", sin reservas";
                    return (
                      <div key={day.toISOString()} role="gridcell">
                        <button
                          data-date={format(day, "yyyy-MM-dd")}
                          onClick={() => switchToDay(day)}
                          onKeyDown={(e) => handleMonthKeyDown(e, day)}
                          aria-label={`${fullDateLabel}${bookingCountLabel}${today ? ", hoy" : ""}`}
                          aria-current={today ? "date" : undefined}
                          className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1
                            ${today ? "font-bold" : ""}
                            ${hasBookings ? "hover:bg-gray-100" : "hover:bg-gray-50 text-gray-500"}
                          `}
                          style={hasBookings && !today ? { background: `${dayBookings[0].studio?.color || pc}0d` } : undefined}
                        >
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded-full ${today ? "text-white" : ""}`}
                            style={today ? { background: pc } : {}}
                            aria-hidden="true"
                          >
                            {format(day, "d")}
                          </span>
                          {hasBookings && (
                            <div className="flex gap-0.5 mt-0.5 items-center" aria-hidden="true">
                              {dayBookings.length <= 3 ? (
                                dayBookings.map((b, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: b.studio?.color || pc }}
                                  />
                                ))
                              ) : (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: dayBookings[0].studio?.color || pc }} />
                                  <span className="text-[8px] font-semibold" style={{ color: dayBookings[0].studio?.color || pc }}>
                                    +{dayBookings.length - 1}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== WEEK VIEW ===== */}
          {calMode === "week" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-100" role="row">
                {weekDays.map((day, i) => {
                  const today = isTodayFn(day);
                  const dayCount = getBookingsForDay(day).filter((b) => b.status !== "CANCELLED").length;
                  const fullLabel = `${DAY_LABELS_FULL[i]} ${format(day, "d 'de' MMMM", { locale: es })}${dayCount > 0 ? `, ${dayCount} reserva${dayCount > 1 ? "s" : ""}` : ""}`;
                  return (
                    <button
                      key={i}
                      onClick={() => switchToDay(day)}
                      aria-label={fullLabel}
                      aria-current={today ? "date" : undefined}
                      className="flex flex-col items-center py-3 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-inset"
                    >
                      <span className="text-xs font-medium text-gray-400 mb-1" aria-hidden="true">
                        {DAY_LABELS_SHORT[i]}
                      </span>
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${today ? "text-white" : "text-gray-700"}`}
                        style={today ? { background: pc } : {}}
                        aria-hidden="true"
                      >
                        {format(day, "d")}
                      </span>
                      {dayCount > 0 && (
                        <span className="text-[10px] text-gray-400 mt-0.5" aria-hidden="true">{dayCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Booking cards */}
              <div className="px-4 pb-4">
                {(() => {
                  const todayStart = startOfDay(new Date());
                  const upcomingDays = weekDays.filter((day) => !isBefore(day, todayStart));
                  const upcomingWithBookings = upcomingDays.filter(
                    (day) => getBookingsForDay(day).length > 0
                  );

                  if (upcomingWithBookings.length === 0) {
                    return (
                      <div className="py-16 text-center">
                        <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                        <p className="text-gray-500 font-medium text-sm">No hay reservas esta semana</p>
                        <p className="text-xs text-gray-400 mt-1">Navega a otra semana o crea una nueva reserva</p>
                      </div>
                    );
                  }

                  return upcomingDays.map((day, i) => {
                    const dayBookings = getBookingsForDay(day);
                    if (dayBookings.length === 0) return null;
                    const today = isTodayFn(day);
                    return (
                      <div
                        key={i}
                        className={`mt-4 ${today ? "rounded-xl p-3 -mx-1" : ""}`}
                        style={today ? { background: `${pc}08` } : {}}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-semibold uppercase ${today ? "" : "text-gray-400"}`}
                            style={today ? { color: pc } : {}}
                          >
                            {format(day, "EEEE d", { locale: es })}
                          </span>
                          {today && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: pc }}
                            >
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {dayBookings.map((b) => (
                            <BookingCard key={b.id} booking={b} pc={pc} highlight={today} />
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ===== DAY VIEW ===== */}
          {calMode === "day" &&
            (() => {
              const dayBookings = getBookingsForDay(currentDate);
              return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="text-xs text-gray-400">
                      {dayBookings.filter((b) => b.status !== "CANCELLED").length} reservas
                    </span>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    {dayBookings.length === 0 ? (
                      <div className="py-16 text-center">
                        <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                        <p className="text-gray-500 font-medium text-sm">No hay reservas este día</p>
                        <p className="text-xs text-gray-400 mt-1">Selecciona otro día o crea una nueva reserva</p>
                      </div>
                    ) : (
                      dayBookings.map((b) => <BookingCard key={b.id} booking={b} pc={pc} />)
                    )}
                  </div>
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}
