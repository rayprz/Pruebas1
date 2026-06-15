// Core domain types for the Fleet Decision Tool.
// Cost baseline: OEM "Mobile Equipment O&O Costs" file, 2022 base year, USD.

export type Severity = "moderate" | "average" | "severe";

/** Combined operating scenario used by the OEM workbook:
 *  low    = moderate severity @ 40 hrs/week (no overtime)
 *  medium = average severity @ 50 hrs/week (10 OT hrs)
 *  high   = severe severity @ 60 hrs/week (20 OT hrs)
 */
export type Scenario = "low" | "medium" | "high";

export type Category =
  | "wheel-loader"
  | "pit-loader"
  | "excavator"
  | "rigid-truck"
  | "articulated-truck"
  | "dozer"
  | "motor-grader"
  | "misc";

export type Brand =
  | "Caterpillar"
  | "Komatsu"
  | "John Deere"
  | "Volvo"
  | "Hitachi"
  | "Terex"
  | "Case"
  | "Kawasaki";

export interface SeverityValues {
  moderate: number;
  average: number;
  severe: number;
}

/** A size/duty class of machine. Cost data lives at class level: the
 *  Caterpillar reference model provides the 2022 OEM baseline and
 *  equivalent models from other brands inherit it (adjusted by an
 *  editable per-brand factor) until real data is loaded. */
export interface EquivalenceClass {
  id: string;
  /** Human label, e.g. "Medium Wheel Loader – 980 class" */
  name: string;
  category: Category;
  /** Nominal payload / bucket class in short tons where applicable */
  payloadTons?: number;
  /** Maintenance & service USD/hr @ 500-hr service interval (2022) */
  maint500: SeverityValues;
  /** Maintenance & service USD/hr @ 250-hr service interval (2022), when published */
  maint250?: SeverityValues;
  /** Fuel burn, US gallons per hour */
  fuelGalPerHr: SeverityValues;
  /** --- Ownership economics (estimates, editable) --------------------- */
  /** New-machine acquisition price, USD */
  acquisitionUsd?: number;
  /** Economic life, operating hours */
  lifeHours?: number;
  /** Residual value at end of life, as fraction of acquisition (e.g. 0.25) */
  salvagePct?: number;
  /** Major overhaul interval, operating hours */
  overhaulHours?: number;
  /** Overhaul cost as fraction of acquisition price (e.g. 0.18) */
  overhaulCostPct?: number;
}

/** A single physical machine the customer owns or evaluates. */
export interface FleetUnit {
  id: string;
  /** Unit / asset number, e.g. "HT-204" */
  unitNo: string;
  classId: string;
  /** Specific model id from the catalog (carries the brand) */
  modelId: string;
  /** Model year */
  year: number;
  /** Current meter reading, operating hours */
  currentHours: number;
  /** Projected utilization, hours per year */
  annualHours: number;
  /** Mechanical availability, 0..1 (used by the Quarry model) */
  availability: number;
  /** The quarry (site) this unit belongs to — Quarry id */
  quarryId: string;
  status: "active" | "standby" | "down";
}

/** One front's actual contribution within a logged shift. */
export interface ShiftFrontEntry {
  id: string;
  frontName: string;
  /** Tons produced/moved by this front in the shift */
  tons: number;
  /** Downtime hours at this front (loader/trucks/route) */
  downtimeHours: number;
  /** Primary downtime cause for this front */
  downtimeReason: string;
}

/** A logged production shift, broken down by front, for actual-vs-model tracking. */
export interface ShiftRecord {
  id: string;
  /** The quarry this shift belongs to — Quarry id */
  quarryId: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  /** Shift label, e.g. "A" / "B" / "Night" */
  shift: string;
  scheduledHours: number;
  fronts: ShiftFrontEntry[];
  note?: string;
}

/** Maintenance type for a cost line. */
export type MaintType = "preventive" | "corrective" | "overhaul";

/** One maintenance cost line within a unit-month (by subsystem & type). */
export interface MaintLine {
  id: string;
  subsystem: string;
  type: MaintType;
  cost: number;
  laborHours?: number;
}

/** A unit's maintenance for one month, broken down into subsystem lines. */
export interface MaintRecord {
  id: string;
  /** FleetUnit id — quarry/class/brand/hours derive from My Fleet */
  unitId: string;
  /** "YYYY-MM" */
  month: string;
  /** Operating hours run that month (for $/hr) */
  hours: number;
  lines: MaintLine[];
  note?: string;
}
export interface QuarryProduct {
  id: string;
  name: string;
  /** Share of total plant output, 0..1 */
  mixPct: number;
  /** Annual sales/draw, short tons */
  demandTonsYear: number;
  /** Current stockpile, short tons */
  stockpileTons: number;
}

/** A loading face / route. Each front has its own loader and a set of haul
 *  trucks (real units assigned from My Fleet), so each can have its own
 *  bottleneck. */
export interface QuarryFront {
  id: string;
  name: string;
  material: string;
  /** Where this front delivers: the shared crusher, or straight to stockpile */
  destination: "crusher" | "stockpile";
  // Loading
  /** Assigned fleet loader unit (FleetUnit id). When set, the loader's class,
   *  brand and availability come from the unit; falls back to loaderClassId
   *  / loaderAvailability when empty. */
  loaderUnitId?: string;
  loaderClassId: string;
  loaderBucketTons: number;
  loaderCycleSec: number;
  bucketFillFactor: number;
  loaderAvailability: number;
  // Route
  haulKm: number;
  loadedSpeedKmh: number;
  emptySpeedKmh: number;
  spotDumpSec: number;
  /** Haul trucks assigned to this front — references FleetUnit ids in My Fleet */
  truckUnitIds: string[];
}

/** Full operating assumptions for one aggregates quarry with multiple fronts. */
export interface QuarryConfig {
  // Calendar / time
  shiftsPerDay: number;
  hoursPerShift: number;
  daysPerYear: number;
  /** Productive fraction of scheduled time (delays, blasting, shift change) */
  operatingEfficiency: number;
  // Shared crusher / plant
  crusherRatedTph: number;
  crusherAvailability: number;
  kwhPerTon: number;
  energyPriceUsdKwh: number;
  linerCostPerTon: number;
  plantOtherPerTon: number;
  drillBlastCostPerTon: number;
  /** Plant production target, tons per hour */
  targetTph: number;
  /** Contribution margin per ton, used to value lost production */
  valuePerTon: number;
  outOfSpecPct: number;
  // Fronts & products
  fronts: QuarryFront[];
  products: QuarryProduct[];
}

/** A quarry = a site: the top-level operation. Owns its detailed performance
 *  model (config), plus coarse sizing inputs reused by Sites & Production.
 *  Grouped by region for VP-level rollups (Región → Cantera). */
export interface Quarry {
  id: string;
  name: string;
  region: string;
  config: QuarryConfig;
  /** Annual production target (short tons) for excess-OPEX sizing */
  productionTons: number;
  /** Representative one-way haul (km) for sizing */
  haulKm: number;
  /** Representative loader class for sizing */
  loaderClassId: string;
  /** Representative haul-truck class for sizing */
  truckClassId: string;
}

export interface EquipmentModel {
  id: string;
  brand: Brand;
  model: string;
  classId: string;
  /** "oem" = model backed by OEM 2022 cost data (Cat reference);
   *  "equivalence" = costs estimated from the class reference model */
  source: "oem" | "equivalence";
}

/** Loader/excavator passes needed to fill a truck (fleet matching). */
export interface PassMatchEntry {
  truck: string; // e.g. "777 (100 T)"
  loader: string; // e.g. "992"
  passes: string; // e.g. "4-5"
}

export interface GlobalParams {
  /** Diesel price USD per gallon, excluding tax */
  fuelPriceUsdGal: number;
  /** Operator straight-time rate USD/hr */
  laborRateUsdHr: number;
  /** Operator overtime rate USD/hr */
  overtimeRateUsdHr: number;
  /** Benefits as fraction of wages (0.35 = 35%) */
  benefitRate: number;
  /** Service interval driving the maintenance baseline */
  serviceInterval: 250 | 500;
  /** Scheduled hours/week per scenario */
  hoursPerWeek: { low: number; medium: number; high: number };
  /** Escalation multiplier applied to 2022 maintenance baseline (e.g. 1.15) */
  maintenanceEscalation: number;
  /** Per-brand maintenance adjustment vs the class reference (1.0 = parity) */
  brandFactors: Record<Brand, number>;
  /** Annual cost of capital used for owning cost (e.g. 0.08) */
  interestRate: number;
  /** Annual insurance as fraction of acquisition value (e.g. 0.02) */
  insuranceRate: number;
  /** When true, use logged actual maintenance $/hr (where available) instead of
   *  the modeled class baseline, across Fleet / Quarry / Dashboard. */
  useActualMaint: boolean;
}

export interface CostBreakdown {
  fuel: number;
  maintenance: number;
  labor: number;
  total: number;
}
