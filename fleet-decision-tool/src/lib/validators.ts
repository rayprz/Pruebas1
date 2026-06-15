import { z } from "zod";

export const statusEnum = z.enum(["active", "standby", "down"]);

export const fleetUnitSchema = z.object({
  id: z.string().min(1),
  unitNo: z.string().min(1),
  classId: z.string().min(1),
  modelId: z.string(),
  year: z.number().int(),
  currentHours: z.number().int().nonnegative(),
  annualHours: z.number().int().nonnegative(),
  availability: z.number().min(0).max(1),
  quarryId: z.string().min(1),
  status: statusEnum,
});

export const fleetUnitPatchSchema = fleetUnitSchema.partial();
