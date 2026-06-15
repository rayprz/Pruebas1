"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const KEY = "fleet-tool-period-v1";

export type Period = "3" | "6" | "12" | "all";

/** Latest months covered by the seeded history (oldest → newest). */
export const HISTORY_MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

/** Return the trailing N months of `allMonths` (sorted) for the given period. */
export function monthsInPeriod(allMonths: string[], period: Period): string[] {
  const sorted = [...allMonths].sort();
  if (period === "all") return sorted;
  const n = Number(period);
  return sorted.slice(Math.max(0, sorted.length - n));
}

interface PeriodStore {
  period: Period;
  setPeriod: (p: Period) => void;
}

const PeriodContext = createContext<PeriodStore | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<Period>("6");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "3" || raw === "6" || raw === "12" || raw === "all") setPeriodState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<PeriodStore>(
    () => ({
      period,
      setPeriod: (p) => {
        setPeriodState(p);
        try {
          localStorage.setItem(KEY, p);
        } catch {
          /* ignore */
        }
      },
    }),
    [period]
  );

  return <PeriodContext.Provider value={store}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodStore {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used inside PeriodProvider");
  return ctx;
}
