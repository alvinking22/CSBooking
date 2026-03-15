/**
 * Script para resetear la contraseña del administrador
 * Uso: node scripts/reset-password.mjs [email] [nuevaContraseña]
 *
 * Ejemplos:
 *   node scripts/reset-password.mjs
 *   node scripts/reset-password.mjs admin@studio.com MiNuevaContraseña123!
 */

import { createRequire } from "module";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
config({ path: resolve(__dirname, "../.env") });

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../src/generated/prisma/index.js");

const prisma = new PrismaClient();

const email = process.argv[2] || "admin@studio.com";
const newPassword = process.argv[3] || "Admin123!";

async function main() {
  console.log("\n🔍 Buscando usuario:", email);

  // Check user exists
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
    },
  });

  if (!user) {
    console.log("\n❌ Usuario no encontrado:", email);
    console.log("\n📋 Usuarios existentes en la DB:");
    const allUsers = await prisma.user.findMany({
      select: { email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
    if (allUsers.length === 0) {
      console.log("   (ninguno)");
    } else {
      allUsers.forEach((u) => {
        console.log(`   • ${u.email} — ${u.firstName} ${u.lastName} [${u.role}] isActive: ${u.isActive}`);
      });
    }
    process.exit(1);
  }

  console.log("\n✅ Usuario encontrado:");
  console.log(`   Nombre:   ${user.firstName} ${user.lastName}`);
  console.log(`   Rol:      ${user.role}`);
  console.log(`   Activo:   ${user.isActive}`);
  console.log(`   Último login: ${user.lastLogin ? user.lastLogin.toLocaleString() : "nunca"}`);

  // Hash new password
  const hash = await bcrypt.hash(newPassword, 12);

  // Update in DB
  await prisma.user.update({
    where: { email },
    data: {
      password: hash,
      isActive: true, // Ensure user is active
    },
  });

  console.log("\n✅ Contraseña reseteada exitosamente!");
  console.log(`   Email:      ${email}`);
  console.log(`   Contraseña: ${newPassword}`);
  console.log("\n👉 Ahora puedes iniciar sesión en /login con estas credenciales.");
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
