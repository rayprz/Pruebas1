"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  QuarryConfig,
  QuarryFront,
  QuarryProduct,
  QuarryTruckGroup,
} from "./types";

const KEY = "fleet-tool-quarry-v2";

const DEFAULT_CONFIG: QuarryConfig = {
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
      id: "f-north",
      name: "North Limestone",
      material: "Limestone",
      destination: "crusher",
      loaderClassId: "pl-992",
      loaderBucketTons: 18,
      loaderCycleSec: 36,
      bucketFillFactor: 0.9,
      loaderAvailability: 0.9,
      haulKm: 2.2,
      loadedSpeedKmh: 28,
      emptySpeedKmh: 38,
      spotDumpSec: 75,
      trucks: [
        { id: "t1", label: "Cat 777", classId: "ht-777", count: 2, availability: 0.85 },
        { id: "t2", label: "Komatsu HD785", classId: "ht-777", count: 1, availability: 0.8 },
      ],
    },
    {
      id: "f-south",
      name: "South Limestone",
      material: "Limestone",
      destination: "crusher",
      loaderClassId: "pl-988",
      loaderBucketTons: 12,
      loaderCycleSec: 33,
      bucketFillFactor: 0.9,
      loaderAvailability: 0.88,
      haulKm: 1.6,
      loadedSpeedKmh: 26,
      emptySpeedKmh: 36,
      spotDumpSec: 70,
      trucks: [{ id: "t3", label: "Cat 773", classId: "ht-773", count: 3, availability: 0.85 }],
    },
    {
      id: "f-clay",
      name: "Clay Pit",
      material: "Clay",
      destination: "stockpile",
      loaderClassId: "ex-390",
      loaderBucketTons: 7,
      loaderCycleSec: 30,
      bucketFillFactor: 0.85,
      loaderAvailability: 0.85,
      haulKm: 1.2,
      loadedSpeedKmh: 24,
      emptySpeedKmh: 34,
      spotDumpSec: 60,
      trucks: [
        { id: "t4", label: "Cat 773", classId: "ht-773", count: 2, availability: 0.83 },
        { id: "t5", label: "Volvo A40", classId: "at-740", count: 1, availability: 0.82 },
      ],
    },
    {
      id: "f-ob",
      name: "Overburden",
      material: "Waste",
      destination: "stockpile",
      loaderClassId: "wl-980",
      loaderBucketTons: 8,
      loaderCycleSec: 30,
      bucketFillFactor: 0.9,
      loaderAvailability: 0.88,
      haulKm: 0.9,
      loadedSpeedKmh: 22,
      emptySpeedKmh: 32,
      spotDumpSec: 55,
      trucks: [{ id: "t6", label: "Cat 740", classId: "at-740", count: 3, availability: 0.85 }],
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

interface QuarryStore {
  config: QuarryConfig;
  update: (patch: Partial<QuarryConfig>) => void;
  updateFront: (id: string, patch: Partial<QuarryFront>) => void;
  addFront: () => void;
  removeFront: (id: string) => void;
  updateTruckGroup: (frontId: string, groupId: string, patch: Partial<QuarryTruckGroup>) => void;
  addTruckGroup: (frontId: string) => void;
  removeTruckGroup: (frontId: string, groupId: string) => void;
  updateProduct: (id: string, patch: Partial<QuarryProduct>) => void;
  reset: () => void;
}

const QuarryContext = createContext<QuarryStore | null>(null);

export function QuarryProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<QuarryConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<QuarryConfig>;
        setConfig({
          ...DEFAULT_CONFIG,
          ...saved,
          fronts: saved.fronts ?? DEFAULT_CONFIG.fronts,
          products: saved.products ?? DEFAULT_CONFIG.products,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<QuarryStore>(() => {
    const persist = (next: QuarryConfig) => {
      setConfig(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    };
    const mapFront = (id: string, fn: (f: QuarryFront) => QuarryFront) =>
      persist({ ...config, fronts: config.fronts.map((f) => (f.id === id ? fn(f) : f)) });

    return {
      config,
      update: (patch) => persist({ ...config, ...patch }),
      updateFront: (id, patch) => mapFront(id, (f) => ({ ...f, ...patch })),
      addFront: () =>
        persist({
          ...config,
          fronts: [
            ...config.fronts,
            {
              id: `f-${Date.now()}`,
              name: "New front",
              material: "Limestone",
              destination: "crusher",
              loaderClassId: "wl-980",
              loaderBucketTons: 8,
              loaderCycleSec: 32,
              bucketFillFactor: 0.9,
              loaderAvailability: 0.85,
              haulKm: 1.5,
              loadedSpeedKmh: 25,
              emptySpeedKmh: 35,
              spotDumpSec: 65,
              trucks: [{ id: `t-${Date.now()}`, label: "Cat 773", classId: "ht-773", count: 2, availability: 0.85 }],
            },
          ],
        }),
      removeFront: (id) => persist({ ...config, fronts: config.fronts.filter((f) => f.id !== id) }),
      updateTruckGroup: (frontId, groupId, patch) =>
        mapFront(frontId, (f) => ({
          ...f,
          trucks: f.trucks.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
        })),
      addTruckGroup: (frontId) =>
        mapFront(frontId, (f) => ({
          ...f,
          trucks: [
            ...f.trucks,
            { id: `t-${Date.now()}`, label: "Cat 773", classId: "ht-773", count: 1, availability: 0.85 },
          ],
        })),
      removeTruckGroup: (frontId, groupId) =>
        mapFront(frontId, (f) => ({ ...f, trucks: f.trucks.filter((g) => g.id !== groupId) })),
      updateProduct: (id, patch) =>
        persist({
          ...config,
          products: config.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }),
      reset: () => persist(DEFAULT_CONFIG),
    };
  }, [config]);

  return <QuarryContext.Provider value={store}>{children}</QuarryContext.Provider>;
}

export function useQuarry(): QuarryStore {
  const ctx = useContext(QuarryContext);
  if (!ctx) throw new Error("useQuarry must be used inside QuarryProvider");
  return ctx;
}
