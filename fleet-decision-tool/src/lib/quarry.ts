import { MODELS } from "@/data/catalog";
import { unitOperatingPerHour } from "./engine";
import type {
  EquivalenceClass,
  GlobalParams,
  QuarryConfig,
  QuarryFront,
} from "./types";

const refModel = (classId: string) =>
  MODELS.find((m) => m.classId === classId && m.source === "oem") ??
  MODELS.find((m) => m.classId === classId);

export type FrontBottleneck = "Loading" | "Hauling" | "Balanced";

export interface TruckGroupResult {
  id: string;
  label: string;
  classId: string;
  count: number;
  payload: number;
  passes: number;
  cycleSec: number;
  tphPerTruck: number;
  groupTph: number;
}

export interface FrontResult {
  id: string;
  name: string;
  material: string;
  destination: "crusher" | "stockpile";
  loaderTph: number;
  haulTph: number;
  /** Realized feed = min(loader, haul) */
  delivered: number;
  bottleneck: FrontBottleneck;
  /** haul ÷ loader; >1 over-trucked, <1 under-trucked */
  matchFactor: number;
  truckCount: number;
  groups: TruckGroupResult[];
  /** Loader idle capacity not used because trucks can't keep up (tph) */
  haulShortfallTph: number;
  /** Truck capacity wasted queueing at the loader (tph) */
  overTruckTph: number;
  /** Trucks to add to match the loader at this front */
  trucksToBalance: number;
}

export type LossSeverity = "high" | "medium" | "low";

export interface LossItem {
  id: string;
  scope: string;
  title: string;
  detail: string;
  tphImpact: number;
  tonsPerShift: number;
  usdPerYear: number;
  severity: LossSeverity;
}

export interface CostBlock {
  drillBlast: number;
  load: number;
  haul: number;
  crush: number;
  total: number;
  perTon: number;
  tons: number;
}

export interface QuarryResult {
  scheduledHoursYear: number;
  productiveHoursYear: number;
  shiftHours: number;

  fronts: FrontResult[];

  crusherCapacityTph: number;
  crusherDemandTph: number;
  crusherThroughputTph: number;
  crusherQueueTph: number;
  crusherUtilization: number;

  stockpileDeliveredTph: number;
  systemTph: number;
  systemBottleneck: "Crusher" | "Distributed fronts";
  targetTph: number;
  planAttainment: number;

  annualProduction: number;
  recoverableTph: number;

  losses: LossItem[];
  totalLossTph: number;
  totalLossTonsYear: number;
  totalLossUsdYear: number;

  cost: CostBlock;
  fuelGalPerTon: number;
  oee: { availability: number; utilization: number; quality: number; oee: number };

  products: {
    id: string;
    name: string;
    mixPct: number;
    productionTons: number;
    demandTonsYear: number;
    balance: number;
    stockpileTons: number;
    daysCover: number;
    flag: "stockout" | "overstock" | "ok";
  }[];
}

function classOpHr(
  classId: string,
  classById: Map<string, EquivalenceClass>,
  params: GlobalParams
): number {
  const cls = classById.get(classId);
  const model = refModel(classId);
  if (!cls || !model) return 0;
  return unitOperatingPerHour(cls, model, "medium", 0, params).total;
}

function classFuel(classId: string, classById: Map<string, EquivalenceClass>): number {
  return classById.get(classId)?.fuelGalPerHr.average ?? 0;
}

function computeFront(
  front: QuarryFront,
  classById: Map<string, EquivalenceClass>
): FrontResult {
  const bucketEff = front.loaderBucketTons * front.bucketFillFactor;
  const loaderTph =
    front.loaderCycleSec > 0
      ? (bucketEff * 3600) / front.loaderCycleSec * front.loaderAvailability
      : 0;

  const haulLoadedSec =
    front.loadedSpeedKmh > 0 ? (front.haulKm / front.loadedSpeedKmh) * 3600 : 0;
  const returnSec =
    front.emptySpeedKmh > 0 ? (front.haulKm / front.emptySpeedKmh) * 3600 : 0;

  const groups: TruckGroupResult[] = front.trucks.map((g) => {
    const payload = classById.get(g.classId)?.payloadTons ?? 40;
    const passes = Math.max(1, Math.round(payload / Math.max(1, bucketEff)));
    const loadTimeSec = passes * front.loaderCycleSec;
    const cycleSec = front.spotDumpSec + loadTimeSec + haulLoadedSec + returnSec;
    const tphPerTruck = cycleSec > 0 ? payload * (3600 / cycleSec) * g.availability : 0;
    return {
      id: g.id,
      label: g.label,
      classId: g.classId,
      count: g.count,
      payload,
      passes,
      cycleSec,
      tphPerTruck,
      groupTph: tphPerTruck * g.count,
    };
  });

  const haulTph = groups.reduce((s, g) => s + g.groupTph, 0);
  const truckCount = groups.reduce((s, g) => s + g.count, 0);
  const delivered = Math.min(loaderTph, haulTph);
  const matchFactor = loaderTph > 0 ? haulTph / loaderTph : 0;

  let bottleneck: FrontBottleneck = "Balanced";
  if (Math.abs(loaderTph - haulTph) / Math.max(loaderTph, haulTph, 1) > 0.05) {
    bottleneck = haulTph < loaderTph ? "Hauling" : "Loading";
  }

  const haulShortfallTph = Math.max(0, loaderTph - haulTph);
  const overTruckTph = Math.max(0, haulTph - loaderTph);
  const avgTphPerTruck = truckCount > 0 ? haulTph / truckCount : 0;
  const trucksToBalance =
    avgTphPerTruck > 0 ? Math.max(0, Math.ceil(loaderTph / avgTphPerTruck) - truckCount) : 0;

  return {
    id: front.id,
    name: front.name,
    material: front.material,
    destination: front.destination,
    loaderTph,
    haulTph,
    delivered,
    bottleneck,
    matchFactor,
    truckCount,
    groups,
    haulShortfallTph,
    overTruckTph,
    trucksToBalance,
  };
}

export function computeQuarry(
  cfg: QuarryConfig,
  classById: Map<string, EquivalenceClass>,
  params: GlobalParams
): QuarryResult {
  const scheduledHoursYear = cfg.shiftsPerDay * cfg.hoursPerShift * cfg.daysPerYear;
  const productiveHoursYear = scheduledHoursYear * cfg.operatingEfficiency;
  const shiftHours = cfg.hoursPerShift;

  const fronts = cfg.fronts.map((f) => computeFront(f, classById));

  const crusherCapacityTph = cfg.crusherRatedTph * cfg.crusherAvailability;
  const crusherFronts = fronts.filter((f) => f.destination === "crusher");
  const stockFronts = fronts.filter((f) => f.destination === "stockpile");

  const crusherDemandTph = crusherFronts.reduce((s, f) => s + f.delivered, 0);
  const crusherThroughputTph = Math.min(crusherDemandTph, crusherCapacityTph);
  const crusherQueueTph = Math.max(0, crusherDemandTph - crusherCapacityTph);
  const crusherUtilization =
    crusherCapacityTph > 0 ? crusherThroughputTph / crusherCapacityTph : 0;

  const stockpileDeliveredTph = stockFronts.reduce((s, f) => s + f.delivered, 0);
  const systemTph = crusherThroughputTph + stockpileDeliveredTph;
  const systemBottleneck = crusherQueueTph > 0 ? "Crusher" : "Distributed fronts";

  const targetTph = cfg.targetTph;
  const planAttainment = targetTph > 0 ? systemTph / targetTph : 0;
  const annualProduction = systemTph * productiveHoursYear;

  // ---- Efficiency losses (ranked) ----------------------------------------
  const plantHeadroom = Math.max(0, crusherCapacityTph - crusherThroughputTph);
  const losses: LossItem[] = [];

  const tonsYear = (tph: number) => tph * productiveHoursYear;
  const tonsShift = (tph: number) => tph * shiftHours;

  // Crusher over-feed (trucks queue at the crusher)
  if (crusherQueueTph > 0) {
    losses.push({
      id: "crusher-queue",
      scope: "Crusher",
      title: `Crusher over-fed by ${Math.round(crusherQueueTph)} tph`,
      detail:
        "Fronts deliver more than the crusher can take, so trucks queue at the dump. Move trucks to a stockpile front or stagger fronts.",
      tphImpact: crusherQueueTph,
      tonsPerShift: tonsShift(crusherQueueTph),
      usdPerYear: tonsYear(crusherQueueTph) * (cfg.valuePerTon * 0.4),
      severity: crusherQueueTph > crusherCapacityTph * 0.1 ? "high" : "medium",
    });
  }

  // Per-front hauling shortfall (recoverable, capped by plant headroom for crusher fronts)
  let crusherHeadroomLeft = plantHeadroom;
  for (const f of fronts) {
    if (f.haulShortfallTph > 0.5) {
      let recoverable = f.haulShortfallTph;
      if (f.destination === "crusher") {
        recoverable = Math.min(f.haulShortfallTph, crusherHeadroomLeft);
        crusherHeadroomLeft = Math.max(0, crusherHeadroomLeft - recoverable);
      }
      if (recoverable > 0.5) {
        losses.push({
          id: `haul-${f.id}`,
          scope: f.name,
          title: `${f.name}: hauling short ${Math.round(recoverable)} tph`,
          detail: `Loader can feed ${Math.round(f.loaderTph)} tph but trucks deliver ${Math.round(
            f.haulTph
          )}. Add ${f.trucksToBalance} truck(s) to balance the loader${
            f.destination === "crusher" ? " (plant has headroom)." : "."
          }`,
          tphImpact: recoverable,
          tonsPerShift: tonsShift(recoverable),
          usdPerYear: tonsYear(recoverable) * cfg.valuePerTon,
          severity: recoverable > 60 ? "high" : recoverable > 25 ? "medium" : "low",
        });
      }
    }
    // Over-trucking: trucks idle in queue at the loader (cost without output)
    if (f.overTruckTph > 0.5) {
      losses.push({
        id: `over-${f.id}`,
        scope: f.name,
        title: `${f.name}: ${Math.round(f.overTruckTph)} tph of trucks queue at loader`,
        detail: `Trucks (${Math.round(f.haulTph)} tph) exceed the loader (${Math.round(
          f.loaderTph
        )} tph). Reassign a truck to a hauling-short front or speed up loading.`,
        tphImpact: f.overTruckTph,
        tonsPerShift: tonsShift(f.overTruckTph),
        usdPerYear: tonsYear(f.overTruckTph) * (cfg.valuePerTon * 0.3),
        severity: f.overTruckTph > 60 ? "medium" : "low",
      });
    }
  }

  // Calendar / time utilization loss
  const timeLossTph = systemTph * (1 - cfg.operatingEfficiency);
  if (cfg.operatingEfficiency < 0.999) {
    losses.push({
      id: "time-util",
      scope: "Schedule",
      title: `${Math.round((1 - cfg.operatingEfficiency) * 100)}% of scheduled time is non-productive`,
      detail:
        "Delays, blast clearance, shift changes and breaks. Each point recovered adds productive hours across every front.",
      tphImpact: 0,
      tonsPerShift: tonsShift(systemTph) * (1 - cfg.operatingEfficiency),
      usdPerYear:
        scheduledHoursYear * (1 - cfg.operatingEfficiency) * systemTph * cfg.valuePerTon,
      severity: cfg.operatingEfficiency < 0.75 ? "high" : "medium",
    });
  }

  losses.sort((a, b) => b.usdPerYear - a.usdPerYear);

  const recoverableTph =
    Math.min(
      crusherFronts.reduce((s, f) => s + f.haulShortfallTph, 0),
      plantHeadroom
    ) + stockFronts.reduce((s, f) => s + f.haulShortfallTph, 0);

  // Headline "lost production" = genuinely recoverable throughput.
  const totalLossTph = recoverableTph;
  const totalLossTonsYear = recoverableTph * productiveHoursYear;
  const totalLossUsdYear = losses.reduce((s, l) => s + l.usdPerYear, 0);

  // ---- Cost & energy ------------------------------------------------------
  let loadCostYr = 0;
  let haulCostYr = 0;
  let fuelGalYr = 0;
  for (const f of cfg.fronts) {
    loadCostYr += classOpHr(f.loaderClassId, classById, params) * productiveHoursYear;
    fuelGalYr += classFuel(f.loaderClassId, classById) * productiveHoursYear;
    for (const g of f.trucks) {
      haulCostYr += classOpHr(g.classId, classById, params) * g.count * productiveHoursYear;
      fuelGalYr += classFuel(g.classId, classById) * g.count * productiveHoursYear;
    }
  }
  const crushCostYr =
    annualProduction *
    (cfg.kwhPerTon * cfg.energyPriceUsdKwh + cfg.linerCostPerTon + cfg.plantOtherPerTon);
  const drillBlastYr = annualProduction * cfg.drillBlastCostPerTon;
  const totalCost = loadCostYr + haulCostYr + crushCostYr + drillBlastYr;
  const cost: CostBlock = {
    drillBlast: drillBlastYr,
    load: loadCostYr,
    haul: haulCostYr,
    crush: crushCostYr,
    total: totalCost,
    perTon: annualProduction > 0 ? totalCost / annualProduction : 0,
    tons: annualProduction,
  };
  const fuelGalPerTon = annualProduction > 0 ? fuelGalYr / annualProduction : 0;

  const quality = 1 - cfg.outOfSpecPct;
  const oee = {
    availability: cfg.crusherAvailability,
    utilization: crusherUtilization,
    quality,
    oee: cfg.crusherAvailability * crusherUtilization * quality,
  };

  const products = cfg.products.map((p) => {
    const productionTons = annualProduction * p.mixPct;
    const dailyDemand = p.demandTonsYear / 365;
    const daysCover = dailyDemand > 0 ? p.stockpileTons / dailyDemand : 999;
    const balance = productionTons - p.demandTonsYear;
    const flag: "stockout" | "overstock" | "ok" =
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
    shiftHours,
    fronts,
    crusherCapacityTph,
    crusherDemandTph,
    crusherThroughputTph,
    crusherQueueTph,
    crusherUtilization,
    stockpileDeliveredTph,
    systemTph,
    systemBottleneck,
    targetTph,
    planAttainment,
    annualProduction,
    recoverableTph,
    losses,
    totalLossTph,
    totalLossTonsYear,
    totalLossUsdYear,
    cost,
    fuelGalPerTon,
    oee,
    products,
  };
}
