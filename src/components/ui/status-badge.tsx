import * as React from "react";
import { Badge, type BadgeProps } from "./badge";

type StatusKey =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "active"
  | "inactive"
  | "admin"
  | "staff"
  | "user";

const STATUS_CONFIG: Record<StatusKey, { label: string; variant: BadgeProps["variant"] }> = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "info" },
  completed: { label: "Completada", variant: "success" },
  cancelled: { label: "Cancelada", variant: "danger" },
  no_show: { label: "No Show", variant: "muted" },
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "muted" },
  admin: { label: "Admin", variant: "default" },
  staff: { label: "Staff", variant: "secondary" },
  user: { label: "Usuario", variant: "secondary" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status?.toLowerCase() as StatusKey;
  const cfg = STATUS_CONFIG[key] ?? { label: status, variant: "secondary" as const };
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}
