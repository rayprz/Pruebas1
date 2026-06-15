import { prisma } from "@/lib/db";
import { currentUser, canWrite, canAccessQuarry } from "@/lib/rbac";
import { json, unauthorized, forbidden, notFound, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { shiftRecordSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// PUT /api/shifts/:id — upsert one shift record.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = shiftRecordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const r = parsed.data;
  if (r.id !== id) return badRequest("id mismatch");
  if (!(await canAccessQuarry(user.id, r.quarryId))) return forbidden();
  const existing = await prisma.shiftRecord.findUnique({ where: { id } });
  const data = {
    quarryId: r.quarryId,
    date: r.date,
    shift: r.shift,
    scheduledHours: r.scheduledHours,
    fronts: asJson(r.fronts),
    note: r.note ?? null,
  };
  const saved = await prisma.shiftRecord.upsert({ where: { id }, update: data, create: { id, ...data } });
  await writeAudit(user, "shiftRecord", id, existing ? "update" : "create", existing ? strip(existing) : undefined, r);
  return json(strip(saved));
}

// DELETE /api/shifts/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const existing = await prisma.shiftRecord.findUnique({ where: { id } });
  if (!existing) return notFound();
  if (!(await canAccessQuarry(user.id, existing.quarryId))) return forbidden();
  await prisma.shiftRecord.delete({ where: { id } });
  await writeAudit(user, "shiftRecord", id, "delete", strip(existing), undefined);
  return json({ ok: true });
}
