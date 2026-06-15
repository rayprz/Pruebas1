import { MODELS } from "@/data/catalog";
import {
  sizeSite,
  unitAnnualCost,
  unitCapexEvents,
  unitOperatingPerHour,
} from "./engine";
import { computeQuarry } from "./quarry";
import { summarize } from "./shiftLog";
import { BASE_YEAR, CAPEX_HORIZON } from "./fleetStore";
import type {
  EquivalenceClass,
  FleetUnit,
  GlobalParams,
  Quarry,
  ShiftRecord,
} from "./types";

const refModel = (classId: string) =>
  MODELS.find((m) => m.classId === classId && m.source === "oem") ??
  MODELS.find((m) => m.classId === classId);
const modelById = new Map(MODELS.map((m) => [m.id, m]));

export const SITE_HRS = 5000;
export const SITE_TPL = 3;

export interface QuarryMetrics {
  quarry: Quarry;
  units: FleetUnit[];
  // Fleet & capital
  operating: number;
  owning: number;
  /** Annualized actual maintenance spend for units that have logged data */
  actualMaintUsdYear: number;
  nearEol: number;
  aging: { unitNo: string; lifePct: number; model: string }[];
  capexByYear: Map<number, number>;
  capexTotal: number;
  excess: number;
  avgAvailability: number;
  // Quarry model
  systemTph: number;
  planAttainment: number;
  bottleneck: string;
  costPerTon: number;
  fuelGalPerTon: number;
  kwhPerTon: number;
  oee: number;
  crusherUtilization: number;
  lossesUsd: number;
  losses: { title: string; usdPerYear: number }[];
  // Actuals
  attainment: number;
  topStopper: string;
}

export function quarryMetrics(
  quarry: Quarry,
  allUnits: FleetUnit[],
  allRecords: ShiftRecord[],
  classById: Map<string, EquivalenceClass>,
  params: GlobalParams,
  maintByUnit?: Map<string, number>,
  availByUnit?: Map<string, number>
): QuarryMetrics {
  const units = allUnits.filter((u) => u.quarryId === quarry.id);
  const unitsById = new Map(units.map((u) => [u.id, u]));

  let operating = 0, owning = 0, nearEol = 0, capexTotal = 0, availSum = 0, actualMaintUsdYear = 0;
  const aging: { unitNo: string; lifePct: number; model: string }[] = [];
  const capexByYear = new Map<number, number>();
  for (const u of units) {
    availSum += u.availability;
    const override = maintByUnit?.get(u.id);
    if (override !== undefined) actualMaintUsdYear += override * u.annualHours;
    const cls = classById.get(u.classId);
    if (!cls) continue;
    const model = modelById.get(u.modelId) ?? refModel(u.classId);
    if (model) {
      const c = unitAnnualCost(cls, model, "medium", u, params, override);
      operating += c.operating;
      owning += c.owning;
      const lifePct = cls.lifeHours ? u.currentHours / cls.lifeHours : 0;
      if (lifePct >= 0.8) nearEol++;
      aging.push({ unitNo: u.unitNo, lifePct, model: `${model.brand} ${model.model}` });
    }
    for (const e of unitCapexEvents(cls, u, BASE_YEAR, CAPEX_HORIZON)) {
      capexByYear.set(e.year, (capexByYear.get(e.year) ?? 0) + e.cost);
      capexTotal += e.cost;
    }
  }
  aging.sort((a, b) => b.lifePct - a.lifePct);

  // Excess OPEX (sizing)
  let excess = 0;
  const truckCls = classById.get(quarry.truckClassId);
  const loaderCls = classById.get(quarry.loaderClassId);
  const tModel = refModel(quarry.truckClassId);
  const lModel = refModel(quarry.loaderClassId);
  if (truckCls && loaderCls && tModel && lModel) {
    const sizing = sizeSite(quarry, truckCls, SITE_HRS, SITE_TPL);
    const optimal =
      sizing.trucksNeeded * unitOperatingPerHour(truckCls, tModel, "medium", 0, params).total * SITE_HRS +
      sizing.loadersNeeded * unitOperatingPerHour(loaderCls, lModel, "medium", 0, params).total * SITE_HRS;
    const current = units.reduce((s, u) => {
      const c = classById.get(u.classId);
      const m = modelById.get(u.modelId) ?? refModel(u.classId);
      return c && m ? s + unitAnnualCost(c, m, "medium", u, params, maintByUnit?.get(u.id)).operating : s;
    }, 0);
    excess = current - optimal;
  }

  const r = computeQuarry(quarry.config, classById, params, unitsById, maintByUnit, availByUnit);
  const modelByFront = new Map(r.fronts.map((f) => [f.name, f.delivered]));
  const records = allRecords.filter((rec) => rec.quarryId === quarry.id);
  const s = summarize(records, modelByFront, quarry.config.targetTph);

  return {
    quarry, units, operating, owning, actualMaintUsdYear, nearEol, aging, capexByYear, capexTotal, excess,
    avgAvailability: units.length ? availSum / units.length : 0,
    systemTph: r.systemTph,
    planAttainment: r.planAttainment,
    bottleneck: r.systemBottleneck === "Crusher" ? "Crusher" : "Fronts",
    costPerTon: r.cost.perTon,
    fuelGalPerTon: r.fuelGalPerTon,
    kwhPerTon: quarry.config.kwhPerTon,
    oee: r.oee.oee,
    crusherUtilization: r.oee.utilization,
    lossesUsd: r.totalLossUsdYear,
    losses: r.losses.map((l) => ({ title: `${quarry.name} · ${l.title}`, usdPerYear: l.usdPerYear })),
    attainment: s.avgAttainment,
    topStopper: s.pareto[0]?.reason ?? "—",
  };
}
