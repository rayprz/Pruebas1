import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/rbac";

/** Cast a typed value for a Prisma Json column. */
export const asJson = (v: unknown) => v as Prisma.InputJsonValue;

export const json = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);
export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });
export const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });
export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

/** Append a mutation to the audit trail. before/after omitted ⇒ stored NULL. */
export async function writeAudit(
  user: SessionUser,
  entity: string,
  entityId: string,
  action: "create" | "update" | "delete" | "bulk",
  before?: unknown,
  after?: unknown
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userEmail: user.email,
      entity,
      entityId,
      action,
      before: before === undefined ? undefined : (before as object),
      after: after === undefined ? undefined : (after as object),
    },
  });
}
