"use client";

import { memo } from "react";
import type { BookingService } from "../booking-types";

interface Props {
  services: BookingService[];
  selectedService: BookingService | null;
  onSelect: (service: BookingService) => void;
  pc: string;
}

export const StepService = memo(function StepService({ services, selectedService, onSelect, pc }: Props) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          ¿Qué tipo de sesión necesitas?
        </h2>
        <p className="text-gray-500 mt-2">
          Selecciona el servicio que mejor se adapta a tu proyecto
        </p>
      </div>
      {services.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No hay servicios disponibles en este momento</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const isSelected = selectedService?.id === service.id;
            return (
              <button
                key={service.id}
                onClick={() => onSelect(service)}
                className={`text-left rounded-2xl overflow-hidden relative group transition-all duration-200 ${
                  isSelected
                    ? "border-2 shadow-md"
                    : "border border-gray-200 hover:shadow-lg hover:border-gray-300"
                }`}
                style={{ borderColor: isSelected ? pc : undefined, background: "white" }}
              >
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl transition-colors ${
                    isSelected ? "" : "bg-gray-200 group-hover:bg-gray-300"
                  }`}
                  style={isSelected ? { background: pc } : {}}
                />
                <div className="absolute top-3 right-3">
                  {isSelected ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                      style={{ background: pc }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-gray-300 transition-colors" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-1 pr-8">
                    {service.name}
                  </h3>
                  {service.description ? (
                    <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                  ) : (
                    <p className="mb-4">&nbsp;</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      {service.duration} hora{Number(service.duration) !== 1 ? "s" : ""}
                    </span>
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: pc }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
