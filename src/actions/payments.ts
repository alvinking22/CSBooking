"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PaymentMethod, PaymentType } from "@/types";
import { serializePrisma } from "@/lib/serialize";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
  return session;
}

const paymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "AZUL", "OTHER"]),
  paymentType: z.enum(["DEPOSIT", "FULL", "PARTIAL", "REFUND"]),
  notes: z.string().optional(),
  reference: z.string().optional(),
  transactionId: z.string().optional(),
});

export async function createPayment(formData: FormData) {
  const session = await requireAdmin();

  const data = paymentSchema.parse({
    bookingId: formData.get("bookingId"),
    amount: Number(formData.get("amount")),
    paymentMethod: formData.get("paymentMethod"),
    paymentType: formData.get("paymentType"),
    notes: formData.get("notes") || undefined,
    reference: formData.get("reference") || undefined,
    transactionId: formData.get("transactionId") || undefined,
  });

  // Atomic: create payment + update booking balance in a single transaction
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        ...data,
        paymentMethod: data.paymentMethod as PaymentMethod,
        paymentType: data.paymentType as PaymentType,
        status: "COMPLETED",
        processedById: session.user.id,
      },
    });

    const booking = await tx.booking.findUnique({ where: { id: data.bookingId } });
    if (booking) {
      const newPaid = Number(booking.paidAmount) + data.amount;
      const total = Number(booking.totalPrice);
      const newPaymentStatus =
        newPaid >= total ? "PAID" : newPaid > 0 ? "DEPOSIT_PAID" : "PENDING";

      await tx.booking.update({
        where: { id: data.bookingId },
        data: {
          paidAmount: newPaid,
          remainingAmount: Math.max(0, total - newPaid),
          paymentStatus: newPaymentStatus,
          paymentMethod: data.paymentMethod as PaymentMethod,
        },
      });
    }

    return created;
  });

  revalidatePath(`/admin/bookings/${data.bookingId}`);
  revalidatePath("/admin/payments");
  return { success: true, data: { payment: serializePrisma(payment) } };
}

export async function getPayments() {
  await requireAdmin();
  const payments = await prisma.payment.findMany({
    include: { booking: { select: { bookingNumber: true, clientName: true } }, processedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return serializePrisma(payments);
}

export async function deletePayment(id: string) {
  await requireAdmin();

  // Atomic: delete payment + recalculate booking balance in a single transaction
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id } });
    if (!payment) throw new Error("Pago no encontrado");

    await tx.payment.delete({ where: { id } });

    // Recalculate from remaining completed payments
    const remaining = await tx.payment.findMany({
      where: { bookingId: payment.bookingId, status: "COMPLETED" },
    });
    const totalPaid = remaining.reduce((s, p) => s + Number(p.amount), 0);

    const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (booking) {
      const total = Number(booking.totalPrice);
      const newStatus =
        totalPaid >= total ? "PAID" : totalPaid > 0 ? "DEPOSIT_PAID" : "PENDING";
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paidAmount: totalPaid,
          remainingAmount: Math.max(0, total - totalPaid),
          paymentStatus: newStatus,
        },
      });
    }
  });

  revalidatePath("/admin/payments");
  return { success: true };
}
