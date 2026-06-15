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
  /** Work area / site this unit is assigned to */
  site: string;
  status: "active" | "standby" | "down";
}

/** A work area with a yearly production target served by a loader+truck pair. */
export interface Site {
  id: string;
  name: string;
  /** Required production, short tons per year */
  productionTons: number;
  /** Haul distance, one-way km (drives truck cycle time) */
  haulKm: number;
  /** Loader/excavator class assigned to load */
  loaderClassId: string;
  /** Haul-truck class assigned */
  truckClassId: string;
}

/** A saleable product (gradation) coming off the plant. */
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

/** Full operating assumptions for one aggregates quarry. */
export interface QuarryConfig {
  // Calendar / time
  shiftsPerDay: number;
  hoursPerShift: number;
  daysPerYear: number;
  /** Productive fraction of scheduled time (delays, blasting, shift change) */
  operatingEfficiency: number;
  // Loading
  loaderClassId: string;
  nLoaders: number;
  loaderCycleSec: number;
  passesPerTruck: number;
  bucketFillFactor: number;
  // Hauling
  truckClassId: string;
  nTrucks: number;
  haulKm: number;
  loadedSpeedKmh: number;
  emptySpeedKmh: number;
  spotDumpSec: number;
  truckAvailability: number;
  // Crusher / plant
  crusherRatedTph: number;
  crusherAvailability: number;
  kwhPerTon: number;
  energyPriceUsdKwh: number;
  linerCostPerTon: number;
  plantOtherPerTon: number;
  // Other cost
  drillBlastCostPerTon: number;
  // Targets & actuals
  targetTonsYear: number;
  /** Optional measured production; when set, used as the "real" side */
  actualTonsYear?: number;
  // Quality
  outOfSpecPct: number;
  // Products
  products: QuarryProduct[];
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
}

export interface CostBreakdown {
  fuel: number;
  maintenance: number;
  labor: number;
  total: number;
}
