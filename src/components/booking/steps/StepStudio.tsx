"use client";

import { memo } from "react";
import type { BookingStudio } from "../booking-types";

interface Props {
  studios: BookingStudio[];
  selectedStudio: BookingStudio | null;
  onSelect: (studio: BookingStudio) => void;
  pc: string;
}

export const StepStudio = memo(function StepStudio({ studios, selectedStudio, onSelect, pc }: Props) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          ¿En qué estudio quieres grabar?
        </h2>
        <p className="text-gray-500 mt-2">Selecciona el espacio para tu sesión</p>
      </div>
      {studios.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No hay estudios disponibles en este momento</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {studios.map((studio) => {
            const isSelected = selectedStudio?.id === studio.id;
            const color = studio.color || pc;
            return (
              <button
                key={studio.id}
                onClick={() => onSelect(studio)}
                className={`text-left rounded-2xl overflow-hidden relative group transition-all duration-200 ${
                  isSelected
                    ? "border-2 shadow-md"
                    : "border border-gray-200 hover:shadow-lg hover:border-gray-300"
                }`}
                style={{ borderColor: isSelected ? color : undefined, background: "white" }}
              >
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl transition-colors ${
                    isSelected ? "" : "bg-gray-200 group-hover:bg-gray-300"
                  }`}
                  style={isSelected ? { background: color } : {}}
                />
                <div className="absolute top-3 right-3">
                  {isSelected ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                      style={{ background: color }}
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
                  <div className="flex items-center gap-2.5 mb-1 pr-8">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <h3 className="text-base font-bold text-gray-900">{studio.name}</h3>
                  </div>
                  {studio.description && (
                    <p className="text-sm text-gray-500 ml-6">{studio.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
