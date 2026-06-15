import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, canWrite, allowedQuarryIds } from "@/lib/rbac";
import { json, unauthorized, forbidden, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { shiftRecordSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// GET /api/shifts — shift records for quarries in scope.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const allowed = await allowedQuarryIds(user.id);
  const where = allowed === null ? {} : { quarryId: { in: allowed } };
  const rows = await prisma.shiftRecord.findMany({ where, orderBy: [{ date: "desc" }, { shift: "asc" }] });
  return json(rows.map(strip));
}

// PUT /api/shifts — bulk replace (import/reset). Unrestricted editors.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  if ((await allowedQuarryIds(user.id)) !== null) return forbidden();
  const parsed = z.array(shiftRecordSchema).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  await prisma.$transaction([
    prisma.shiftRecord.deleteMany(),
    prisma.shiftRecord.createMany({
      data: parsed.data.map((r) => ({ ...r, fronts: asJson(r.fronts), note: r.note ?? null })),
    }),
  ]);
  await writeAudit(user, "shiftRecord", "*", "bulk", undefined, { count: parsed.data.length });
  return json(parsed.data);
}
