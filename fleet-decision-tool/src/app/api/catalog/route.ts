import { prisma } from "@/lib/db";
import { currentUser, canWrite } from "@/lib/rbac";
import { json, unauthorized, forbidden, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { catalogOverridesSchema } from "@/lib/validators";

// Catalog overrides — a shared singleton map (id "default"); default {}.
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const row = await prisma.catalogOverride.findUnique({ where: { id: "default" } });
  return json(row?.data ?? {});
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = catalogOverridesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const before = await prisma.catalogOverride.findUnique({ where: { id: "default" } });
  const saved = await prisma.catalogOverride.upsert({
    where: { id: "default" },
    update: { data: asJson(parsed.data) },
    create: { id: "default", data: asJson(parsed.data) },
  });
  await writeAudit(user, "catalogOverride", "default", "update", before?.data ?? undefined, saved.data);
  return json(saved.data);
}
