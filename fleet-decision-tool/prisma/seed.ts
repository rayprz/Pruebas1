/**
 * Seeds the database with the first admin user and the sample dataset.
 * Idempotent: clears business tables and reloads, upserts the admin by email.
 * Run: `tsx --env-file=.env prisma/seed.ts` (or via `prisma db seed`, which
 * loads .env automatically).
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const asJson = (v: unknown) => v as Prisma.InputJsonValue;

// Reuse the exact sample data the UI shipped with (single source of truth).
import { SEED_UNITS } from "../src/lib/fleetStore";
import { DEFAULT_QUARRIES } from "../src/lib/quarryStore";
import { SEED as FLEET_HISTORY } from "../src/lib/fleetHistoryStore";
import { SEED as MAINT_RECORDS } from "../src/lib/maintStore";
import { SEED as SHIFT_RECORDS } from "../src/lib/shiftStore";
import { DEFAULT_PARAMS } from "../src/data/catalog";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user ---------------------------------------------------------
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", name: "Administrator" },
    create: { email, name: "Administrator", passwordHash, role: "ADMIN" },
  });
  console.log(`✔ admin user: ${email}`);

  // --- Singletons ---------------------------------------------------------
  await prisma.globalParams.upsert({
    where: { id: "default" },
    update: { data: asJson(DEFAULT_PARAMS) },
    create: { id: "default", data: asJson(DEFAULT_PARAMS) },
  });
  await prisma.catalogOverride.upsert({
    where: { id: "default" },
    update: { data: {} },
    create: { id: "default", data: {} },
  });

  // --- Business data (clean reseed) --------------------------------------
  await prisma.$transaction([
    prisma.fleetMonth.deleteMany(),
    prisma.maintRecord.deleteMany(),
    prisma.shiftRecord.deleteMany(),
    prisma.fleetUnit.deleteMany(),
    prisma.quarry.deleteMany(),
  ]);

  await prisma.quarry.createMany({
    data: DEFAULT_QUARRIES.map((q) => ({
      id: q.id,
      name: q.name,
      region: q.region,
      productionTons: q.productionTons,
      haulKm: q.haulKm,
      loaderClassId: q.loaderClassId,
      truckClassId: q.truckClassId,
      config: asJson(q.config),
    })),
  });
  await prisma.fleetUnit.createMany({ data: SEED_UNITS });
  await prisma.fleetMonth.createMany({
    data: FLEET_HISTORY.map((m) => ({
      unitId: m.unitId,
      month: m.month,
      meterHours: m.meterHours,
      availability: m.availability,
      status: m.status,
    })),
  });
  await prisma.maintRecord.createMany({
    data: MAINT_RECORDS.map((r) => ({
      id: r.id,
      unitId: r.unitId,
      month: r.month,
      hours: r.hours,
      lines: asJson(r.lines),
      note: r.note ?? null,
    })),
  });
  await prisma.shiftRecord.createMany({
    data: SHIFT_RECORDS.map((r) => ({
      id: r.id,
      quarryId: r.quarryId,
      date: r.date,
      shift: r.shift,
      scheduledHours: r.scheduledHours,
      fronts: asJson(r.fronts),
      note: r.note ?? null,
    })),
  });

  console.log(
    `✔ seeded ${DEFAULT_QUARRIES.length} quarries, ${SEED_UNITS.length} units, ` +
      `${FLEET_HISTORY.length} fleet-months, ${MAINT_RECORDS.length} maint records, ` +
      `${SHIFT_RECORDS.length} shift records`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
