import { prisma } from "@/lib/db";
import { currentUser, canWrite, canAccessUnit } from "@/lib/rbac";
import { json, unauthorized, forbidden, notFound, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { maintRecordSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// PUT /api/maint/:id — upsert one maintenance record.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = maintRecordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const r = parsed.data;
  if (r.id !== id) return badRequest("id mismatch");
  if (!(await canAccessUnit(user.id, r.unitId))) return forbidden();
  const existing = await prisma.maintRecord.findUnique({ where: { id } });
  const data = { unitId: r.unitId, month: r.month, hours: r.hours, lines: asJson(r.lines), note: r.note ?? null };
  const saved = await prisma.maintRecord.upsert({ where: { id }, update: data, create: { id, ...data } });
  await writeAudit(user, "maintRecord", id, existing ? "update" : "create", existing ? strip(existing) : undefined, r);
  return json(strip(saved));
}

// DELETE /api/maint/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const existing = await prisma.maintRecord.findUnique({ where: { id } });
  if (!existing) return notFound();
  if (!(await canAccessUnit(user.id, existing.unitId))) return forbidden();
  await prisma.maintRecord.delete({ where: { id } });
  await writeAudit(user, "maintRecord", id, "delete", strip(existing), undefined);
  return json({ ok: true });
}
