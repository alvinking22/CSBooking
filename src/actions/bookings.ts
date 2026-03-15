"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serializePrisma } from "@/lib/serialize";
import { sendBookingStatusUpdate } from "@/lib/email";

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  return session;
}

async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") throw new Error("No autorizado");
  return session;
}

export async function getBookings(params?: {
  status?: string;
  date?: string;
  search?: string;
  page?: number;
}) {
  await requireAuth();
  const page = params?.page ?? 1;
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (params?.status && params.status !== "all") {
    where.status = params.status.toUpperCase();
  }
  if (params?.date) {
    where.sessionDate = new Date(params.date);
  }
  if (params?.search) {
    where.OR = [
      { clientName: { contains: params.search, mode: "insensitive" } },
      { clientEmail: { contains: params.search, mode: "insensitive" } },
      { bookingNumber: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { serviceType: true, studio: true, client: true },
      orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return serializePrisma({ bookings, total, pages: Math.ceil(total / limit) });
}

export async function getBookingById(id: string) {
  await requireAuth();
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      serviceType: true,
      studio: true,
      client: true,
      equipment: { include: { equipment: true } },
      payments: true,
    },
  });
  return booking ? serializePrisma(booking) : null;
}

export async function getBookingByNumber(bookingNumber: string) {
  await requireAuth();
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: { serviceType: true, studio: true, equipment: { include: { equipment: true } } },
  });
  return booking ? serializePrisma(booking) : null;
}

export async function confirmBooking(id: string) {
  await requireAdmin();
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: "CONFIRMED", confirmationSentAt: new Date() },
  });
  // Fire-and-forget email
  sendBookingStatusUpdate(
    booking.clientEmail,
    booking.clientName,
    booking.bookingNumber,
    "CONFIRMED"
  );
  revalidatePath("/admin/bookings");
  return { success: true, data: { booking: serializePrisma(booking) } };
}

export async function cancelBooking(
  id: string,
  reason?: string,
  cancelledBy: "admin" | "client" = "admin"
) {
  await requireAdmin();
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancelledBy,
    },
  });
  sendBookingStatusUpdate(
    booking.clientEmail,
    booking.clientName,
    booking.bookingNumber,
    "CANCELLED"
  );
  revalidatePath("/admin/bookings");
  return { success: true, data: { booking: serializePrisma(booking) } };
}

export async function rescheduleBooking(
  id: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string
) {
  await requireAdmin();
  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) throw new Error("Reserva no encontrada");

  const rescheduledFrom = {
    date: current.sessionDate,
    startTime: current.startTime,
    endTime: current.endTime,
    rescheduledAt: new Date().toISOString(),
    rescheduledBy: "admin",
  };

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      sessionDate: new Date(newDate),
      startTime: newStartTime,
      endTime: newEndTime,
      rescheduledFrom,
    },
  });
  revalidatePath("/admin/bookings");
  return { success: true, data: { booking: serializePrisma(booking) } };
}

export async function updateBookingStatus(
  id: string,
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
) {
  await requireAdmin();
  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/bookings");
  return { success: true, data: { booking: serializePrisma(booking) } };
}

export async function updateBookingNotes(id: string, adminNotes: string) {
  await requireAdmin();
  const booking = await prisma.booking.update({
    where: { id },
    data: { adminNotes },
  });
  revalidatePath(`/admin/bookings/${id}`);
  return { success: true, data: { booking: serializePrisma(booking) } };
}

export async function getDashboardStats() {
  await requireAuth();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // All queries run in parallel — no waterfall
  const [thisMonth, total, pending, confirmed, upcoming, revenueByDay] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.findMany({
      where: {
        sessionDate: { gte: startOfDay },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { serviceType: true, studio: true },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      take: 5,
    }),
    // GROUP BY in SQL — avoids fetching all rows to aggregate in JS
    prisma.$queryRaw<{ date: string; revenue: number }[]>`
      SELECT
        TO_CHAR("sessionDate", 'YYYY-MM-DD') AS date,
        SUM("totalPrice")::float              AS revenue
      FROM bookings
      WHERE "sessionDate" >= ${thirtyDaysAgo}
        AND status IN ('CONFIRMED', 'COMPLETED')
      GROUP BY "sessionDate"
      ORDER BY "sessionDate" ASC
    `,
  ]);

  return serializePrisma({
    thisMonthBookings: thisMonth,
    totalBookings: total,
    pendingBookings: pending,
    confirmedBookings: confirmed,
    upcomingBookings: upcoming,
    revenueByDay: revenueByDay.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
  });
}

export async function updateBooking(
  id: string,
  data: {
    serviceTypeId: string;
    studioId?: string | null;
    sessionDate: string;
    startTime: string;
    endTime: string;
    duration: number;
    clientName: string;
    clientEmail: string;
    clientPhone?: string | null;
    projectDescription?: string | null;
    clientNotes?: string | null;
    participants?: number | null;
    equipmentItems: Array<{
      equipmentId: string;
      quantity: number;
      selectedOption?: string | null;
      textFieldValue?: string | null;
      cost: number;
    }>;
  }
) {
  await requireAdmin();

  const service = await prisma.serviceType.findUnique({ where: { id: data.serviceTypeId } });
  const eqCost = data.equipmentItems.reduce(
    (sum, item) => sum + item.cost * item.quantity,
    0
  );
  const basePrice = Number(service?.basePrice || 0);
  const totalPrice = basePrice + eqCost;

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      serviceTypeId: data.serviceTypeId,
      studioId: data.studioId || null,
      sessionDate: new Date(data.sessionDate + "T12:00:00"),
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone || null,
      projectDescription: data.projectDescription || null,
      clientNotes: data.clientNotes || null,
      participants: data.participants || null,
      basePrice,
      equipmentCost: eqCost,
      totalPrice,
      equipment: {
        deleteMany: {},
        create: data.equipmentItems.map((item) => ({
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          selectedOption: item.selectedOption || null,
          textFieldValue: item.textFieldValue || null,
          cost: item.cost,
        })),
      },
    },
  });

  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
  return { success: true, data: { booking: serializePrisma(booking) } };
}

export async function getCalendarBookings(startDate: string, endDate: string) {
  await requireAuth();
  const bookings = await prisma.booking.findMany({
    where: {
      sessionDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: { serviceType: true, studio: true },
    orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
  });
  return serializePrisma(bookings);
}
