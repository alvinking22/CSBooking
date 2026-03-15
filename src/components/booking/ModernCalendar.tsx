"use client";

import { DayPicker } from "react-day-picker";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import "./ModernCalendar.css";

export interface TimeSlot {
  time: string;
  available: boolean;
}

interface Props {
  selectedDate: Date | null;
  onDateSelect: (date: Date | undefined) => void;
  availableSlots?: TimeSlot[];
  selectedSlot?: string;
  onSlotSelect: (time: string) => void;
  calculateEndTime?: (start: string, duration: number) => string;
  serviceDuration?: number;
  primaryColor?: string;
  blockedDates?: string[];
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function getDayLabel(date: Date | null): string {
  if (!date) return "";
  return format(date, "EEEE, d 'de' MMMM", { locale: es });
}

export default function ModernCalendar({
  selectedDate,
  onDateSelect,
  availableSlots = [],
  selectedSlot,
  onSlotSelect,
  calculateEndTime,
  serviceDuration,
  primaryColor,
  blockedDates = [],
}: Props) {
  const today = startOfToday();
  const safeDates = Array.isArray(blockedDates) ? blockedDates : [];
  const blockedDateObjects = safeDates.map((d) => new Date(d + "T12:00:00"));
  const pc = primaryColor || "#111";

  const availableCount = availableSlots.filter((s) => s.available).length;
  const endTime =
    selectedSlot && calculateEndTime && serviceDuration
      ? calculateEndTime(selectedSlot, serviceDuration)
      : "";

  return (
    <div>
      <div className="mc-wrapper">
        {/* Left: Calendar */}
        <div className="mc-calendar">
          <DayPicker
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={onDateSelect}
            disabled={[{ before: today }, ...blockedDateObjects]}
            locale={es}
            weekStartsOn={1}
            showOutsideDays={false}
          />
        </div>

        {/* Right: Slots panel */}
        <div className="mc-panel">
          {selectedDate ? (
            <>
              <div className="mc-panel-header">
                <h3 className="mc-panel-title">{getDayLabel(selectedDate)}</h3>
                {availableCount > 0 && (
                  <span
                    className="mc-panel-badge"
                    style={{ background: `${pc}15`, color: pc }}
                  >
                    {availableCount} disponible{availableCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="mc-slots-list">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    const slotEnd =
                      calculateEndTime && serviceDuration
                        ? calculateEndTime(slot.time, serviceDuration)
                        : "";
                    return (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && onSlotSelect(slot.time)}
                        disabled={!slot.available}
                        className={`mc-slot ${isSelected ? "mc-slot-selected" : ""} ${!slot.available ? "mc-slot-unavailable" : ""}`}
                        style={isSelected ? { borderColor: pc, background: pc } : {}}
                      >
                        <div
                          className="mc-slot-dot"
                          style={{
                            background: isSelected
                              ? "rgba(255,255,255,0.7)"
                              : !slot.available
                                ? "#e5e7eb"
                                : pc,
                          }}
                        />
                        <div className="mc-slot-info">
                          <div className="mc-slot-time">
                            {formatTime12h(slot.time)}
                          </div>
                          <div className="mc-slot-range">
                            {slot.available
                              ? slotEnd
                                ? `${formatTime12h(slot.time)} — ${formatTime12h(slotEnd)}`
                                : ""
                              : "No disponible"}
                          </div>
                        </div>
                        <div className="mc-slot-action">
                          {isSelected ? "✓" : slot.available ? "›" : ""}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="mc-empty">
                    <div className="mc-empty-icon">📅</div>
                    <p>No hay horarios disponibles</p>
                    <span>Este día no tiene horarios habilitados</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mc-empty">
              <div className="mc-empty-icon">📅</div>
              <p>Selecciona una fecha</p>
              <span>para ver los horarios disponibles</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail card — full width below both panels */}
      {selectedSlot && endTime && (
        <div className="mc-detail" style={{ borderColor: pc }}>
          <div className="mc-detail-left">
            <div className="mc-detail-icon" style={{ background: pc }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="mc-detail-text">
              <div className="mc-detail-main">
                {formatTime12h(selectedSlot)} → {formatTime12h(endTime)}
              </div>
              <div className="mc-detail-sub">{getDayLabel(selectedDate)}</div>
            </div>
          </div>
          <div className="mc-detail-duration">{serviceDuration}h</div>
        </div>
      )}
    </div>
  );
}
