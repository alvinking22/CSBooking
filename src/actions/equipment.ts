"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { z } from "zod";
import { serializePrisma } from "@/lib/serialize";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
}

function safeJsonParse(raw: string | null, fieldName: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Formato inválido en ${fieldName}`);
  }
}

const equipmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([
    "MICROFONOS","CAMARAS","PERSONAS","ILUMINACION",
    "FONDOS","ACCESORIOS","MOBILIARIOS","OTROS",
  ]),
  quantity: z.number().int().positive().optional(),
  isIncluded: z.boolean().optional(),
  extraCost: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  allowQuantitySelection: z.boolean().optional(),
  minQuantity: z.number().int().positive().optional(),
  syncWithParticipants: z.boolean().optional(),
  studioIds: z.array(z.string()).optional().nullable(),
  serviceIds: z.array(z.string()).optional().nullable(),
  options: z.any().optional().nullable(),
});

export async function getEquipment(params?: {
  category?: string;
  studioId?: string;
  serviceId?: string;
  isActive?: boolean;
}) {
  const where: Record<string, unknown> = {};
  if (params?.isActive !== undefined) where.isActive = params.isActive;
  if (params?.category) where.category = params.category;

  const items = await prisma.equipment.findMany({
    where,
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  // Filter by studioId/serviceId (stored as JSON arrays)
  let result = items;
  if (params?.studioId) {
    result = result.filter((e) => {
      const ids = e.studioIds as string[] | null;
      return !ids || ids.length === 0 || ids.includes(params.studioId!);
    });
  }
  if (params?.serviceId) {
    result = result.filter((e) => {
      const ids = e.serviceIds as string[] | null;
      return !ids || ids.length === 0 || ids.includes(params.serviceId!);
    });
  }

  return serializePrisma(result);
}

export async function createEquipment(formData: FormData) {
  await requireAdmin();

  const studioIdsRaw = formData.get("studioIds");
  const serviceIdsRaw = formData.get("serviceIds");
  const optionsRaw = formData.get("options");

  const data = equipmentSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category: formData.get("category") ?? "OTROS",
    quantity: Number(formData.get("quantity") ?? 1),
    isIncluded: formData.get("isIncluded") !== "false",
    extraCost: Number(formData.get("extraCost") ?? 0),
    isActive: formData.get("isActive") !== "false",
    isRequired: formData.get("isRequired") === "true",
    allowQuantitySelection: formData.get("allowQuantitySelection") === "true",
    minQuantity: Number(formData.get("minQuantity") ?? 1),
    syncWithParticipants: formData.get("syncWithParticipants") === "true",
    studioIds: safeJsonParse(studioIdsRaw as string | null, "studioIds"),
    serviceIds: safeJsonParse(serviceIdsRaw as string | null, "serviceIds"),
    options: safeJsonParse(optionsRaw as string | null, "options"),
  });

  const equipment = await prisma.equipment.create({ data: data as Parameters<typeof prisma.equipment.create>[0]["data"] });
  revalidatePath("/admin/equipment");
  return { success: true, data: { equipment: serializePrisma(equipment) } };
}

export async function updateEquipment(id: string, formData: FormData) {
  await requireAdmin();

  const studioIdsRaw = formData.get("studioIds");
  const serviceIdsRaw = formData.get("serviceIds");
  const optionsRaw = formData.get("options");

  const data = equipmentSchema.partial().parse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : undefined,
    isIncluded: formData.get("isIncluded") !== null
      ? formData.get("isIncluded") !== "false"
      : undefined,
    extraCost: formData.get("extraCost") !== null ? Number(formData.get("extraCost")) : undefined,
    isActive: formData.get("isActive") !== null
      ? formData.get("isActive") !== "false"
      : undefined,
    isRequired: formData.get("isRequired") !== null
      ? formData.get("isRequired") === "true"
      : undefined,
    allowQuantitySelection: formData.get("allowQuantitySelection") !== null
      ? formData.get("allowQuantitySelection") === "true"
      : undefined,
    minQuantity: formData.get("minQuantity") ? Number(formData.get("minQuantity")) : undefined,
    syncWithParticipants: formData.get("syncWithParticipants") !== null
      ? formData.get("syncWithParticipants") === "true"
      : undefined,
    studioIds: safeJsonParse(studioIdsRaw as string | null, "studioIds"),
    serviceIds: safeJsonParse(serviceIdsRaw as string | null, "serviceIds"),
    options: optionsRaw !== null ? safeJsonParse(optionsRaw as string | null, "options") : undefined,
  });

  const equipment = await prisma.equipment.update({ where: { id }, data: data as Parameters<typeof prisma.equipment.update>[0]["data"] });
  revalidatePath("/admin/equipment");
  return { success: true, data: { equipment: serializePrisma(equipment) } };
}

export async function deleteEquipment(id: string) {
  await requireAdmin();
  const item = await prisma.equipment.findUnique({ where: { id } });
  if (item?.image) {
    try {
      await del(item.image);
    } catch {
      // Ignore blob deletion errors
    }
  }
  await prisma.equipment.delete({ where: { id } });
  revalidatePath("/admin/equipment");
  return { success: true };
}

export async function uploadEquipmentImage(id: string, file: File) {
  await requireAdmin();

  const item = await prisma.equipment.findUnique({ where: { id } });

  // Delete old image if exists
  if (item?.image) {
    try {
      await del(item.image);
    } catch {
      // Ignore
    }
  }

  const blob = await put(`equipment/${id}-${Date.now()}.${file.name.split(".").pop()}`, file, {
    access: "public",
  });

  const equipment = await prisma.equipment.update({
    where: { id },
    data: { image: blob.url },
  });

  revalidatePath("/admin/equipment");
  return { success: true, data: { equipment: serializePrisma(equipment), imageUrl: blob.url } };
}
