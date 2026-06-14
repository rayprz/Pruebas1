import type {
  CostBreakdown,
  EquipmentModel,
  EquivalenceClass,
  FleetUnit,
  GlobalParams,
  Scenario,
  Severity,
  Site,
} from "./types";

/** Scenario → maintenance/fuel severity column, per the OEM workbook. */
export const SCENARIO_SEVERITY: Record<Scenario, Severity> = {
  low: "moderate",
  medium: "average",
  high: "severe",
};

export const SCENARIOS: Scenario[] = ["low", "medium", "high"];

export const SCENARIO_LABELS: Record<Scenario, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Blended operator cost per machine-hour. Hours beyond the 40-hr base week
 *  are paid at the overtime rate; benefits load the whole wage bill. */
export function laborCostPerHr(scenario: Scenario, p: GlobalParams): number {
  const hours = p.hoursPerWeek[scenario];
  const baseHours = Math.min(hours, p.hoursPerWeek.low);
  const otHours = Math.max(hours - p.hoursPerWeek.low, 0);
  const weekly =
    (baseHours * p.laborRateUsdHr + otHours * p.overtimeRateUsdHr) *
    (1 + p.benefitRate);
  return hours > 0 ? weekly / hours : 0;
}

export function maintenanceCostPerHr(
  cls: EquivalenceClass,
  model: EquipmentModel,
  scenario: Scenario,
  p: GlobalParams
): number {
  const severity = SCENARIO_SEVERITY[scenario];
  const base =
    p.serviceInterval === 250 && cls.maint250
      ? cls.maint250[severity]
      : cls.maint500[severity];
  return base * p.maintenanceEscalation * (p.brandFactors[model.brand] ?? 1);
}

export function fuelCostPerHr(
  cls: EquivalenceClass,
  scenario: Scenario,
  p: GlobalParams
): number {
  return cls.fuelGalPerHr[SCENARIO_SEVERITY[scenario]] * p.fuelPriceUsdGal;
}

export function costBreakdown(
  cls: EquivalenceClass,
  model: EquipmentModel,
  scenario: Scenario,
  p: GlobalParams
): CostBreakdown {
  const fuel = fuelCostPerHr(cls, scenario, p);
  const maintenance = maintenanceCostPerHr(cls, model, scenario, p);
  const labor = laborCostPerHr(scenario, p);
  return { fuel, maintenance, labor, total: fuel + maintenance + labor };
}

/** Annual operating hours implied by a scenario's weekly schedule. */
export function annualHours(scenario: Scenario, p: GlobalParams): number {
  return p.hoursPerWeek[scenario] * 52;
}

export const usd = (n: number, digits = 2) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Compact USD for big figures, e.g. $1.7M, $480K. */
export const usdCompact = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

// ---------------------------------------------------------------------------
// Ownership economics & ageing
// ---------------------------------------------------------------------------

/** Maintenance rises with accumulated hours. A machine at end of life costs up
 *  to ~60% more per hour to maintain than a new one (capped). */
export const AGE_MAINT_K = 0.6;

export function ageMaintenanceMultiplier(
  currentHours: number,
  lifeHours?: number
): number {
  if (!lifeHours || lifeHours <= 0) return 1;
  return Math.min(1.8, 1 + AGE_MAINT_K * (currentHours / lifeHours));
}

export interface OwningCost {
  depreciation: number;
  interest: number;
  insurance: number;
  total: number;
}

/** Annual owning cost (depreciation + cost of capital + insurance). */
export function owningCostPerYear(
  cls: EquivalenceClass,
  annualHours: number,
  p: GlobalParams
): OwningCost {
  const acq = cls.acquisitionUsd ?? 0;
  const life = cls.lifeHours ?? 1;
  const salvage = cls.salvagePct ?? 0.2;
  const depreciation = ((acq * (1 - salvage)) / life) * annualHours;
  const avgCapital = (acq * (1 + salvage)) / 2;
  const interest = avgCapital * p.interestRate;
  const insurance = acq * p.insuranceRate;
  return { depreciation, interest, insurance, total: depreciation + interest + insurance };
}

/** Operating cost/hr for a specific unit, including age-adjusted maintenance. */
export function unitOperatingPerHour(
  cls: EquivalenceClass,
  model: EquipmentModel,
  scenario: Scenario,
  currentHours: number,
  p: GlobalParams
): CostBreakdown {
  const fuel = fuelCostPerHr(cls, scenario, p);
  const maintenance =
    maintenanceCostPerHr(cls, model, scenario, p) *
    ageMaintenanceMultiplier(currentHours, cls.lifeHours);
  const labor = laborCostPerHr(scenario, p);
  return { fuel, maintenance, labor, total: fuel + maintenance + labor };
}

export interface UnitAnnualCost {
  perHour: CostBreakdown;
  operating: number;
  owning: number;
  total: number;
}

export function unitAnnualCost(
  cls: EquivalenceClass,
  model: EquipmentModel,
  scenario: Scenario,
  unit: FleetUnit,
  p: GlobalParams
): UnitAnnualCost {
  const perHour = unitOperatingPerHour(cls, model, scenario, unit.currentHours, p);
  const operating = perHour.total * unit.annualHours;
  const owning = owningCostPerYear(cls, unit.annualHours, p).total;
  return { perHour, operating, owning, total: operating + owning };
}

// ---------------------------------------------------------------------------
// CAPEX planning (overhauls & replacements over a horizon)
// ---------------------------------------------------------------------------

export type CapexType = "overhaul" | "replacement";

export interface CapexEvent {
  year: number;
  unitId: string;
  unitNo: string;
  classId: string;
  type: CapexType;
  cost: number;
  hoursAtEvent: number;
}

/** Projected overhaul and replacement events for a unit over `horizon` years. */
export function unitCapexEvents(
  cls: EquivalenceClass,
  unit: FleetUnit,
  baseYear: number,
  horizon: number
): CapexEvent[] {
  const events: CapexEvent[] = [];
  const acq = cls.acquisitionUsd ?? 0;
  const life = cls.lifeHours ?? Infinity;
  const ovh = cls.overhaulHours ?? Infinity;
  const ovhCost = acq * (cls.overhaulCostPct ?? 0);
  const ah = unit.annualHours;
  if (ah <= 0) return events;

  const endHours = unit.currentHours + ah * horizon;

  let replacementOffset = Infinity;
  if (unit.currentHours < life) {
    replacementOffset = Math.ceil((life - unit.currentHours) / ah);
  }

  if (isFinite(ovh) && ovh > 0) {
    let n = Math.floor(unit.currentHours / ovh) + 1;
    while (n * ovh <= endHours) {
      const hrsAtEvent = n * ovh;
      const offset = Math.ceil((hrsAtEvent - unit.currentHours) / ah);
      if (offset >= 1 && offset <= horizon && offset < replacementOffset) {
        events.push({
          year: baseYear + offset,
          unitId: unit.id,
          unitNo: unit.unitNo,
          classId: cls.id,
          type: "overhaul",
          cost: ovhCost,
          hoursAtEvent: hrsAtEvent,
        });
      }
      n++;
    }
  }

  if (replacementOffset >= 1 && replacementOffset <= horizon) {
    events.push({
      year: baseYear + replacementOffset,
      unitId: unit.id,
      unitNo: unit.unitNo,
      classId: cls.id,
      type: "replacement",
      cost: acq,
      hoursAtEvent: unit.currentHours + ah * replacementOffset,
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Production sizing (simplified truck/loader matching)
// ---------------------------------------------------------------------------

/** Mechanical availability and operating efficiency applied to haul fleets. */
export const TRUCK_AVAILABILITY = 0.82;
export const TRUCK_EFFICIENCY = 0.83; // ~50 productive min/hr

/** One-way haul + return + fixed spot/load/dump time, in minutes. */
export function truckCycleMinutes(haulKm: number, speedKmh = 28, fixedMin = 4): number {
  return fixedMin + ((2 * haulKm) / speedKmh) * 60;
}

export function truckTonsPerYear(
  truckCls: EquivalenceClass,
  haulKm: number,
  annualHours: number
): number {
  const payload = truckCls.payloadTons ?? 0;
  const cycle = truckCycleMinutes(haulKm);
  const tripsPerHr = 60 / cycle;
  return payload * tripsPerHr * TRUCK_AVAILABILITY * TRUCK_EFFICIENCY * annualHours;
}

export interface SizingResult {
  cycleMin: number;
  tonsPerTruckYear: number;
  trucksNeeded: number;
  loadersNeeded: number;
  trucksPerLoader: number;
}

export function sizeSite(
  site: Site,
  truckCls: EquivalenceClass,
  annualHours: number,
  trucksPerLoader: number
): SizingResult {
  const cycleMin = truckCycleMinutes(site.haulKm);
  const tonsPerTruckYear = truckTonsPerYear(truckCls, site.haulKm, annualHours);
  const trucksNeeded =
    tonsPerTruckYear > 0 ? Math.ceil(site.productionTons / tonsPerTruckYear) : 0;
  const loadersNeeded = Math.max(
    site.productionTons > 0 ? 1 : 0,
    Math.ceil(trucksNeeded / Math.max(1, trucksPerLoader))
  );
  return { cycleMin, tonsPerTruckYear, trucksNeeded, loadersNeeded, trucksPerLoader };
}
