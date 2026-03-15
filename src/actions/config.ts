"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { serializePrisma } from "@/lib/serialize";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
}

const configUpdateSchema = z.object({
  businessName: z.string().min(1).max(255).optional(),
  logo: z.string().max(500).nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  instagram: z.string().max(255).nullable().optional(),
  facebook: z.string().max(255).nullable().optional(),
  website: z.string().max(255).nullable().optional(),
  availableHours: z.any().optional(),
  bufferTime: z.number().int().min(0).nullable().optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
  currency: z.string().max(3).optional(),
  requireDeposit: z.boolean().nullable().optional(),
  depositType: z.string().max(20).optional(),
  depositAmount: z.number().min(0).nullable().optional(),
  sendConfirmationEmail: z.boolean().nullable().optional(),
  sendReminderEmail: z.boolean().nullable().optional(),
  reminderHoursBefore: z.number().int().min(0).nullable().optional(),
  minAdvanceHours: z.number().int().min(0).nullable().optional(),
  blockedDates: z.any().optional(),
  termsAndConditions: z.string().nullable().optional(),
  cancellationPolicy: z.string().nullable().optional(),
  azulEnabled: z.boolean().nullable().optional(),
  azulMerchantId: z.string().max(255).nullable().optional(),
  azulAuthKey: z.string().max(255).nullable().optional(),
  azulMode: z.string().max(20).optional(),
  setupCompleted: z.boolean().nullable().optional(),
}).strict();

export async function getConfig() {
  await requireAdmin();
  const config = await prisma.businessConfig.findFirst();
  return config ? serializePrisma(config) : null;
}

export async function updateConfig(updates: Record<string, unknown>) {
  await requireAdmin();

  const validated = configUpdateSchema.parse(updates);

  const config = await prisma.businessConfig.findFirst();
  if (!config) throw new Error("Configuración no inicializada. Ejecuta el seed.");

  const updated = await prisma.businessConfig.update({
    where: { id: config.id },
    data: validated,
  });

  revalidatePath("/admin/settings");
  return { success: true, data: { config: serializePrisma(updated) } };
}
