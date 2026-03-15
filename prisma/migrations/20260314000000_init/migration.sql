-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'DEPOSIT_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'AZUL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL', 'PARTIAL', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('MICROFONOS', 'CAMARAS', 'PERSONAS', 'ILUMINACION', 'FONDOS', 'ACCESORIOS', 'MOBILIARIOS', 'OTROS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_config" (
    "id" UUID NOT NULL,
    "businessName" VARCHAR(255) NOT NULL DEFAULT 'CS Booking',
    "logo" VARCHAR(500),
    "primaryColor" VARCHAR(20) DEFAULT '#3B82F6',
    "secondaryColor" VARCHAR(20) DEFAULT '#1E40AF',
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "instagram" VARCHAR(255),
    "facebook" VARCHAR(255),
    "website" VARCHAR(255),
    "availableHours" JSONB,
    "bufferTime" INTEGER DEFAULT 30,
    "hourlyRate" DECIMAL(10,2),
    "currency" VARCHAR(3) DEFAULT 'USD',
    "requireDeposit" BOOLEAN DEFAULT false,
    "depositType" VARCHAR(20) DEFAULT 'percentage',
    "depositAmount" DECIMAL(10,2) DEFAULT 50,
    "sendConfirmationEmail" BOOLEAN DEFAULT true,
    "sendReminderEmail" BOOLEAN DEFAULT true,
    "reminderHoursBefore" INTEGER DEFAULT 24,
    "minAdvanceHours" INTEGER DEFAULT 0,
    "blockedDates" JSONB DEFAULT '[]',
    "termsAndConditions" TEXT,
    "cancellationPolicy" TEXT,
    "azulEnabled" BOOLEAN DEFAULT false,
    "azulMerchantId" VARCHAR(255),
    "azulAuthKey" VARCHAR(255),
    "azulMode" VARCHAR(20) DEFAULT 'sandbox',
    "setupCompleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "color" VARCHAR(20) DEFAULT '#3B82F6',
    "isActive" BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    "maxParticipants" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "projectName" VARCHAR(255),
    "notes" TEXT,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "category" "EquipmentCategory" NOT NULL DEFAULT 'ACCESORIOS',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isIncluded" BOOLEAN DEFAULT false,
    "extraCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "isRequired" BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    "specifications" JSONB,
    "allowQuantitySelection" BOOLEAN DEFAULT false,
    "minQuantity" INTEGER DEFAULT 1,
    "syncWithParticipants" BOOLEAN DEFAULT false,
    "options" JSONB,
    "studioIds" JSONB,
    "serviceIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "bookingNumber" VARCHAR(50) NOT NULL,
    "clientName" VARCHAR(255) NOT NULL,
    "clientEmail" VARCHAR(255) NOT NULL,
    "clientPhone" VARCHAR(50),
    "sessionDate" DATE NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "duration" DECIMAL(4,2) NOT NULL,
    "serviceTypeId" UUID,
    "studioId" UUID,
    "clientId" UUID,
    "projectDescription" TEXT,
    "clientNotes" TEXT,
    "adminNotes" TEXT,
    "participants" INTEGER DEFAULT 1,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "equipmentCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "depositAmount" DECIMAL(10,2) DEFAULT 0,
    "paidAmount" DECIMAL(10,2) DEFAULT 0,
    "remainingAmount" DECIMAL(10,2) DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledBy" VARCHAR(20),
    "confirmationSentAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "rescheduledFrom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_equipment" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selectedOption" VARCHAR(255),
    "textFieldValue" TEXT,
    "cost" DECIMAL(10,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "processedById" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" VARCHAR(255),
    "reference" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "service_types_isActive_idx" ON "service_types"("isActive");

-- CreateIndex
CREATE INDEX "service_types_order_idx" ON "service_types"("order");

-- CreateIndex
CREATE INDEX "studios_isActive_idx" ON "studios"("isActive");

-- CreateIndex
CREATE INDEX "studios_order_idx" ON "studios"("order");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "equipment_isActive_idx" ON "equipment"("isActive");

-- CreateIndex
CREATE INDEX "equipment_category_idx" ON "equipment"("category");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_sessionDate_idx" ON "bookings"("sessionDate");

-- CreateIndex
CREATE INDEX "bookings_studioId_idx" ON "bookings"("studioId");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_serviceTypeId_idx" ON "bookings"("serviceTypeId");

-- CreateIndex
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "bookings_sessionDate_studioId_idx" ON "bookings"("sessionDate", "studioId");

-- CreateIndex
CREATE INDEX "booking_equipment_bookingId_idx" ON "booking_equipment"("bookingId");

-- CreateIndex
CREATE INDEX "booking_equipment_equipmentId_idx" ON "booking_equipment"("equipmentId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_processedById_idx" ON "payments"("processedById");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_equipment" ADD CONSTRAINT "booking_equipment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_equipment" ADD CONSTRAINT "booking_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

