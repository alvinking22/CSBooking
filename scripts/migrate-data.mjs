/**
 * Data migration script: cs_booking (Sequelize/old) → cs_booking_next (Prisma/new)
 *
 * Handles:
 *  - Enum casing (lowercase → UPPERCASE)
 *  - Equipment category mapping (english names → Spanish uppercase)
 *  - startTime/endTime: TIME → VARCHAR "HH:MM"
 *  - Only migrates columns that exist in the new schema
 *
 * Run with:
 *   node scripts/migrate-data.mjs
 */

import pg from "pg";
const { Client } = pg;

// ─── Connections ──────────────────────────────────────────────────────────────

const SRC = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "2310",
  database: "cs_booking",
});

const DST = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "2310",
  database: "cs_booking_next",
});

// ─── Enum Maps ────────────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  microfonos: "MICROFONOS",
  microphones: "MICROFONOS",
  camaras: "CAMARAS",
  cameras: "CAMARAS",
  personas: "PERSONAS",
  iluminacion: "ILUMINACION",
  lights: "ILUMINACION",
  fondos: "FONDOS",
  backgrounds: "FONDOS",
  accesorios: "ACCESORIOS",
  accessories: "ACCESORIOS",
  audio: "ACCESORIOS",
  mobiliarios: "MOBILIARIOS",
  furniture: "MOBILIARIOS",
  otros: "OTROS",
  other: "OTROS",
};

const BOOKING_STATUS_MAP = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  no_show: "NO_SHOW",
};

const PAYMENT_STATUS_MAP = {
  pending: "PENDING",
  deposit_paid: "DEPOSIT_PAID",
  paid: "PAID",
  refunded: "REFUNDED",
};

const PAYMENT_METHOD_MAP = {
  cash: "CASH",
  transfer: "TRANSFER",
  card: "CARD",
  azul: "AZUL",
  other: "OTHER",
};

const PAYMENT_TYPE_MAP = {
  deposit: "DEPOSIT",
  full: "FULL",
  partial: "PARTIAL",
  refund: "REFUND",
};

const PAYMENT_RECORD_STATUS_MAP = {
  pending: "PENDING",
  completed: "COMPLETED",
  failed: "FAILED",
  refunded: "REFUNDED",
};

const ROLE_MAP = {
  admin: "ADMIN",
  staff: "STAFF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapEnum(map, value, fallback) {
  if (!value) return fallback ?? null;
  return map[value.toLowerCase()] ?? fallback ?? value.toUpperCase();
}

/** Convert TIME or Date to "HH:MM" string */
function toTimeStr(val) {
  if (!val) return "00:00";
  if (typeof val === "string") {
    // Already "HH:MM:SS" or "HH:MM"
    return val.slice(0, 5);
  }
  if (val instanceof Date) {
    const h = String(val.getUTCHours()).padStart(2, "0");
    const m = String(val.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  return String(val).slice(0, 5);
}

async function count(client, table) {
  const r = await client.query(`SELECT COUNT(*) FROM "${table}"`);
  return parseInt(r.rows[0].count, 10);
}

// ─── Migration Functions ──────────────────────────────────────────────────────

async function migrateUsers() {
  const { rows } = await SRC.query(
    `SELECT id, email, password, "firstName", "lastName", role, "isActive", "lastLogin", "createdAt", "updatedAt" FROM users`
  );
  let n = 0;
  for (const r of rows) {
    await DST.query(
      `INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "lastLogin", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.email, r.password, r.firstName, r.lastName,
        mapEnum(ROLE_MAP, r.role, "ADMIN"),
        r.isActive ?? true,
        r.lastLogin,
        r.createdAt,
        r.updatedAt,
      ]
    );
    n++;
  }
  console.log(`  users: ${n} rows`);
}

async function migrateBusinessConfig() {
  const { rows } = await SRC.query(`SELECT * FROM business_config LIMIT 1`);
  if (!rows.length) { console.log("  business_config: 0 rows"); return; }
  const r = rows[0];
  await DST.query(
    `INSERT INTO business_config (
       id, "businessName", logo, "primaryColor", "secondaryColor",
       email, phone, address, instagram, facebook, website,
       "availableHours", "bufferTime", "hourlyRate", currency,
       "requireDeposit", "depositType", "depositAmount",
       "sendConfirmationEmail", "sendReminderEmail", "reminderHoursBefore",
       "minAdvanceHours", "blockedDates",
       "termsAndConditions", "cancellationPolicy",
       "azulEnabled", "azulMerchantId", "azulAuthKey", "azulMode",
       "setupCompleted", "createdAt", "updatedAt"
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
       $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
       $24,$25,$26,$27,$28,$29,$30,$31,$32
     ) ON CONFLICT (id) DO NOTHING`,
    [
      r.id, r.businessName, r.logo, r.primaryColor, r.secondaryColor,
      r.email, r.phone, r.address, r.instagram, r.facebook, r.website,
      r.availableHours ? JSON.stringify(r.availableHours) : null,
      r.bufferTime,
      r.hourlyRate,
      r.currency,
      r.requireDeposit ?? false,
      r.depositType,
      r.depositAmount,
      r.sendConfirmationEmail ?? true,
      r.sendReminderEmail ?? true,
      r.reminderHoursBefore ?? 24,
      r.minAdvanceHours ?? 0,
      r.blockedDates ? JSON.stringify(r.blockedDates) : "[]",
      r.termsAndConditions,
      r.cancellationPolicy,
      r.azulEnabled ?? false,
      r.azulMerchantId,
      r.azulAuthKey,
      r.azulMode,
      r.setupCompleted ?? false,
      r.createdAt,
      r.updatedAt,
    ]
  );
  console.log("  business_config: 1 row");
}

async function migrateServiceTypes() {
  const { rows } = await SRC.query(
    `SELECT id, name, description, "basePrice", duration, "isActive", "order", "createdAt", "updatedAt" FROM service_types`
  );
  let n = 0;
  for (const r of rows) {
    await DST.query(
      `INSERT INTO service_types (id, name, description, "basePrice", duration, "isActive", "order", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.description, r.basePrice, r.duration, r.isActive ?? true, r.order ?? 0, r.createdAt, r.updatedAt]
    );
    n++;
  }
  console.log(`  service_types: ${n} rows`);
}

async function migrateStudios() {
  const { rows } = await SRC.query(
    `SELECT id, name, description, image, color, "isActive", "order", "maxParticipants", "createdAt", "updatedAt" FROM studios`
  );
  let n = 0;
  for (const r of rows) {
    // Normalize image URL: strip "http://localhost:5000/uploads/" prefix if present
    let image = r.image;
    if (image && image.startsWith("http://localhost:5000/uploads/")) {
      image = image.replace("http://localhost:5000/uploads/", "");
    }
    await DST.query(
      `INSERT INTO studios (id, name, description, image, color, "isActive", "order", "maxParticipants", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.description, image, r.color, r.isActive ?? true, r.order ?? 0, r.maxParticipants, r.createdAt, r.updatedAt]
    );
    n++;
  }
  console.log(`  studios: ${n} rows`);
}

async function migrateClients() {
  const { rows } = await SRC.query(
    `SELECT id, name, email, phone, "projectName", notes, "bookingCount", "createdAt", "updatedAt" FROM clients`
  );
  let n = 0;
  for (const r of rows) {
    await DST.query(
      `INSERT INTO clients (id, name, email, phone, "projectName", notes, "bookingCount", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.email, r.phone, r.projectName, r.notes, r.bookingCount ?? 0, r.createdAt, r.updatedAt]
    );
    n++;
  }
  console.log(`  clients: ${n} rows`);
}

async function migrateEquipment() {
  const { rows } = await SRC.query(`SELECT * FROM equipment`);
  let n = 0;
  for (const r of rows) {
    let image = r.image;
    if (image && image.startsWith("http://localhost:5000/uploads/")) {
      image = image.replace("http://localhost:5000/uploads/", "");
    }
    await DST.query(
      `INSERT INTO equipment (
         id, name, description, image, category, quantity,
         "isIncluded", "extraCost", "isActive", "isRequired", "order",
         specifications, "allowQuantitySelection", options,
         "studioIds", "serviceIds", "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.name, r.description, image,
        mapEnum(CATEGORY_MAP, r.category, "OTROS"),
        r.quantity ?? 1,
        r.isIncluded ?? false,
        r.extraCost ?? 0,
        r.isActive ?? true,
        r.isRequired ?? false,
        r.order ?? 0,
        r.specifications ? JSON.stringify(r.specifications) : null,
        r.allowQuantitySelection ?? false,
        r.options ? JSON.stringify(r.options) : null,
        r.studioIds ? JSON.stringify(r.studioIds) : null,
        r.serviceIds ? JSON.stringify(r.serviceIds) : null,
        r.createdAt,
        r.updatedAt,
      ]
    );
    n++;
  }
  console.log(`  equipment: ${n} rows`);
}

async function migrateBookings() {
  const { rows } = await SRC.query(`SELECT * FROM bookings`);
  let n = 0;
  for (const r of rows) {
    await DST.query(
      `INSERT INTO bookings (
         id, "bookingNumber", "clientName", "clientEmail", "clientPhone",
         "sessionDate", "startTime", "endTime", duration,
         "serviceTypeId", "studioId", "clientId",
         "projectDescription", "clientNotes", "adminNotes", participants,
         "basePrice", "equipmentCost", "totalPrice", status,
         "paymentStatus", "depositAmount", "paidAmount", "remainingAmount",
         "cancelledAt", "cancellationReason", "termsAcceptedAt", "rescheduledFrom",
         "createdAt", "updatedAt"
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
       ) ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.bookingNumber, r.clientName, r.clientEmail, r.clientPhone ?? null,
        r.sessionDate,
        toTimeStr(r.startTime),
        toTimeStr(r.endTime),
        r.duration,
        r.serviceTypeId, r.studioId, r.clientId,
        r.projectDescription, r.clientNotes, r.adminNotes,
        r.participants ?? 1,
        r.basePrice, r.equipmentCost ?? 0, r.totalPrice,
        mapEnum(BOOKING_STATUS_MAP, r.status, "PENDING"),
        mapEnum(PAYMENT_STATUS_MAP, r.paymentStatus, "PENDING"),
        r.depositAmount ?? 0,
        r.paidAmount ?? 0,
        r.remainingAmount ?? 0,
        r.cancelledAt,
        r.cancellationReason,
        r.termsAcceptedAt,
        r.rescheduledFrom ? JSON.stringify(r.rescheduledFrom) : null,
        r.createdAt, r.updatedAt,
      ]
    );
    n++;
  }
  console.log(`  bookings: ${n} rows`);
}

async function migrateBookingEquipment() {
  const { rows } = await SRC.query(`SELECT * FROM booking_equipment`);
  let n = 0;
  for (const r of rows) {
    await DST.query(
      `INSERT INTO booking_equipment (
         id, "bookingId", "equipmentId", quantity,
         "selectedOption", "textFieldValue", cost, "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.bookingId, r.equipmentId, r.quantity ?? 1,
        r.selectedOption ?? null,
        r.textFieldValue ?? null,
        r.cost ?? 0,
        r.createdAt, r.updatedAt,
      ]
    );
    n++;
  }
  console.log(`  booking_equipment: ${n} rows`);
}

async function migratePayments() {
  const { rows } = await SRC.query(`SELECT * FROM payments`);
  let n = 0;
  for (const r of rows) {
    await DST.query(
      `INSERT INTO payments (
         id, "bookingId", "userId", amount,
         "paymentType", "paymentMethod", status,
         "transactionId", reference, "processedBy", notes,
         "createdAt", "updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.bookingId, r.processedBy ?? null, r.amount,
        mapEnum(PAYMENT_TYPE_MAP, r.paymentType, "FULL"),
        mapEnum(PAYMENT_METHOD_MAP, r.paymentMethod, "CASH"),
        mapEnum(PAYMENT_RECORD_STATUS_MAP, r.status, "PENDING"),
        r.transactionId, r.reference,
        r.processedBy ? String(r.processedBy) : null,
        r.notes,
        r.createdAt, r.updatedAt,
      ]
    );
    n++;
  }
  console.log(`  payments: ${n} rows`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to databases...");
  await SRC.connect();
  await DST.connect();

  console.log("Starting migration from cs_booking → cs_booking_next\n");

  try {
    await migrateUsers();
    await migrateBusinessConfig();
    await migrateServiceTypes();
    await migrateStudios();
    await migrateClients();
    await migrateEquipment();
    await migrateBookings();
    await migrateBookingEquipment();
    await migratePayments();

    console.log("\n✅ Migration complete!");

    // Verify counts
    console.log("\nVerification (new DB row counts):");
    for (const t of ["users","business_config","service_types","studios","clients","equipment","bookings","booking_equipment","payments"]) {
      console.log(`  ${t}: ${await count(DST, t)}`);
    }
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await SRC.end();
    await DST.end();
  }
}

main();
