import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, canWrite, allowedUnitIds } from "@/lib/rbac";
import { json, unauthorized, forbidden, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { maintRecordSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// GET /api/maint — maintenance records for units in scope.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const allowed = await allowedUnitIds(user.id);
  const where = allowed === null ? {} : { unitId: { in: allowed } };
  const rows = await prisma.maintRecord.findMany({ where, orderBy: [{ month: "desc" }, { unitId: "asc" }] });
  return json(rows.map(strip));
}

// PUT /api/maint — bulk replace (import/reset). Unrestricted editors.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  if ((await allowedUnitIds(user.id)) !== null) return forbidden();
  const parsed = z.array(maintRecordSchema).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  await prisma.$transaction([
    prisma.maintRecord.deleteMany(),
    prisma.maintRecord.createMany({
      data: parsed.data.map((r) => ({ ...r, lines: asJson(r.lines), note: r.note ?? null })),
    }),
  ]);
  await writeAudit(user, "maintRecord", "*", "bulk", undefined, { count: parsed.data.length });
  return json(parsed.data);
}
