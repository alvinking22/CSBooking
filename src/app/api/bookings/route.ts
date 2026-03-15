import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import { z } from "zod";
import { sendBookingConfirmation } from "@/lib/email";

const bookingSchema = z.object({
  serviceTypeId: z.string().uuid(),
  studioId: z.string().uuid().optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().positive(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(7).max(20).optional(),
  projectDescription: z.string().optional(),
  clientNotes: z.string().optional(),
  participants: z.number().int().positive().optional(),
  termsAccepted: z.boolean().optional(),
  turnstileToken: z.string().optional(),
  equipmentItems: z
    .array(
      z.object({
        equipmentId: z.string().uuid(),
        quantity: z.number().int().positive(),
        selectedOption: z.string().optional(),
        textFieldValue: z.string().optional(),
        cost: z.number(),
      })
    )
    .optional(),
});

function generateBookingNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `CS-${dateStr}-${rand}`;
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function addHours(time: string, hours: number): string {
  return addMinutes(time, Math.round(hours * 60));
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: "Demasiadas solicitudes. Intenta en un minuto." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Datos inválidos", errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify Turnstile token if secret key is configured
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!data.turnstileToken) {
        return NextResponse.json(
          { success: false, message: "Verificación de seguridad requerida" },
          { status: 400 }
        );
      }
      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: data.turnstileToken,
          }),
        }
      );
      const verifyData = await verifyRes.json() as { success: boolean };
      if (!verifyData.success) {
        return NextResponse.json(
          { success: false, message: "Verificación de seguridad fallida. Intenta de nuevo." },
          { status: 400 }
        );
      }
    }

    const sessionDate = new Date(data.sessionDate);
    const endTime = addHours(data.startTime, data.duration);

    // Wrap availability check + booking creation in a serializable transaction
    // to prevent race conditions (double-booking the same slot)
    const booking = await prisma.$transaction(async (tx) => {
      const [config, conflicts, service] = await Promise.all([
        tx.businessConfig.findFirst(),
        tx.booking.findMany({
          where: {
            sessionDate,
            studioId: data.studioId ?? null,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        }),
        tx.serviceType.findUnique({ where: { id: data.serviceTypeId } }),
      ]);

      if (!config) {
        throw new Error("CONFIG_NOT_FOUND");
      }

      // Check availability
      const bufferTime = config.bufferTime ?? 30;

      for (const conflict of conflicts) {
        const existStart = conflict.startTime;
        const existEndWithBuffer = addMinutes(conflict.endTime, bufferTime);
        const newEndWithBuffer = addMinutes(endTime, bufferTime);

        const overlaps =
          data.startTime < existEndWithBuffer && newEndWithBuffer > existStart;

        if (overlaps) {
          throw new Error("SLOT_UNAVAILABLE");
        }
      }

      const basePrice = Number(service?.basePrice ?? 0);

      // Calculate equipment cost
      let equipmentCost = 0;
      for (const item of data.equipmentItems ?? []) {
        equipmentCost += item.cost * item.quantity;
      }

      const totalPrice = basePrice + equipmentCost;
      let depositAmount = 0;
      if (config.requireDeposit) {
        depositAmount =
          config.depositType === "percentage"
            ? (totalPrice * Number(config.depositAmount)) / 100
            : Number(config.depositAmount);
      }

      // Upsert client
      let clientId: string | undefined;
      try {
        const client = await tx.client.upsert({
          where: { email: data.clientEmail },
          update: {
            name: data.clientName,
            phone: data.clientPhone ?? undefined,
            bookingCount: { increment: 1 },
          },
          create: {
            name: data.clientName,
            email: data.clientEmail,
            phone: data.clientPhone,
            bookingCount: 1,
          },
        });
        clientId = client.id;
      } catch {
        // Client upsert failed, continue without clientId
      }

      // Generate unique booking number
      let bookingNumber = generateBookingNumber();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await tx.booking.findUnique({ where: { bookingNumber } });
        if (!existing) break;
        bookingNumber = generateBookingNumber();
        attempts++;
      }
      if (attempts >= 10) {
        throw new Error("BOOKING_NUMBER_EXHAUSTED");
      }

      // Create booking
      return tx.booking.create({
        data: {
          bookingNumber,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          sessionDate,
          startTime: data.startTime,
          endTime,
          duration: data.duration,
          serviceTypeId: data.serviceTypeId,
          studioId: data.studioId,
          clientId,
          projectDescription: data.projectDescription,
          clientNotes: data.clientNotes,
          participants: data.participants ?? 1,
          basePrice,
          equipmentCost,
          totalPrice,
          depositAmount,
          remainingAmount: totalPrice,
          termsAcceptedAt: data.termsAccepted ? new Date() : null,
          equipment: data.equipmentItems?.length
            ? {
                create: data.equipmentItems.map((item) => ({
                  equipmentId: item.equipmentId,
                  quantity: item.quantity,
                  cost: item.cost,
                  selectedOption: item.selectedOption,
                  textFieldValue: item.textFieldValue,
                })),
              }
            : undefined,
        },
        include: { serviceType: true, studio: true, equipment: true },
      });
    }, { isolationLevel: "Serializable" });

    // Fire-and-forget: send confirmation email (don't block response)
    sendBookingConfirmation({
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      bookingNumber: booking.bookingNumber,
      sessionDate: data.sessionDate,
      startTime: data.startTime,
      endTime: addHours(data.startTime, data.duration),
      serviceName: booking.serviceType?.name || "Sesión",
      studioName: booking.studio?.name,
      totalPrice: Number(booking.totalPrice),
      depositAmount: Number(booking.depositAmount) || undefined,
    });

    return NextResponse.json({ success: true, data: { booking: serializePrisma(booking) } }, { status: 201 });
  } catch (error) {
    // Handle known error types with proper HTTP status codes
    if (error instanceof Error) {
      if (error.message === "SLOT_UNAVAILABLE") {
        return NextResponse.json(
          { success: false, message: "El horario seleccionado no está disponible" },
          { status: 409 }
        );
      }
      if (error.message === "CONFIG_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "Configuración no encontrada" },
          { status: 500 }
        );
      }
      if (error.message === "BOOKING_NUMBER_EXHAUSTED") {
        return NextResponse.json(
          { success: false, message: "Error generando número de reserva. Intenta de nuevo." },
          { status: 500 }
        );
      }
      // Prisma transaction conflict (serializable isolation retry)
      const prismaError = error as Error & { code?: string };
      if (prismaError.code === "P2034") {
        return NextResponse.json(
          { success: false, message: "Conflicto de concurrencia. Intenta de nuevo." },
          { status: 409 }
        );
      }
    }
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { success: false, message: "Error al crear la reserva" },
      { status: 500 }
    );
  }
}
