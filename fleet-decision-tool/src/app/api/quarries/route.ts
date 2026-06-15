import { prisma } from "@/lib/db";
import { currentUser, allowedQuarryIds } from "@/lib/rbac";
import { json, unauthorized } from "@/lib/apiResponse";

type Row = { updatedAt: Date } & Record<string, unknown>;
const strip = ({ updatedAt: _u, ...rest }: Row) => rest;

// GET /api/quarries — quarries in scope.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const allowed = await allowedQuarryIds(user.id);
  const where = allowed === null ? {} : { id: { in: allowed } };
  const rows = await prisma.quarry.findMany({ where, orderBy: [{ region: "asc" }, { name: "asc" }] });
  return json(rows.map(strip));
}
