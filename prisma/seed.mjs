/**
 * Seed inicial para CSBooking
 * Crea: usuario admin, configuración del sistema, un estudio y un servicio de ejemplo
 *
 * Uso: node prisma/seed.mjs
 *      npm run db:seed
 */

import { createRequire } from "module";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../src/generated/prisma/index.js");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ─── Admin user ─────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@studio.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hash,
        firstName: "Admin",
        lastName: "Studio",
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ Usuario admin creado: ${adminEmail}`);
  } else {
    console.log(`⏭️  Admin ya existe: ${adminEmail}`);
  }

  // ─── System config ───────────────────────────────────────────────────────────
  const existingConfig = await prisma.systemConfig.findFirst();
  if (!existingConfig) {
    await prisma.systemConfig.create({
      data: {
        studioName: "Mi Estudio",
        contactEmail: adminEmail,
        contactPhone: "",
        currency: "USD",
        primaryColor: "#3B82F6",
        depositPercentage: 50,
        bookingAdvanceDays: 60,
        cancellationHours: 24,
        enablePublicBooking: true,
        requireDeposit: false,
        maintenanceMode: false,
        businessHours: {},
      },
    });
    console.log("✅ Configuración del sistema creada");
  } else {
    console.log("⏭️  Configuración ya existe");
  }

  // ─── Demo studio ─────────────────────────────────────────────────────────────
  const existingStudio = await prisma.studio.findFirst();
  if (!existingStudio) {
    await prisma.studio.create({
      data: {
        name: "Estudio A",
        description: "Estudio principal de grabación",
        color: "#3B82F6",
        maxParticipants: 10,
        isActive: true,
        order: 1,
        availableHours: {
          monday: { open: "09:00", close: "22:00" },
          tuesday: { open: "09:00", close: "22:00" },
          wednesday: { open: "09:00", close: "22:00" },
          thursday: { open: "09:00", close: "22:00" },
          friday: { open: "09:00", close: "22:00" },
          saturday: { open: "10:00", close: "20:00" },
          sunday: { open: "10:00", close: "18:00" },
        },
      },
    });
    console.log("✅ Estudio demo creado");
  } else {
    console.log("⏭️  Ya existen estudios");
  }

  // ─── Demo service ────────────────────────────────────────────────────────────
  const existingService = await prisma.serviceType.findFirst();
  if (!existingService) {
    await prisma.serviceType.create({
      data: {
        name: "Grabación",
        description: "Sesión de grabación en estudio",
        duration: 60,
        basePrice: 50,
        isActive: true,
        order: 1,
      },
    });
    console.log("✅ Servicio demo creado");
  } else {
    console.log("⏭️  Ya existen servicios");
  }

  console.log("\n🎉 Seed completado exitosamente!");
  console.log(`\n👉 Accede al panel en /login`);
  console.log(`   Email:      ${adminEmail}`);
  console.log(`   Contraseña: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Error en seed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
