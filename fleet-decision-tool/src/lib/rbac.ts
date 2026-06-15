import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SessionUser = { id: string; email: string; role: Role };

/** The authenticated user, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? "", role: session.user.role };
}

export const canWrite = (role: Role) => role === "EDITOR" || role === "ADMIN";
export const isAdmin = (role: Role) => role === "ADMIN";

/**
 * The quarry ids a user may access. `null` means unrestricted (no scopes set).
 * Scopes can be by QUARRY (direct) and/or REGION (expanded to that region's
 * quarries), reusing the existing Quarry.region hierarchy.
 */
export async function allowedQuarryIds(userId: string): Promise<string[] | null> {
  const scopes = await prisma.userScope.findMany({ where: { userId } });
  if (scopes.length === 0) return null; // unrestricted
  const direct = scopes.filter((s) => s.type === "QUARRY").map((s) => s.value);
  const regions = scopes.filter((s) => s.type === "REGION").map((s) => s.value);
  let regionQuarries: string[] = [];
  if (regions.length) {
    const qs = await prisma.quarry.findMany({
      where: { region: { in: regions } },
      select: { id: true },
    });
    regionQuarries = qs.map((q) => q.id);
  }
  return [...new Set([...direct, ...regionQuarries])];
}

/** True if the user may touch data belonging to `quarryId`. */
export async function canAccessQuarry(userId: string, quarryId: string): Promise<boolean> {
  const allowed = await allowedQuarryIds(userId);
  return allowed === null || allowed.includes(quarryId);
}
