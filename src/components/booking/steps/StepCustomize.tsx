"use client";

import { memo } from "react";
import NextImage from "next/image";
import { Mic, Video, Image as ImageIcon, Table2, Armchair, Package, Lock, Stamp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { BookingStudio, BookingEquipmentItem, EquipmentDetail } from "../booking-types";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  MICROFONOS: "Micrófonos",
  CAMARAS: "Cámaras",
  PERSONAS: "Base Mic",
  ILUMINACION: "Logo",
  FONDOS: "Fondos",
  ACCESORIOS: "Mesas",
  MOBILIARIOS: "Muebles",
  OTROS: "Otros",
};

// Hoisted at module level — rendering-hoist-jsx
const DISPLAY_ORDER = ["FONDOS", "ACCESORIOS", "MOBILIARIOS", "PERSONAS", "MICROFONOS", "ILUMINACION", "CAMARAS", "OTROS"];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  MICROFONOS: <Mic className="w-3.5 h-3.5 text-gray-600" />,
  CAMARAS: <Video className="w-3.5 h-3.5 text-gray-600" />,
  PERSONAS: <Mic className="w-3.5 h-3.5 text-gray-600" />,
  ILUMINACION: <Stamp className="w-3.5 h-3.5 text-gray-600" />,
  FONDOS: <ImageIcon className="w-3.5 h-3.5 text-gray-600" />,
  ACCESORIOS: <Table2 className="w-3.5 h-3.5 text-gray-600" />,
  MOBILIARIOS: <Armchair className="w-3.5 h-3.5 text-gray-600" />,
  OTROS: <Package className="w-3.5 h-3.5 text-gray-600" />,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  equipment: BookingEquipmentItem[];
  selectedEquipment: string[];
  equipmentDetails: Record<string, EquipmentDetail>;
  participants: number | null;
  equipmentLoaded: boolean;
  lockedCategories: Record<string, string>;
  groupedEquipment: Record<string, BookingEquipmentItem[]>;
  notes: string;
  selectedStudio: BookingStudio | null;
  selectCategoryItem: (category: string, itemId: string) => void;
  handleSetParticipants: (n: number) => void;
  onNotesChange: (notes: string) => void;
  pc: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const StepCustomize = memo(function StepCustomize({
  equipment,
  selectedEquipment,
  equipmentLoaded,
  participants,
  lockedCategories,
  groupedEquipment,
  notes,
  selectedStudio,
  selectCategoryItem,
  handleSetParticipants,
  onNotesChange,
  pc,
}: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-base font-bold text-gray-900 mb-1">Personaliza tu Set</h2>
      <p className="text-gray-400 text-xs mb-4">
        Configura los detalles de tu sesión
        {selectedStudio ? ` en ${selectedStudio.name}` : ""}
      </p>

      {!equipmentLoaded ? (
        <div className="flex justify-center py-12">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: pc }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">

          {/* ── PARTICIPANTES — full width ── */}
          {selectedStudio != null && (selectedStudio.maxParticipants ?? 0) > 0 && (
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-xs text-gray-900 block">Participantes</span>
                  <span className="text-[10px] text-gray-400">Max. {selectedStudio.maxParticipants} personas</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: selectedStudio.maxParticipants ?? 0 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSetParticipants(n)}
                    className="py-2.5 rounded-lg border-2 text-center font-bold text-sm transition-all"
                    style={{
                      borderColor: participants === n ? pc : "#E5E7EB",
                      background: participants === n ? `${pc}10` : "white",
                      color: participants === n ? pc : "#6B7280",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FONDOS ── */}
          {(groupedEquipment["FONDOS"]?.length ?? 0) > 0 && (
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                  {CATEGORY_ICONS["FONDOS"]}
                </div>
                <span className="font-semibold text-xs text-gray-900">Fondo</span>
                <span className="text-[10px] text-gray-400">Selecciona uno</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {groupedEquipment["FONDOS"].map((item) => {
                  const isSelected = selectedEquipment.includes(item.id);
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => selectCategoryItem("FONDOS", item.id)}
                        className="w-full rounded-lg border-2 overflow-hidden text-left transition-all"
                        style={{ borderColor: isSelected ? pc : "#E5E7EB" }}
                      >
                        {item.image ? (
                          <div className="h-14 overflow-hidden relative">
                            <NextImage src={item.image} alt={item.name} fill className="object-cover" sizes="200px" />
                          </div>
                        ) : (
                          <div className="h-14 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <span className="text-gray-500 font-medium text-[10px]">Sin imagen</span>
                          </div>
                        )}
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <span className="font-medium text-[11px] text-gray-900 line-clamp-2 pr-1">{item.name}</span>
                          {isSelected ? (
                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pc }}>
                              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RESTO DE CATEGORÍAS con orden definido ── */}
          {DISPLAY_ORDER.filter(cat => cat !== "FONDOS" && groupedEquipment[cat]?.length > 0).map((category) => {
            const items = groupedEquipment[category];
            const isLocked = !!lockedCategories[category];
            const lockedItemId = lockedCategories[category];
            const displayItems = isLocked ? items.filter(i => i.id === lockedItemId) : items;

            return (
              <div
                key={category}
                className={`col-span-2 bg-white rounded-xl border border-gray-200 p-3 ${isLocked ? "opacity-70" : ""}`}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    {CATEGORY_ICONS[category] || <Package className="w-3.5 h-3.5 text-gray-600" />}
                  </div>
                  <span className="font-semibold text-xs text-gray-900">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  {isLocked ? (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Selección automática
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Selecciona uno</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {displayItems.map((item) => {
                    const isSelected = selectedEquipment.includes(item.id);
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => selectCategoryItem(category, item.id)}
                          disabled={isLocked}
                          className={`w-full rounded-lg border-2 px-3 py-2.5 flex items-center gap-2.5 transition-all text-left ${isLocked ? "cursor-default" : ""}`}
                          style={{
                            borderColor: isSelected ? pc : "#E5E7EB",
                            background: isSelected ? `${pc}08` : "white",
                          }}
                        >
                          {item.image && (
                            <NextImage src={item.image} alt={item.name} width={32} height={32} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-xs text-gray-900 block">{item.name}</span>
                          </div>
                          {isSelected ? (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pc }}>
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── COMENTARIOS — full width ── */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <span className="font-semibold text-xs text-gray-900">Comentario</span>
              <span className="text-[10px] text-gray-400">(Opcional)</span>
            </div>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Detalles adicionales de tu set..."
              className="text-xs min-h-[unset]"
            />
          </div>

          {/* ── SUMMARY BAR — full width ── */}
          {(() => {
            const parts: string[] = [];
            if (participants)
              parts.push(`${participants} persona${participants > 1 ? "s" : ""}`);
            selectedEquipment.forEach((id) => {
              const item = equipment.find((e) => e.id === id);
              if (item) parts.push(item.name);
            });
            return parts.length > 0 ? (
              <div className="col-span-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-[10px] text-gray-400 mb-0.5">Tu set</p>
                <p className="text-xs font-medium text-gray-900 line-clamp-2">
                  {parts.join(" · ")}
                </p>
              </div>
            ) : null;
          })()}

        </div>
      )}
    </div>
  );
});
