import type {
  CostBreakdown,
  EquipmentModel,
  EquivalenceClass,
  GlobalParams,
  Scenario,
  Severity,
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
