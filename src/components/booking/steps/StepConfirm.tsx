"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatMoney } from "@/utils/formatMoney";
import type { BookingService, BookingStudio, BookingEquipmentItem, ClientData, Pricing } from "../booking-types";
import type { PublicConfig } from "@/types";

// Turnstile loaded dynamically — only at step 6 (bundle-defer-third-party)
const Turnstile = dynamic(
  () => import("@marsidev/react-turnstile").then((m) => ({ default: m.Turnstile })),
  { ssr: false }
);

function calculateEndTime(start: string, duration: number): string {
  const [h, m] = start.split(":").map(Number);
  const endMinutes = h * 60 + m + (duration || 0) * 60;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

interface Props {
  selectedService: BookingService | null;
  selectedStudio: BookingStudio | null;
  selectedDate: Date | null;
  selectedStart: string;
  participants: number | null;
  selectedEquipment: string[];
  equipment: BookingEquipmentItem[];
  clientData: ClientData;
  pricing: Pricing;
  config: PublicConfig | null;
  termsAccepted: boolean;
  turnstileSiteKey: string | undefined;
  onTermsChange: (accepted: boolean) => void;
  onTurnstileSuccess: (token: string) => void;
  onTurnstileExpire: () => void;
  onTurnstileError: () => void;
  pc: string;
}

export const StepConfirm = memo(function StepConfirm({
  selectedService,
  selectedStudio,
  selectedDate,
  selectedStart,
  participants,
  selectedEquipment,
  equipment,
  clientData,
  pricing,
  config,
  termsAccepted,
  turnstileSiteKey,
  onTermsChange,
  onTurnstileSuccess,
  onTurnstileExpire,
  onTurnstileError,
  pc,
}: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Confirma tu Reserva</h2>
        <p className="text-gray-500 mt-1">Revisa los detalles antes de confirmar</p>
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Servicio</h3>
          <div>
            <p className="font-medium text-gray-900">{selectedService?.name}</p>
            {selectedService?.description && (
              <p className="text-sm text-gray-500">{selectedService.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {selectedService?.duration} hora(s)
            </p>
          </div>
        </div>

        {selectedStudio && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Estudio</h3>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ background: selectedStudio.color || pc }}
              />
              <p className="font-medium text-gray-900">{selectedStudio.name}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Detalles de la Sesión</h3>
          <div className="space-y-3">
            <Row
              label="Fecha"
              value={
                selectedDate
                  ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
                  : ""
              }
            />
            <Row
              label="Hora"
              value={`${selectedStart} → ${calculateEndTime(selectedStart, Number(selectedService?.duration))}`}
            />
            <Row label="Duración" value={`${selectedService?.duration} hora(s)`} />
            {participants != null && participants > 0 && (
              <Row
                label="Participantes"
                value={`${participants} persona${participants > 1 ? "s" : ""}`}
              />
            )}
          </div>
        </div>

        {selectedEquipment.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Equipos Seleccionados</h3>
            <div className="space-y-2">
              {selectedEquipment.map((id) => {
                const item = equipment.find((e) => e.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center text-sm">
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tus Datos</h3>
          <div className="space-y-3">
            <Row label="Nombre" value={clientData.name} />
            <Row label="Email" value={clientData.email} />
            <Row label="Teléfono" value={clientData.phone} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Resumen de Precio</h3>
          <div className="space-y-2">
            <Row label="Servicio base" value={`$${formatMoney(pricing.base)}`} />
            {pricing.extras > 0 && (
              <Row label="Extras" value={`$${formatMoney(pricing.extras)}`} />
            )}
            <div className="border-t border-gray-100 pt-2 mt-2">
              <Row label="Total" value={`$${formatMoney(pricing.total)}`} />
            </div>
            {config?.requireDeposit && pricing.deposit > 0 && (
              <Row
                label="Depósito requerido"
                value={`$${formatMoney(pricing.deposit)}`}
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          {config?.termsAndConditions ? (
            <>
              <h3 className="font-semibold text-gray-900 mb-3">Términos y Condiciones</h3>
              <div className="max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap mb-3">
                {config.termsAndConditions}
              </div>
              {config.cancellationPolicy && (
                <>
                  <h4 className="font-medium text-gray-700 text-sm mb-2">
                    Política de Cancelación
                  </h4>
                  <div className="max-h-28 overflow-y-auto p-3 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap mb-3">
                    {config.cancellationPolicy}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600 mb-3">
              Al confirmar esta reserva, aceptas las condiciones del servicio y la política de cancelación del estudio.
            </p>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => onTermsChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-ring focus:ring-offset-1"
              style={{ accentColor: pc }}
            />
            <span className="text-sm text-gray-700">
              Acepto los términos y condiciones
            </span>
          </label>
        </div>
      </div>

      {turnstileSiteKey && (
        <div className="flex justify-center mt-4">
          <Turnstile
            siteKey={turnstileSiteKey}
            onSuccess={onTurnstileSuccess}
            onExpire={onTurnstileExpire}
            onError={onTurnstileError}
          />
        </div>
      )}
    </div>
  );
});
