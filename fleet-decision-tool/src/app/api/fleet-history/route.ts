import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, canWrite, allowedUnitIds, canAccessUnit } from "@/lib/rbac";
import { json, unauthorized, forbidden, badRequest, writeAudit } from "@/lib/apiResponse";
import { fleetMonthSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// GET /api/fleet-history — monthly meter snapshots for units in scope.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const allowed = await allowedUnitIds(user.id);
  const where = allowed === null ? {} : { unitId: { in: allowed } };
  const rows = await prisma.fleetMonth.findMany({ where, orderBy: [{ unitId: "asc" }, { month: "asc" }] });
  return json(rows.map(strip));
}

// POST /api/fleet-history — upsert one unit-month.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = fleetMonthSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const m = parsed.data;
  if (!(await canAccessUnit(user.id, m.unitId))) return forbidden();
  const saved = await prisma.fleetMonth.upsert({
    where: { unitId_month: { unitId: m.unitId, month: m.month } },
    update: m,
    create: m,
  });
  await writeAudit(user, "fleetMonth", `${m.unitId}|${m.month}`, "update", undefined, m);
  return json(strip(saved));
}

// PUT /api/fleet-history — bulk replace (import/reset). Unrestricted editors.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  if ((await allowedUnitIds(user.id)) !== null) return forbidden();
  const parsed = z.array(fleetMonthSchema).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  await prisma.$transaction([
    prisma.fleetMonth.deleteMany(),
    prisma.fleetMonth.createMany({ data: parsed.data }),
  ]);
  await writeAudit(user, "fleetMonth", "*", "bulk", undefined, { count: parsed.data.length });
  return json(parsed.data);
}
