-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'PHARMACIST');

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "pharmacyId" UUID,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pharmacy" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "inventoryUpdatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "suspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reorderThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiryDate" DATE NOT NULL,
    "storageLocation" TEXT NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "barcode" TEXT,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyPeriod" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DutyPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_pharmacyId_key" ON "Subscription"("pharmacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_pharmacyId_normalizedName_key" ON "Medicine"("pharmacyId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_medicineId_batchNumber_key" ON "Batch"("medicineId", "batchNumber");

-- CreateIndex
CREATE INDEX "DutyPeriod_pharmacyId_startsAt_idx" ON "DutyPeriod"("pharmacyId", "startsAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyPeriod" ADD CONSTRAINT "DutyPeriod_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "account_role_pharmacy_check" CHECK (
  ("role" = 'OWNER' AND "pharmacyId" IS NULL) OR
  ("role" = 'PHARMACIST' AND "pharmacyId" IS NOT NULL)
);
ALTER TABLE "Account" ADD CONSTRAINT "account_email_check"
  CHECK ("email" = lower(btrim("email")));
ALTER TABLE "Medicine" ADD CONSTRAINT "medicine_name_check"
  CHECK (length(btrim("displayName")) > 0 AND "normalizedName" = lower(btrim("displayName")));
ALTER TABLE "Medicine" ADD CONSTRAINT "medicine_threshold_check"
  CHECK ("reorderThreshold" >= 0 AND "reorderThreshold" < 'Infinity'::double precision);
ALTER TABLE "Batch" ADD CONSTRAINT "batch_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "Batch" ADD CONSTRAINT "batch_cost_check" CHECK ("unitCost" >= 0 AND "unitCost" < 'Infinity'::numeric);
ALTER TABLE "Subscription" ADD CONSTRAINT "subscription_dates_check"
  CHECK ("endDate" > "startDate");
ALTER TABLE "DutyPeriod" ADD CONSTRAINT "duty_dates_check"
  CHECK ("endsAt" > "startsAt" AND "endsAt" - "startsAt" <= INTERVAL '24 hours');
-- Hamid adds concurrency-safe overlap prevention in his own migration/service.
