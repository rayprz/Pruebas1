import { z } from "zod";

export const statusEnum = z.enum(["active", "standby", "down"]);
const month = z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM");

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

export const fleetMonthSchema = z.object({
  unitId: z.string().min(1),
  month,
  meterHours: z.number().int().nonnegative(),
  availability: z.number().min(0).max(1),
  status: statusEnum,
});

const maintLineSchema = z.object({
  id: z.string().min(1),
  subsystem: z.string(),
  type: z.enum(["preventive", "corrective", "overhaul"]),
  cost: z.number(),
  laborHours: z.number().optional(),
  downtimeHours: z.number().optional(),
});
export const maintRecordSchema = z.object({
  id: z.string().min(1),
  unitId: z.string().min(1),
  month,
  hours: z.number().nonnegative(),
  lines: z.array(maintLineSchema),
  note: z.string().nullish(), // API returns null for empty notes
});

const shiftFrontSchema = z.object({
  id: z.string().min(1),
  frontName: z.string(),
  tons: z.number(),
  downtimeHours: z.number(),
  downtimeReason: z.string(),
});
export const shiftRecordSchema = z.object({
  id: z.string().min(1),
  quarryId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  shift: z.string(),
  scheduledHours: z.number(),
  fronts: z.array(shiftFrontSchema),
  note: z.string().nullish(), // API returns null for empty notes
});

// The nested config / params / overrides blobs come from our own typed UI;
// validate the envelope and accept the blob object as-is.
const jsonObject = z.record(z.string(), z.unknown());

export const quarrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.string().min(1),
  productionTons: z.number().int().nonnegative(),
  haulKm: z.number(),
  loaderClassId: z.string(),
  truckClassId: z.string(),
  config: jsonObject,
});

export const globalParamsSchema = jsonObject;
export const catalogOverridesSchema = jsonObject;
