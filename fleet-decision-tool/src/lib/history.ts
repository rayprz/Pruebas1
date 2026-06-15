import { usd, usdCompact } from "./engine";
import { quarryMetrics } from "./rollup";
import {
  actualAvailabilityByUnit,
  actualMaintPerHrByUnit,
  quarryMaint,
} from "./maintLog";
import type {
  EquivalenceClass,
  FleetMonth,
  FleetUnit,
  GlobalParams,
  MaintRecord,
  Quarry,
  ShiftRecord,
} from "./types";

/** The unit's state at the end of a given month (falls back to current state). */
export function unitAt(unit: FleetUnit, fmByKey: Map<string, FleetMonth>, month: string): FleetUnit {
  const fm = fmByKey.get(`${unit.id}|${month}`);
  if (!fm) return unit;
  return { ...unit, currentHours: fm.meterHours, availability: fm.availability, status: fm.status };
}

export interface QuarryKpi {
  operating: number;
  owning: number;
  capexTotal: number;
  excess: number;
  systemTph: number;
  costPerTon: number;
  oee: number;
  lossesUsd: number;
  attainment: number;
  avgAvailability: number;
  maintUsd: number;
  maintPerTon: number;
}

export interface MonthKpi {
  month: string;
  byQuarry: Map<string, QuarryKpi>;
}

/** Recompute every KPI for every month by substituting each unit's historical
 *  state and reusing quarryMetrics / quarryMaint. */
export function kpiHistory(
  months: string[],
  quarries: Quarry[],
  units: FleetUnit[],
  fleetMonths: FleetMonth[],
  shiftRecords: ShiftRecord[],
  maintRecords: MaintRecord[],
  classById: Map<string, EquivalenceClass>,
  params: GlobalParams
): MonthKpi[] {
  const fmByKey = new Map(fleetMonths.map((m) => [`${m.unitId}|${m.month}`, m]));
  const quarryByUnit = new Map(units.map((u) => [u.id, u.quarryId]));
  const productionByQuarry = new Map(quarries.map((q) => [q.id, q.productionTons]));

  return months.map((month) => {
    const histUnits = units.map((u) => unitAt(u, fmByKey, month));
    const shiftForMonth = shiftRecords.filter((r) => r.date.slice(0, 7) === month);
    const maintForMonth = maintRecords.filter((r) => r.month === month);
    const maintByUnit = params.useActualMaint ? actualMaintPerHrByUnit(maintForMonth) : undefined;
    const availByUnit = params.useActualAvailability ? actualAvailabilityByUnit(maintForMonth) : undefined;
    const qm = quarryMaint(maintForMonth, quarryByUnit, productionByQuarry);

    const byQuarry = new Map<string, QuarryKpi>();
    for (const q of quarries) {
      const m = quarryMetrics(q, histUnits, shiftForMonth, classById, params, maintByUnit, availByUnit);
      const mm = qm.get(q.id);
      byQuarry.set(q.id, {
        operating: m.operating,
        owning: m.owning,
        capexTotal: m.capexTotal,
        excess: m.excess,
        systemTph: m.systemTph,
        costPerTon: m.costPerTon,
        oee: m.oee,
        lossesUsd: m.lossesUsd,
        attainment: m.attainment,
        avgAvailability: m.avgAvailability,
        maintUsd: mm?.annualizedCost ?? 0,
        maintPerTon: mm?.perTon ?? 0,
      });
    }
    return { month, byQuarry };
  });
}

// --- KPI catalog for the Trends UI ----------------------------------------

export interface KpiDef {
  key: string;
  label: string;
  /** sum across quarries, or average (for ratios/rates) */
  agg: "sum" | "avg";
  sel: (k: QuarryKpi) => number;
  fmt: (n: number) => string;
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export const KPI_DEFS: KpiDef[] = [
  { key: "operating", label: "Fleet OPEX / yr", agg: "sum", sel: (k) => k.operating, fmt: (n) => usdCompact(n) },
  { key: "owning", label: "Owning / yr", agg: "sum", sel: (k) => k.owning, fmt: (n) => usdCompact(n) },
  { key: "capexTotal", label: "CAPEX (6-yr)", agg: "sum", sel: (k) => k.capexTotal, fmt: (n) => usdCompact(n) },
  { key: "excess", label: "Excess OPEX / yr", agg: "sum", sel: (k) => k.excess, fmt: (n) => usdCompact(n) },
  { key: "lossesUsd", label: "Quarry losses / yr", agg: "sum", sel: (k) => k.lossesUsd, fmt: (n) => usdCompact(n) },
  { key: "maintUsd", label: "Maintenance / yr", agg: "sum", sel: (k) => k.maintUsd, fmt: (n) => usdCompact(n) },
  { key: "costPerTon", label: "Cost / ton", agg: "avg", sel: (k) => k.costPerTon, fmt: (n) => usd(n, 2) },
  { key: "maintPerTon", label: "Maintenance $/ton", agg: "avg", sel: (k) => k.maintPerTon, fmt: (n) => usd(n, 2) },
  { key: "systemTph", label: "System tph", agg: "sum", sel: (k) => k.systemTph, fmt: (n) => Math.round(n).toLocaleString() },
  { key: "attainment", label: "Plan attainment", agg: "avg", sel: (k) => k.attainment, fmt: pct },
  { key: "oee", label: "Crusher OEE", agg: "avg", sel: (k) => k.oee, fmt: pct },
  { key: "avgAvailability", label: "Fleet availability", agg: "avg", sel: (k) => k.avgAvailability, fmt: pct },
];

/** Aggregate a QuarryKpi list per a KPI definition. */
export function aggKpi(def: KpiDef, kpis: QuarryKpi[]): number {
  if (kpis.length === 0) return 0;
  const total = kpis.reduce((s, k) => s + def.sel(k), 0);
  return def.agg === "avg" ? total / kpis.length : total;
}
