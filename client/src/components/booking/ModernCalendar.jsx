import React from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfToday } from 'date-fns';
import 'react-day-picker/dist/style.css';
import './ModernCalendar.css';

export default function ModernCalendar({
  selectedDate,
  onDateSelect,
  availableSlots = [],
  selectedSlot,
  onSlotSelect,
}) {
  const today = startOfToday();

  // Formato 12h
  const formatTime12h = (time24) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Nombre del día en español
  const getDayName = (date) => {
    if (!date) return '';
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  };

  // Timezone
  const getTimezone = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = new Date().getTimezoneOffset();
      const hours = Math.abs(Math.floor(offset / 60));
      const sign = offset <= 0 ? '+' : '-';
      return `${tz.split('/').pop().replace('_', ' ')} (GMT${sign}${String(hours).padStart(2, '0')}:00)`;
    } catch { return ''; }
  };

  return (
    <div className="modern-calendar-wrapper">
      {/* Calendario */}
      <div className="modern-calendar-left">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          disabled={{ before: today }}
          locale={es}
          weekStartsOn={1}
          showOutsideDays={false}
        />
      </div>

      {/* Panel de horarios */}
      <div className="modern-calendar-right">
        {selectedDate ? (
          <>
            <div className="modern-calendar-date-info">
              <h3 className="modern-calendar-date-title">
                {getDayName(selectedDate)}
              </h3>
              <p className="modern-calendar-timezone">
                ZONA HORARIA: {getTimezone()}
              </p>
            </div>

            <div className="modern-calendar-slots">
              {availableSlots.length > 0 ? (
                availableSlots.filter(s => !s.occupied).map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => onSlotSelect(slot.time)}
                    className={`modern-calendar-slot ${selectedSlot === slot.time ? 'selected' : ''}`}
                  >
                    {formatTime12h(slot.time)}
                  </button>
                ))
              ) : (
                <div className="modern-calendar-empty">
                  <p>No hay horarios disponibles</p>
                  <span>Este día no tiene horarios habilitados</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="modern-calendar-empty">
            <p>Selecciona una fecha</p>
            <span>para ver los horarios disponibles</span>
          </div>
        )}
      </div>
    </div>
  );
}
