"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
}

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
});

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const data = userSchema.parse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role") ?? "STAFF",
    isActive: formData.get("isActive") !== "false",
  });

  const password = formData.get("password") as string;
  if (!password || password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { ...data, password: hashed, role: data.role ?? "STAFF" },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  revalidatePath("/admin/users");
  return { success: true, data: { user } };
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();
  const data = userSchema.partial().parse({
    email: formData.get("email") || undefined,
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    role: (formData.get("role") as "ADMIN" | "STAFF" | null) ?? undefined,
    isActive: formData.get("isActive") !== null
      ? formData.get("isActive") !== "false"
      : undefined,
  });

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });

  revalidatePath("/admin/users");
  return { success: true, data: { user } };
}

export async function resetUserPassword(id: string, newPassword: string) {
  await requireAdmin();
  if (newPassword.length < 6) throw new Error("Contraseña demasiado corta");
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });
  return { success: true };
}
