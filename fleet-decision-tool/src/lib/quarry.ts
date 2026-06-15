import { MODELS } from "@/data/catalog";
import { unitOperatingPerHour } from "./engine";
import type { EquivalenceClass, GlobalParams, QuarryConfig } from "./types";

const refModel = (classId: string) =>
  MODELS.find((m) => m.classId === classId && m.source === "oem") ??
  MODELS.find((m) => m.classId === classId)!;

export type Stage = "Loading" | "Hauling" | "Crushing";

export interface StageCapacity {
  stage: Stage;
  tph: number;
  bottleneck: boolean;
}

export interface ProductResult {
  id: string;
  name: string;
  mixPct: number;
  productionTons: number;
  demandTonsYear: number;
  balance: number; // production - demand
  stockpileTons: number;
  daysCover: number;
  flag: "stockout" | "overstock" | "ok";
}

export interface QuarryResult {
  scheduledHoursYear: number;
  productiveHoursYear: number;

  truckPayload: number;
  loadTimePerTruckSec: number;
  truckCycleSec: number;
  tripsPerHrPerTruck: number;

  loadingTph: number;
  haulTph: number;
  crusherCapacityTph: number;
  stageCaps: StageCapacity[];
  bottleneck: Stage;

  currentTph: number;
  optimalTph: number;
  annualCurrent: number;
  annualOptimal: number;
  annualTarget: number;
  /** "real" production used in comparison (actual override or modeled current) */
  annualReal: number;
  lostTons: number;
  planAttainment: number;

  matchFactor: number;
  trucksRecommended: number;
  loadersRecommended: number;

  // Costs
  costCurrent: CostBlock;
  costOptimal: CostBlock;
  fuelGalPerTon: number;

  // OEE (crusher)
  oee: { availability: number; utilization: number; performance: number; quality: number; oee: number };

  products: ProductResult[];
}

export interface CostBlock {
  drillBlast: number;
  load: number;
  haul: number;
  crush: number; // energy + liner + plant other
  total: number;
  perTon: number;
  tons: number;
}

export function computeQuarry(
  cfg: QuarryConfig,
  classById: Map<string, EquivalenceClass>,
  params: GlobalParams
): QuarryResult {
  const loaderCls = classById.get(cfg.loaderClassId);
  const truckCls = classById.get(cfg.truckClassId);

  const scheduledHoursYear = cfg.shiftsPerDay * cfg.hoursPerShift * cfg.daysPerYear;
  const productiveHoursYear = scheduledHoursYear * cfg.operatingEfficiency;

  const truckPayload = truckCls?.payloadTons ?? 40;
  const loadTimePerTruckSec = cfg.passesPerTruck * cfg.loaderCycleSec;
  const haulLoadedSec = cfg.loadedSpeedKmh > 0 ? (cfg.haulKm / cfg.loadedSpeedKmh) * 3600 : 0;
  const returnSec = cfg.emptySpeedKmh > 0 ? (cfg.haulKm / cfg.emptySpeedKmh) * 3600 : 0;
  const truckCycleSec = cfg.spotDumpSec + loadTimePerTruckSec + haulLoadedSec + returnSec;
  const tripsPerHrPerTruck = truckCycleSec > 0 ? 3600 / truckCycleSec : 0;

  const haulTphPerTruck = truckPayload * tripsPerHrPerTruck * cfg.truckAvailability;
  const haulTph = cfg.nTrucks * haulTphPerTruck;

  const loadingTphPerLoader =
    loadTimePerTruckSec > 0
      ? (truckPayload * 3600) / loadTimePerTruckSec * cfg.bucketFillFactor
      : 0;
  const loadingTph = cfg.nLoaders * loadingTphPerLoader;

  const crusherCapacityTph = cfg.crusherRatedTph * cfg.crusherAvailability;

  const stages: { stage: Stage; tph: number }[] = [
    { stage: "Loading", tph: loadingTph },
    { stage: "Hauling", tph: haulTph },
    { stage: "Crushing", tph: crusherCapacityTph },
  ];
  const currentTph = Math.min(...stages.map((s) => s.tph));
  const bottleneck = stages.find((s) => s.tph === currentTph)!.stage;
  const stageCaps: StageCapacity[] = stages.map((s) => ({
    ...s,
    bottleneck: s.stage === bottleneck,
  }));

  // Optimal = feed the crusher to its capacity (the design constraint)
  const optimalTph = crusherCapacityTph;

  const annualCurrent = currentTph * productiveHoursYear;
  const annualOptimal = optimalTph * productiveHoursYear;
  const annualTarget = cfg.targetTonsYear;
  const annualReal = cfg.actualTonsYear && cfg.actualTonsYear > 0 ? cfg.actualTonsYear : annualCurrent;
  const lostTons = Math.max(0, annualOptimal - annualReal);
  const planAttainment = annualTarget > 0 ? annualReal / annualTarget : 0;

  // Match factor: >1 over-trucked (queue at loader), <1 under-trucked (loader idle)
  const matchFactor =
    cfg.nLoaders > 0 && truckCycleSec > 0
      ? (cfg.nTrucks * loadTimePerTruckSec) / (cfg.nLoaders * truckCycleSec)
      : 0;

  const trucksRecommended = haulTphPerTruck > 0 ? Math.ceil(crusherCapacityTph / haulTphPerTruck) : 0;
  const loadersRecommended = loadingTphPerLoader > 0 ? Math.ceil(crusherCapacityTph / loadingTphPerLoader) : 0;

  const loaderOpHr = loaderCls
    ? unitOperatingPerHour(loaderCls, refModel(cfg.loaderClassId), "medium", 0, params).total
    : 0;
  const truckOpHr = truckCls
    ? unitOperatingPerHour(truckCls, refModel(cfg.truckClassId), "medium", 0, params).total
    : 0;

  const costAt = (nL: number, nT: number, tons: number): CostBlock => {
    const load = nL * loaderOpHr * productiveHoursYear;
    const haul = nT * truckOpHr * productiveHoursYear;
    const crush =
      tons * (cfg.kwhPerTon * cfg.energyPriceUsdKwh + cfg.linerCostPerTon + cfg.plantOtherPerTon);
    const drillBlast = tons * cfg.drillBlastCostPerTon;
    const total = load + haul + crush + drillBlast;
    return { drillBlast, load, haul, crush, total, perTon: tons > 0 ? total / tons : 0, tons };
  };

  const costCurrent = costAt(cfg.nLoaders, cfg.nTrucks, annualReal);
  const costOptimal = costAt(loadersRecommended, trucksRecommended, annualOptimal);

  const loaderFuel = loaderCls?.fuelGalPerHr.average ?? 0;
  const truckFuel = truckCls?.fuelGalPerHr.average ?? 0;
  const totalFuelGalYear =
    (cfg.nLoaders * loaderFuel + cfg.nTrucks * truckFuel) * productiveHoursYear;
  const fuelGalPerTon = annualReal > 0 ? totalFuelGalYear / annualReal : 0;

  const utilization = crusherCapacityTph > 0 ? currentTph / crusherCapacityTph : 0;
  const performance = cfg.crusherRatedTph > 0 ? currentTph / cfg.crusherRatedTph : 0;
  const quality = 1 - cfg.outOfSpecPct;
  const oee = {
    availability: cfg.crusherAvailability,
    utilization,
    performance,
    quality,
    oee: cfg.crusherAvailability * utilization * quality,
  };

  const products: ProductResult[] = cfg.products.map((p) => {
    const productionTons = annualReal * p.mixPct;
    const dailyDemand = p.demandTonsYear / 365;
    const daysCover = dailyDemand > 0 ? p.stockpileTons / dailyDemand : 999;
    const balance = productionTons - p.demandTonsYear;
    const flag: ProductResult["flag"] =
      daysCover < 7 ? "stockout" : daysCover > 60 ? "overstock" : "ok";
    return {
      id: p.id,
      name: p.name,
      mixPct: p.mixPct,
      productionTons,
      demandTonsYear: p.demandTonsYear,
      balance,
      stockpileTons: p.stockpileTons,
      daysCover,
      flag,
    };
  });

  return {
    scheduledHoursYear,
    productiveHoursYear,
    truckPayload,
    loadTimePerTruckSec,
    truckCycleSec,
    tripsPerHrPerTruck,
    loadingTph,
    haulTph,
    crusherCapacityTph,
    stageCaps,
    bottleneck,
    currentTph,
    optimalTph,
    annualCurrent,
    annualOptimal,
    annualTarget,
    annualReal,
    lostTons,
    planAttainment,
    matchFactor,
    trucksRecommended,
    loadersRecommended,
    costCurrent,
    costOptimal,
    fuelGalPerTon,
    oee,
    products,
  };
}
