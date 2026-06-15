import { prisma } from "@/lib/db";
import { currentUser, canWrite, allowedQuarryIds, canAccessQuarry } from "@/lib/rbac";
import { json, unauthorized, forbidden, notFound, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { quarrySchema } from "@/lib/validators";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// PUT /api/quarries/:id — upsert one quarry (incl. its nested config).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = quarrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const q = parsed.data;
  if (q.id !== id) return badRequest("id mismatch");
  const existing = await prisma.quarry.findUnique({ where: { id } });
  if (existing) {
    if (!(await canAccessQuarry(user.id, id))) return forbidden();
  } else {
    // Creating a new quarry requires unrestricted access.
    if ((await allowedQuarryIds(user.id)) !== null) return forbidden();
  }
  const data = {
    name: q.name,
    region: q.region,
    productionTons: q.productionTons,
    haulKm: q.haulKm,
    loaderClassId: q.loaderClassId,
    truckClassId: q.truckClassId,
    config: asJson(q.config),
  };
  const saved = await prisma.quarry.upsert({ where: { id }, update: data, create: { id, ...data } });
  await writeAudit(user, "quarry", id, existing ? "update" : "create", existing ? strip(existing) : undefined, q);
  return json(strip(saved));
}

// DELETE /api/quarries/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const existing = await prisma.quarry.findUnique({ where: { id } });
  if (!existing) return notFound();
  if (!(await canAccessQuarry(user.id, id))) return forbidden();
  await prisma.quarry.delete({ where: { id } });
  await writeAudit(user, "quarry", id, "delete", strip(existing), undefined);
  return json({ ok: true });
}
