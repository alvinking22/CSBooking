"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serializePrisma } from "@/lib/serialize";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
  return session;
}

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  duration: z.number().int().positive(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function getServices() {
  const services = await prisma.serviceType.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return serializePrisma(services);
}

export async function createService(formData: FormData) {
  await requireAdmin();
  const data = serviceSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    basePrice: Number(formData.get("basePrice")),
    duration: Number(formData.get("duration")),
    isActive: formData.get("isActive") === "true",
    order: Number(formData.get("order") ?? 0),
  });
  const service = await prisma.serviceType.create({ data });
  revalidatePath("/admin/services");
  return { success: true, data: { service: serializePrisma(service) } };
}

export async function updateService(id: string, formData: FormData) {
  await requireAdmin();
  const data = serviceSchema.partial().parse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    basePrice: formData.get("basePrice") ? Number(formData.get("basePrice")) : undefined,
    duration: formData.get("duration") ? Number(formData.get("duration")) : undefined,
    isActive: formData.get("isActive") !== null ? formData.get("isActive") === "true" : undefined,
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
  });
  const service = await prisma.serviceType.update({ where: { id }, data });
  revalidatePath("/admin/services");
  return { success: true, data: { service: serializePrisma(service) } };
}

export async function deleteService(id: string) {
  await requireAdmin();
  await prisma.serviceType.delete({ where: { id } });
  revalidatePath("/admin/services");
  return { success: true };
}
