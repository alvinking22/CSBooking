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

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  projectName: z.string().optional(),
  notes: z.string().optional(),
});

export async function getClients(search?: string) {
  await requireAdmin();
  return prisma.client.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createClient(formData: FormData) {
  await requireAdmin();
  const data = clientSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    projectName: formData.get("projectName") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const client = await prisma.client.create({ data });
  revalidatePath("/admin/clients");
  return { success: true, data: { client } };
}

export async function updateClient(id: string, formData: FormData) {
  await requireAdmin();
  const data = clientSchema.partial().parse({
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    projectName: formData.get("projectName") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const client = await prisma.client.update({ where: { id }, data });
  revalidatePath("/admin/clients");
  return { success: true, data: { client } };
}

export async function deleteClient(id: string) {
  await requireAdmin();
  await prisma.client.delete({ where: { id } });
  revalidatePath("/admin/clients");
  return { success: true };
}

export async function getClientWithBookings(id: string) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      bookings: {
        include: { serviceType: true, studio: true },
        orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
      },
    },
  });
  if (!client) return null;
  // Serialize Decimal/Date fields
  return JSON.parse(JSON.stringify(client));
}
