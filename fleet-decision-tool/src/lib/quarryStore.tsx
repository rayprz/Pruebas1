"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Quarry, QuarryConfig, QuarryFront, QuarryProduct } from "./types";
import { api } from "./config";
import { JSON_HEADERS, useSyncedList } from "./clientSync";

// Quarry business data lives in the DB; activeQuarryId / selectedQuarryIds are
// per-user UI preferences kept in localStorage under this key.
const UI_KEY = "fleet-tool-quarry-ui-v1";

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

export const DEFAULT_QUARRIES: Quarry[] = [
  { id: "q-tepeaca", name: "Quarry 1", region: "Centro", config: TEPEACA_CONFIG, productionTons: 5_408_000, haulKm: 2.5, loaderClassId: "pl-992", truckClassId: "ht-777" },
  { id: "q-atotonilco", name: "Quarry 2", region: "Centro", config: ATOTONILCO_CONFIG, productionTons: 1_800_000, haulKm: 1.8, loaderClassId: "pl-988", truckClassId: "ht-773" },
  { id: "q-monterrey", name: "Quarry 3", region: "Norte", config: MONTERREY_CONFIG, productionTons: 1_200_000, haulKm: 1.5, loaderClassId: "wl-980", truckClassId: "ht-773" },
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

const PLACEHOLDER: Quarry = {
  id: "",
  name: "—",
  region: "—",
  config: blankConfig(),
  productionTons: 0,
  haulKm: 0,
  loaderClassId: "wl-980",
  truckClassId: "ht-773",
};

interface QuarryStore {
  quarries: Quarry[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
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

const putQuarry = (q: Quarry) =>
  fetch(api(`/api/quarries/${q.id}`), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(q) });
const delQuarry = (id: string) => fetch(api(`/api/quarries/${id}`), { method: "DELETE" });

export function QuarryProvider({ children }: { children: ReactNode }) {
  const { items: quarries, isLoading, isSyncing, error, mutate } = useSyncedList<Quarry>("/api/quarries");
  const [activeQuarryId, setActiveQuarryId] = useState<string>("");
  const [selectedQuarryIds, setSelectedQuarryIds] = useState<string[]>([]);
  const uiInit = useRef(false);

  // Initialize UI prefs (active + selection) once the quarries have loaded.
  useEffect(() => {
    if (uiInit.current || quarries.length === 0) return;
    uiInit.current = true;
    const ids = quarries.map((q) => q.id);
    let savedActive = "";
    let savedSelected: string[] | undefined;
    try {
      const raw = localStorage.getItem(UI_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { activeQuarryId?: string; selectedQuarryIds?: string[] };
        savedActive = s.activeQuarryId ?? "";
        savedSelected = s.selectedQuarryIds;
      }
    } catch {
      /* ignore */
    }
    setActiveQuarryId(ids.includes(savedActive) ? savedActive : ids[0]);
    const sel = savedSelected?.filter((id) => ids.includes(id));
    setSelectedQuarryIds(sel && sel.length ? sel : ids);
  }, [quarries]);

  const persistUi = (nextActive: string, nextSelected: string[]) => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ activeQuarryId: nextActive, selectedQuarryIds: nextSelected }));
    } catch {
      /* ignore */
    }
  };

  const store = useMemo<QuarryStore>(() => {
    // Persist one quarry to the API + optimistically update the list.
    const saveQuarry = (updated: Quarry) =>
      mutate(quarries.map((q) => (q.id === updated.id ? updated : q)), () => putQuarry(updated));
    const patchQuarry = (id: string, fn: (q: Quarry) => Quarry) => {
      const q = quarries.find((x) => x.id === id);
      if (q) saveQuarry(fn(q));
    };
    const patchConfig = (fn: (c: QuarryConfig) => QuarryConfig) =>
      patchQuarry(activeQuarryId, (q) => ({ ...q, config: fn(q.config) }));
    const mapFront = (frontId: string, fn: (f: QuarryFront) => QuarryFront) =>
      patchConfig((c) => ({ ...c, fronts: c.fronts.map((f) => (f.id === frontId ? fn(f) : f)) }));

    const active = quarries.find((q) => q.id === activeQuarryId) ?? quarries[0] ?? PLACEHOLDER;

    return {
      quarries,
      isLoading,
      isSyncing,
      error,
      activeQuarryId,
      active,
      config: active.config,
      selectedQuarryIds,
      selectedQuarries: quarries.filter((q) => selectedQuarryIds.includes(q.id)),
      setSelectedQuarries: (ids) => {
        setSelectedQuarryIds(ids);
        persistUi(activeQuarryId, ids);
      },
      setActiveQuarry: (id) => {
        setActiveQuarryId(id);
        persistUi(id, selectedQuarryIds);
      },
      addQuarry: () => {
        const id = `q-${Date.now()}`;
        const nq: Quarry = { id, name: "New quarry", region: active.region, config: blankConfig(), productionTons: 1_000_000, haulKm: 1.5, loaderClassId: "wl-980", truckClassId: "ht-773" };
        mutate([...quarries, nq], () => putQuarry(nq));
        const nextSel = [...selectedQuarryIds, id];
        setActiveQuarryId(id);
        setSelectedQuarryIds(nextSel);
        persistUi(id, nextSel);
      },
      updateQuarry: (id, patch) => patchQuarry(id, (q) => ({ ...q, ...patch })),
      removeQuarry: (id) => {
        if (quarries.length <= 1) return;
        const next = quarries.filter((q) => q.id !== id);
        mutate(next, () => delQuarry(id));
        const nextSel = selectedQuarryIds.filter((x) => x !== id);
        const nextActive = activeQuarryId === id ? next[0].id : activeQuarryId;
        setSelectedQuarryIds(nextSel);
        setActiveQuarryId(nextActive);
        persistUi(nextActive, nextSel);
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
  }, [quarries, activeQuarryId, selectedQuarryIds, isLoading, isSyncing, error, mutate]);

  return <QuarryContext.Provider value={store}>{children}</QuarryContext.Provider>;
}

export function useQuarry(): QuarryStore {
  const ctx = useContext(QuarryContext);
  if (!ctx) throw new Error("useQuarry must be used inside QuarryProvider");
  return ctx;
}
