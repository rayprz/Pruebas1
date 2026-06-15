"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QuarryConfig, QuarryProduct } from "./types";

const KEY = "fleet-tool-quarry-v1";

const DEFAULT_CONFIG: QuarryConfig = {
  shiftsPerDay: 2,
  hoursPerShift: 10,
  daysPerYear: 300,
  operatingEfficiency: 0.8,

  loaderClassId: "wl-980",
  nLoaders: 1,
  loaderCycleSec: 35,
  passesPerTruck: 5,
  bucketFillFactor: 0.9,

  truckClassId: "ht-770",
  nTrucks: 3,
  haulKm: 1.5,
  loadedSpeedKmh: 25,
  emptySpeedKmh: 35,
  spotDumpSec: 60,
  truckAvailability: 0.85,

  crusherRatedTph: 800,
  crusherAvailability: 0.85,
  kwhPerTon: 1.8,
  energyPriceUsdKwh: 0.12,
  linerCostPerTon: 0.15,
  plantOtherPerTon: 0.4,

  drillBlastCostPerTon: 0.9,

  targetTonsYear: 2_000_000,

  outOfSpecPct: 0.03,

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
        setConfig({ ...DEFAULT_CONFIG, ...saved, products: saved.products ?? DEFAULT_CONFIG.products });
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
    return {
      config,
      update: (patch) => persist({ ...config, ...patch }),
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
