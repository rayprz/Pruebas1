-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('REGION', 'QUARRY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserScope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ScopeType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "UserScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetUnit" (
    "id" TEXT NOT NULL,
    "unitNo" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "currentHours" INTEGER NOT NULL,
    "annualHours" INTEGER NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "quarryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetMonth" (
    "unitId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "meterHours" INTEGER NOT NULL,
    "availability" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetMonth_pkey" PRIMARY KEY ("unitId","month")
);

-- CreateTable
CREATE TABLE "MaintRecord" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftRecord" (
    "id" TEXT NOT NULL,
    "quarryId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "scheduledHours" DOUBLE PRECISION NOT NULL,
    "fronts" JSONB NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quarry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "productionTons" INTEGER NOT NULL,
    "haulKm" DOUBLE PRECISION NOT NULL,
    "loaderClassId" TEXT NOT NULL,
    "truckClassId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quarry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalParams" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalParams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogOverride" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserScope_userId_type_value_key" ON "UserScope"("userId", "type", "value");

-- CreateIndex
CREATE INDEX "FleetUnit_quarryId_idx" ON "FleetUnit"("quarryId");

-- CreateIndex
CREATE INDEX "MaintRecord_unitId_idx" ON "MaintRecord"("unitId");

-- CreateIndex
CREATE INDEX "MaintRecord_month_idx" ON "MaintRecord"("month");

-- CreateIndex
CREATE INDEX "ShiftRecord_quarryId_idx" ON "ShiftRecord"("quarryId");

-- CreateIndex
CREATE INDEX "ShiftRecord_date_idx" ON "ShiftRecord"("date");

-- CreateIndex
CREATE INDEX "Quarry_region_idx" ON "Quarry"("region");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_ts_idx" ON "AuditLog"("ts");

-- AddForeignKey
ALTER TABLE "UserScope" ADD CONSTRAINT "UserScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
