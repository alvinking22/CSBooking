"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { ClientData } from "../booking-types";

interface Props {
  clientData: ClientData;
  onChange: (data: ClientData) => void;
}

export const StepClientData = memo(function StepClientData({ clientData, onChange }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tus Datos</h2>
        <p className="text-muted-foreground mt-1">
          Necesitamos esta información para confirmar tu reserva
        </p>
      </div>
      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Nombre Completo"
            required
            type="text"
            value={clientData.name}
            onChange={(e) => onChange({ ...clientData, name: e.target.value })}
            placeholder="Tu nombre completo"
          />
          <Input
            label="Correo Electrónico"
            required
            type="email"
            value={clientData.email}
            onChange={(e) => onChange({ ...clientData, email: e.target.value })}
            placeholder="tucorreo@ejemplo.com"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Teléfono"
            required
            type="tel"
            value={clientData.phone}
            onChange={(e) => onChange({ ...clientData, phone: e.target.value })}
            placeholder="+1 809-000-0000"
          />
          <Input
            label="Nombre del Proyecto"
            type="text"
            value={clientData.projectDescription}
            onChange={(e) => onChange({ ...clientData, projectDescription: e.target.value })}
            placeholder="Nombre del proyecto..."
          />
        </div>
        <Textarea
          label="Notas Adicionales"
          value={clientData.notes}
          onChange={(e) => onChange({ ...clientData, notes: e.target.value })}
          placeholder="Requerimientos especiales, preguntas, etc."
          className="h-20"
        />
      </Card>
    </div>
  );
});
