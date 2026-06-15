import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, canWrite, allowedQuarryIds } from "@/lib/rbac";
import { json, unauthorized, forbidden, badRequest, writeAudit } from "@/lib/apiResponse";
import { fleetUnitSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// GET /api/fleet — list units the user may see (scoped by region/quarry).
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const allowed = await allowedQuarryIds(user.id);
  const where = allowed === null ? {} : { quarryId: { in: allowed } };
  const units = await prisma.fleetUnit.findMany({ where, orderBy: { unitNo: "asc" } });
  return json(units.map(strip));
}

// POST /api/fleet — create one unit.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = fleetUnitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const u = parsed.data;
  const allowed = await allowedQuarryIds(user.id);
  if (allowed !== null && !allowed.includes(u.quarryId)) return forbidden();
  const created = await prisma.fleetUnit.create({ data: u });
  await writeAudit(user, "fleetUnit", u.id, "create", undefined, u);
  return json(strip(created), { status: 201 });
}

// PUT /api/fleet — bulk replace (import / reset). Unrestricted editors only,
// so a scoped user can't wipe data outside their scope.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const allowed = await allowedQuarryIds(user.id);
  if (allowed !== null) return forbidden();
  const parsed = z.array(fleetUnitSchema).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  await prisma.$transaction([
    prisma.fleetUnit.deleteMany(),
    prisma.fleetUnit.createMany({ data: parsed.data }),
  ]);
  await writeAudit(user, "fleetUnit", "*", "bulk", undefined, { count: parsed.data.length });
  return json(parsed.data);
}
