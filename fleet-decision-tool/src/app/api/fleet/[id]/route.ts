import { prisma } from "@/lib/db";
import { currentUser, canWrite, allowedQuarryIds } from "@/lib/rbac";
import { json, unauthorized, forbidden, notFound, badRequest, writeAudit } from "@/lib/apiResponse";
import { fleetUnitPatchSchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// PATCH /api/fleet/:id — update one unit.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const existing = await prisma.fleetUnit.findUnique({ where: { id } });
  if (!existing) return notFound();
  const parsed = fleetUnitPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const allowed = await allowedQuarryIds(user.id);
  const targetQuarry = parsed.data.quarryId ?? existing.quarryId;
  if (allowed !== null && (!allowed.includes(existing.quarryId) || !allowed.includes(targetQuarry)))
    return forbidden();
  const updated = await prisma.fleetUnit.update({ where: { id }, data: parsed.data });
  await writeAudit(user, "fleetUnit", id, "update", strip(existing), strip(updated));
  return json(strip(updated));
}

// DELETE /api/fleet/:id — remove one unit.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const existing = await prisma.fleetUnit.findUnique({ where: { id } });
  if (!existing) return notFound();
  const allowed = await allowedQuarryIds(user.id);
  if (allowed !== null && !allowed.includes(existing.quarryId)) return forbidden();
  await prisma.fleetUnit.delete({ where: { id } });
  await writeAudit(user, "fleetUnit", id, "delete", strip(existing), undefined);
  return json({ ok: true });
}
