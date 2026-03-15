// ─── Booking page shared types ────────────────────────────────────────────────

export interface BookingService {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  basePrice: number;
  isActive: boolean;
}

export interface BookingStudio {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  maxParticipants?: number | null;
  isActive: boolean;
}

interface EquipmentOption {
  id: string;
  name: string;
  extraCost?: number;
  image?: string;
  hasTextField?: boolean;
  textFieldLabel?: string;
}

export interface BookingEquipmentItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  image?: string | null;
  quantity: number;
  extraCost: number;
  isIncluded: boolean;
  isRequired: boolean;
  allowQuantitySelection: boolean;
  minQuantity?: number | null;
  syncWithParticipants?: boolean | null;
  options?: Record<string, { types?: EquipmentOption[] }> | null;
  specifications?: Record<string, unknown> | null;
}

export interface EquipmentDetail {
  quantity: number;
  selectedOption: string | null;
  textFieldValue: string;
}

export interface CalendarBooking {
  sessionDate: string;
  startTime: string;
  endTime: string;
  studioId: string | null;
}

export interface ClientData {
  name: string;
  email: string;
  phone: string;
  projectDescription: string;
  notes: string;
}

export interface Pricing {
  base: number;
  extras: number;
  total: number;
  deposit: number;
}
