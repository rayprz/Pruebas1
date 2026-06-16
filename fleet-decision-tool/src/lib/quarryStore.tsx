"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Quarry, QuarryConfig, QuarryFront, QuarryProduct } from "./types";

const KEY = "fleet-tool-quarries-v2";

// --- Detailed model configs per quarry ------------------------------------

const TEPEACA_CONFIG: QuarryConfig = {
  shiftsPerDay: 2,
  hoursPerShift: 10,
  daysPerYear: 300,
  operatingEfficiency: 0.8,
  crusherRatedTph: 2600,
  crusherAvailability: 0.85,
  kwhPerTon: 1.8,
  energyPriceUsdKwh: 0.12,
  linerCostPerTon: 0.15,
  plantOtherPerTon: 0.4,
  drillBlastCostPerTon: 0.9,
  targetTph: 2000,
  valuePerTon: 4,
  outOfSpecPct: 0.03,
  fronts: [
    {
      id: "f-north", name: "North Limestone", material: "Limestone", destination: "crusher",
      loaderUnitId: "ld01", loaderClassId: "pl-992", loaderBucketTons: 18, loaderCycleSec: 36, bucketFillFactor: 0.9, loaderAvailability: 0.9,
      haulKm: 2.2, loadedSpeedKmh: 28, emptySpeedKmh: 38, spotDumpSec: 75, truckUnitIds: ["ht01", "ht02", "ht04"],
    },
    {
      id: "f-south", name: "South Limestone", material: "Limestone", destination: "crusher",
      loaderUnitId: "ld31", loaderClassId: "pl-988", loaderBucketTons: 12, loaderCycleSec: 33, bucketFillFactor: 0.9, loaderAvailability: 0.88,
      haulKm: 1.6, loadedSpeedKmh: 26, emptySpeedKmh: 36, spotDumpSec: 70, truckUnitIds: ["ht06", "ht07", "ht08"],
    },
    {
      id: "f-clay", name: "Clay Pit", material: "Clay", destination: "stockpile",
      loaderUnitId: "ex21", loaderClassId: "ex-390", loaderBucketTons: 7, loaderCycleSec: 30, bucketFillFactor: 0.85, loaderAvailability: 0.85,
      haulKm: 1.2, loadedSpeedKmh: 24, emptySpeedKmh: 34, spotDumpSec: 60, truckUnitIds: ["ht09", "ht10", "at11"],
    },
    {
      id: "f-ob", name: "Overburden", material: "Waste", destination: "stockpile",
      loaderUnitId: "ld21", loaderClassId: "wl-980", loaderBucketTons: 8, loaderCycleSec: 30, bucketFillFactor: 0.9, loaderAvailability: 0.88,
      haulKm: 0.9, loadedSpeedKmh: 22, emptySpeedKmh: 32, spotDumpSec: 55, truckUnitIds: ["at12", "at13", "at14"],
    },
  ],
  products: [
    { id: "p1", name: '3/4" aggregate', mixPct: 0.3, demandTonsYear: 850000, stockpileTons: 70000 },
    { id: "p2", name: '3/8" aggregate', mixPct: 0.2, demandTonsYear: 560000, stockpileTons: 22000 },
    { id: "p3", name: "Road base", mixPct: 0.25, demandTonsYear: 700000, stockpileTons: 30000 },
    { id: "p4", name: "Sand / fines", mixPct: 0.15, demandTonsYear: 380000, stockpileTons: 9000 },
    { id: "p5", name: "Rip-rap", mixPct: 0.1, demandTonsYear: 260000, stockpileTons: 41000 },
  ],
};

const ATOTONILCO_CONFIG: QuarryConfig = {
  shiftsPerDay: 2, hoursPerShift: 10, daysPerYear: 300, operatingEfficiency: 0.78,
  crusherRatedTph: 1200, crusherAvailability: 0.84, kwhPerTon: 1.9, energyPriceUsdKwh: 0.12,
  linerCostPerTon: 0.16, plantOtherPerTon: 0.42, drillBlastCostPerTon: 0.95,
  targetTph: 850, valuePerTon: 4, outOfSpecPct: 0.04,
  fronts: [
    {
      id: "a-f-main", name: "Main Face", material: "Limestone", destination: "crusher",
      loaderUnitId: "a-ld1", loaderClassId: "pl-988", loaderBucketTons: 12, loaderCycleSec: 33, bucketFillFactor: 0.9, loaderAvailability: 0.87,
      haulKm: 1.8, loadedSpeedKmh: 26, emptySpeedKmh: 36, spotDumpSec: 70, truckUnitIds: ["a-ht1", "a-ht2", "a-ht3"],
    },
    {
      id: "a-f-ob", name: "Overburden", material: "Waste", destination: "stockpile",
      loaderUnitId: "a-ld2", loaderClassId: "wl-980", loaderBucketTons: 8, loaderCycleSec: 30, bucketFillFactor: 0.9, loaderAvailability: 0.85,
      haulKm: 1.0, loadedSpeedKmh: 22, emptySpeedKmh: 32, spotDumpSec: 55, truckUnitIds: ["a-ht4", "a-at1"],
    },
  ],
  products: [
    { id: "ap1", name: '3/4" aggregate', mixPct: 0.4, demandTonsYear: 520000, stockpileTons: 30000 },
    { id: "ap2", name: "Road base", mixPct: 0.35, demandTonsYear: 440000, stockpileTons: 12000 },
    { id: "ap3", name: "Sand / fines", mixPct: 0.25, demandTonsYear: 300000, stockpileTons: 6000 },
  ],
};

const MONTERREY_CONFIG: QuarryConfig = {
  shiftsPerDay: 2, hoursPerShift: 10, daysPerYear: 300, operatingEfficiency: 0.74,
  crusherRatedTph: 900, crusherAvailability: 0.82, kwhPerTon: 2.0, energyPriceUsdKwh: 0.13,
  linerCostPerTon: 0.18, plantOtherPerTon: 0.45, drillBlastCostPerTon: 1.0,
  targetTph: 650, valuePerTon: 4, outOfSpecPct: 0.05,
  fronts: [
    {
      id: "m-f-main", name: "Main Pit", material: "Limestone", destination: "crusher",
      loaderUnitId: "m-ld1", loaderClassId: "wl-980", loaderBucketTons: 8, loaderCycleSec: 32, bucketFillFactor: 0.88, loaderAvailability: 0.86,
      haulKm: 1.5, loadedSpeedKmh: 24, emptySpeedKmh: 34, spotDumpSec: 65, truckUnitIds: ["m-ht1", "m-ht2"],
    },
    {
      id: "m-f-ob", name: "Overburden", material: "Waste", destination: "stockpile",
      loaderUnitId: "m-ld2", loaderClassId: "wl-966", loaderBucketTons: 6, loaderCycleSec: 30, bucketFillFactor: 0.9, loaderAvailability: 0.84,
      haulKm: 0.8, loadedSpeedKmh: 22, emptySpeedKmh: 32, spotDumpSec: 55, truckUnitIds: ["m-ht3", "m-at1"],
    },
  ],
  products: [
    { id: "mp1", name: '3/4" aggregate', mixPct: 0.45, demandTonsYear: 360000, stockpileTons: 14000 },
    { id: "mp2", name: "Road base", mixPct: 0.35, demandTonsYear: 300000, stockpileTons: 7000 },
    { id: "mp3", name: "Sand / fines", mixPct: 0.2, demandTonsYear: 180000, stockpileTons: 3000 },
  ],
};

const DEFAULT_QUARRIES: Quarry[] = [
  { id: "q-tepeaca", name: "Quarry 1", region: "Central", config: TEPEACA_CONFIG, productionTons: 5_408_000, haulKm: 2.5, loaderClassId: "pl-992", truckClassId: "ht-777" },
  { id: "q-atotonilco", name: "Quarry 2", region: "Central", config: ATOTONILCO_CONFIG, productionTons: 1_800_000, haulKm: 1.8, loaderClassId: "pl-988", truckClassId: "ht-773" },
  { id: "q-monterrey", name: "Quarry 3", region: "North", config: MONTERREY_CONFIG, productionTons: 1_200_000, haulKm: 1.5, loaderClassId: "wl-980", truckClassId: "ht-773" },
];

const CONFIG_BY_ID: Record<string, QuarryConfig> = {
  "q-tepeaca": TEPEACA_CONFIG,
  "q-atotonilco": ATOTONILCO_CONFIG,
  "q-monterrey": MONTERREY_CONFIG,
};

function blankConfig(): QuarryConfig {
  return {
    shiftsPerDay: 2, hoursPerShift: 10, daysPerYear: 300, operatingEfficiency: 0.8,
    crusherRatedTph: 1000, crusherAvailability: 0.85, kwhPerTon: 1.8, energyPriceUsdKwh: 0.12,
    linerCostPerTon: 0.15, plantOtherPerTon: 0.4, drillBlastCostPerTon: 0.9,
    targetTph: 800, valuePerTon: 4, outOfSpecPct: 0.03,
    fronts: [],
    products: [{ id: `p-${Date.now()}`, name: '3/4" aggregate', mixPct: 1, demandTonsYear: 400000, stockpileTons: 20000 }],
  };
}

interface QuarryStore {
  quarries: Quarry[];
  activeQuarryId: string;
  active: Quarry;
  config: QuarryConfig;
  /** Global multi-select used to scope the aggregate modules. */
  selectedQuarryIds: string[];
  selectedQuarries: Quarry[];
  setSelectedQuarries: (ids: string[]) => void;
  setActiveQuarry: (id: string) => void;
  addQuarry: () => void;
  updateQuarry: (id: string, patch: Partial<Omit<Quarry, "config">>) => void;
  removeQuarry: (id: string) => void;
  // Active quarry's config:
  update: (patch: Partial<QuarryConfig>) => void;
  updateFront: (id: string, patch: Partial<QuarryFront>) => void;
  addFront: () => void;
  removeFront: (id: string) => void;
  assignTruck: (frontId: string, unitId: string) => void;
  unassignTruck: (frontId: string, unitId: string) => void;
  assignLoader: (frontId: string, unitId: string) => void;
  unassignLoader: (frontId: string) => void;
  updateProduct: (id: string, patch: Partial<QuarryProduct>) => void;
  reset: () => void;
}

const QuarryContext = createContext<QuarryStore | null>(null);

export function QuarryProvider({ children }: { children: ReactNode }) {
  const [quarries, setQuarries] = useState<Quarry[]>(DEFAULT_QUARRIES);
  const [activeQuarryId, setActiveQuarryId] = useState<string>(DEFAULT_QUARRIES[0].id);
  const [selectedQuarryIds, setSelectedQuarryIds] = useState<string[]>(DEFAULT_QUARRIES.map((q) => q.id));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { quarries?: Quarry[]; activeQuarryId?: string; selectedQuarryIds?: string[] };
        if (saved.quarries?.length) {
          setQuarries(saved.quarries);
          setActiveQuarryId(
            saved.activeQuarryId && saved.quarries.some((q) => q.id === saved.activeQuarryId)
              ? saved.activeQuarryId
              : saved.quarries[0].id
          );
          const ids = saved.quarries.map((q) => q.id);
          const sel = saved.selectedQuarryIds?.filter((id) => ids.includes(id));
          setSelectedQuarryIds(sel && sel.length ? sel : ids);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<QuarryStore>(() => {
    const persist = (nextQuarries: Quarry[], nextActive: string, nextSelected: string[] = selectedQuarryIds) => {
      const ids = nextQuarries.map((q) => q.id);
      const sel = nextSelected.filter((id) => ids.includes(id));
      const selected = sel.length ? sel : ids;
      setQuarries(nextQuarries);
      setActiveQuarryId(nextActive);
      setSelectedQuarryIds(selected);
      try {
        localStorage.setItem(KEY, JSON.stringify({ quarries: nextQuarries, activeQuarryId: nextActive, selectedQuarryIds: selected }));
      } catch {
        /* ignore */
      }
    };
    const patchQuarry = (id: string, fn: (q: Quarry) => Quarry) =>
      persist(quarries.map((q) => (q.id === id ? fn(q) : q)), activeQuarryId);
    const patchConfig = (fn: (c: QuarryConfig) => QuarryConfig) =>
      patchQuarry(activeQuarryId, (q) => ({ ...q, config: fn(q.config) }));
    const mapFront = (frontId: string, fn: (f: QuarryFront) => QuarryFront) =>
      patchConfig((c) => ({ ...c, fronts: c.fronts.map((f) => (f.id === frontId ? fn(f) : f)) }));

    const active = quarries.find((q) => q.id === activeQuarryId) ?? quarries[0];

    return {
      quarries,
      activeQuarryId,
      active,
      config: active.config,
      selectedQuarryIds,
      selectedQuarries: quarries.filter((q) => selectedQuarryIds.includes(q.id)),
      setSelectedQuarries: (ids) => persist(quarries, activeQuarryId, ids),
      setActiveQuarry: (id) => persist(quarries, id),
      addQuarry: () => {
        const id = `q-${Date.now()}`;
        persist(
          [...quarries, { id, name: "New quarry", region: active.region, config: blankConfig(), productionTons: 1_000_000, haulKm: 1.5, loaderClassId: "wl-980", truckClassId: "ht-773" }],
          id,
          [...selectedQuarryIds, id]
        );
      },
      updateQuarry: (id, patch) => patchQuarry(id, (q) => ({ ...q, ...patch })),
      removeQuarry: (id) => {
        if (quarries.length <= 1) return;
        const next = quarries.filter((q) => q.id !== id);
        persist(next, activeQuarryId === id ? next[0].id : activeQuarryId);
      },
      update: (patch) => patchConfig((c) => ({ ...c, ...patch })),
      updateFront: (frontId, patch) => mapFront(frontId, (f) => ({ ...f, ...patch })),
      addFront: () =>
        patchConfig((c) => ({
          ...c,
          fronts: [
            ...c.fronts,
            { id: `f-${Date.now()}`, name: "New front", material: "Limestone", destination: "crusher", loaderClassId: "wl-980", loaderBucketTons: 8, loaderCycleSec: 32, bucketFillFactor: 0.9, loaderAvailability: 0.85, haulKm: 1.5, loadedSpeedKmh: 25, emptySpeedKmh: 35, spotDumpSec: 65, truckUnitIds: [] },
          ],
        })),
      removeFront: (frontId) => patchConfig((c) => ({ ...c, fronts: c.fronts.filter((f) => f.id !== frontId) })),
      assignTruck: (frontId, unitId) =>
        patchConfig((c) => ({
          ...c,
          fronts: c.fronts.map((f) => {
            const without = f.truckUnitIds.filter((id) => id !== unitId);
            return f.id === frontId ? { ...f, truckUnitIds: [...without, unitId] } : { ...f, truckUnitIds: without };
          }),
        })),
      unassignTruck: (frontId, unitId) =>
        mapFront(frontId, (f) => ({ ...f, truckUnitIds: f.truckUnitIds.filter((id) => id !== unitId) })),
      assignLoader: (frontId, unitId) =>
        patchConfig((c) => ({
          ...c,
          fronts: c.fronts.map((f) => {
            if (f.id === frontId) return { ...f, loaderUnitId: unitId };
            return f.loaderUnitId === unitId ? { ...f, loaderUnitId: undefined } : f;
          }),
        })),
      unassignLoader: (frontId) => mapFront(frontId, (f) => ({ ...f, loaderUnitId: undefined })),
      updateProduct: (productId, patch) =>
        patchConfig((c) => ({ ...c, products: c.products.map((p) => (p.id === productId ? { ...p, ...patch } : p)) })),
      reset: () => {
        const seed = CONFIG_BY_ID[activeQuarryId];
        if (seed) patchConfig(() => structuredClone(seed));
      },
    };
  }, [quarries, activeQuarryId, selectedQuarryIds]);

  return <QuarryContext.Provider value={store}>{children}</QuarryContext.Provider>;
}

export function useQuarry(): QuarryStore {
  const ctx = useContext(QuarryContext);
  if (!ctx) throw new Error("useQuarry must be used inside QuarryProvider");
  return ctx;
}
