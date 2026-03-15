// ─── Prisma 7 Enums (value + type exported together) ─────────────────────────
export {
  Role,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PaymentRecordStatus,
  EquipmentCategory,
} from "@/generated/prisma/enums";

// ─── Model types (Prisma 7 uses *Model suffix) ───────────────────────────────
export type { UserModel as User } from "@/generated/prisma/models/User";
export type { BookingModel as Booking } from "@/generated/prisma/models/Booking";
export type { BookingEquipmentModel as BookingEquipment } from "@/generated/prisma/models/BookingEquipment";
export type { BusinessConfigModel as BusinessConfig } from "@/generated/prisma/models/BusinessConfig";
export type { ClientModel as Client } from "@/generated/prisma/models/Client";
export type { EquipmentModel as Equipment } from "@/generated/prisma/models/Equipment";
export type { ServiceTypeModel as ServiceType } from "@/generated/prisma/models/ServiceType";
export type { StudioModel as Studio } from "@/generated/prisma/models/Studio";
export type { PaymentModel as Payment } from "@/generated/prisma/models/Payment";

// Import raw types for internal use
import type { BookingModel } from "@/generated/prisma/models/Booking";
import type { BookingEquipmentModel } from "@/generated/prisma/models/BookingEquipment";
import type { EquipmentModel } from "@/generated/prisma/models/Equipment";
import type { ServiceTypeModel } from "@/generated/prisma/models/ServiceType";
import type { StudioModel } from "@/generated/prisma/models/Studio";
import type { ClientModel } from "@/generated/prisma/models/Client";
import type { PaymentModel } from "@/generated/prisma/models/Payment";

// ─── Extended types with relations ───────────────────────────────────────────

export type BookingWithRelations = BookingModel & {
  serviceType?: ServiceTypeModel | null;
  studio?: StudioModel | null;
  client?: ClientModel | null;
  equipment?: (BookingEquipmentModel & { equipment: EquipmentModel })[];
  payments?: PaymentModel[];
};

// ─── API response shape ───────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

// ─── Public config (safe to expose to clients) ────────────────────────────────

export interface PublicConfig {
  businessName: string;
  logo?: string | null;
  primaryColor: string;
  secondaryColor: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  availableHours?: unknown;
  bufferTime: number;
  requireDeposit: boolean;
  depositType: string;
  depositAmount: number | string;
  blockedDates?: unknown;
  minAdvanceHours: number;
  termsAndConditions?: string | null;
  cancellationPolicy?: string | null;
  currency: string;
  setupCompleted: boolean;
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  thisMonthBookings: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  revenueByDay: { date: string; revenue: number }[];
  upcomingBookings: BookingWithRelations[];
}

