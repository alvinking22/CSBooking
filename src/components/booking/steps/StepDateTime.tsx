"use client";

import { memo } from "react";
import ModernCalendar, { type TimeSlot } from "../ModernCalendar";
import type { BookingService, BookingStudio } from "../booking-types";
import type { PublicConfig } from "@/types";

interface Props {
  selectedDate: Date | null;
  selectedStart: string;
  availableSlots: TimeSlot[];
  selectedService: BookingService | null;
  selectedStudio: BookingStudio | null;
  onDateSelect: (date: Date | null) => void;
  onSlotSelect: (slot: string) => void;
  config: PublicConfig | null;
  pc: string;
}

export const StepDateTime = memo(function StepDateTime({
  selectedDate,
  selectedStart,
  availableSlots,
  selectedService,
  selectedStudio,
  onDateSelect,
  onSlotSelect,
  config,
  pc,
}: Props) {
  function calculateEndTime(start: string, duration: number): string {
    const [h, m] = start.split(":").map(Number);
    const endMinutes = h * 60 + m + (duration || 0) * 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-500">
          Servicio: <strong>{selectedService?.name}</strong> — {selectedService?.duration}h
          {selectedStudio && (
            <>
              {" "}· Estudio: <strong>{selectedStudio.name}</strong>
            </>
          )}
        </p>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900">
        Selecciona Fecha y Hora
      </h2>
      <ModernCalendar
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          onDateSelect(date ?? null);
          onSlotSelect("");
        }}
        availableSlots={availableSlots}
        selectedSlot={selectedStart}
        onSlotSelect={onSlotSelect}
        calculateEndTime={calculateEndTime}
        serviceDuration={selectedService ? Number(selectedService.duration) : undefined}
        primaryColor={pc}
        blockedDates={
          Array.isArray(config?.blockedDates) ? (config.blockedDates as string[]) : []
        }
      />
    </div>
  );
});
