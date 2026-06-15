import { prisma } from "@/lib/db";
import { currentUser, canWrite } from "@/lib/rbac";
import { json, unauthorized, forbidden, badRequest, writeAudit, asJson } from "@/lib/apiResponse";
import { globalParamsSchema } from "@/lib/validators";
import { DEFAULT_PARAMS } from "@/data/catalog";

// Global parameters — a shared singleton (id "default").
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const row = await prisma.globalParams.findUnique({ where: { id: "default" } });
  return json(row?.data ?? DEFAULT_PARAMS);
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!canWrite(user.role)) return forbidden();
  const parsed = globalParamsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.message);
  const before = await prisma.globalParams.findUnique({ where: { id: "default" } });
  const saved = await prisma.globalParams.upsert({
    where: { id: "default" },
    update: { data: asJson(parsed.data) },
    create: { id: "default", data: asJson(parsed.data) },
  });
  await writeAudit(user, "globalParams", "default", "update", before?.data ?? undefined, saved.data);
  return json(saved.data);
}
