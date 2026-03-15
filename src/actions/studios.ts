"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
}

const studioSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
  maxParticipants: z.number().int().positive().optional().nullable(),
});

export async function getStudios() {
  return prisma.studio.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createStudio(formData: FormData) {
  await requireAdmin();
  const data = studioSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    color: formData.get("color") || "#3B82F6",
    isActive: formData.get("isActive") !== "false",
    order: Number(formData.get("order") ?? 0),
    maxParticipants: formData.get("maxParticipants")
      ? Number(formData.get("maxParticipants"))
      : null,
  });
  const studio = await prisma.studio.create({ data });
  revalidatePath("/admin/studios");
  return { success: true, data: { studio } };
}

export async function updateStudio(id: string, formData: FormData) {
  await requireAdmin();
  const data = studioSchema.partial().parse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    color: formData.get("color") || undefined,
    isActive: formData.get("isActive") !== null
      ? formData.get("isActive") !== "false"
      : undefined,
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
    maxParticipants: formData.get("maxParticipants")
      ? Number(formData.get("maxParticipants"))
      : undefined,
  });
  const studio = await prisma.studio.update({ where: { id }, data });
  revalidatePath("/admin/studios");
  return { success: true, data: { studio } };
}

export async function deleteStudio(id: string) {
  await requireAdmin();
  await prisma.studio.delete({ where: { id } });
  revalidatePath("/admin/studios");
  return { success: true };
}
