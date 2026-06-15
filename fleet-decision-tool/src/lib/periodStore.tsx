"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const KEY = "fleet-tool-period-v2";

export type Preset = "3" | "6" | "12" | "all";

/** Canonical monthly timeline (oldest → newest): the most recent 12 months,
 *  spanning 2025–2026 so the filter can select specific months and years. */
export const HISTORY_MONTHS = [
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
];

export const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${y}`;
}

/** Period selection: a relative preset, or an explicit set of months. */
export interface PeriodState {
  mode: "preset" | "custom";
  preset: Preset;
  months: string[];
}

const DEFAULT_PERIOD: PeriodState = { mode: "preset", preset: "6", months: [] };

/** Return the trailing N months of `allMonths` (sorted) for the given preset. */
export function monthsInPeriod(allMonths: string[], preset: Preset): string[] {
  const sorted = [...allMonths].sort();
  if (preset === "all") return sorted;
  const n = Number(preset);
  return sorted.slice(Math.max(0, sorted.length - n));
}

/** Resolve a PeriodState against the months actually available in a dataset. */
export function resolveMonths(allMonths: string[], state: PeriodState): string[] {
  const sorted = [...allMonths].sort();
  if (state.mode === "custom") {
    const set = new Set(state.months);
    return sorted.filter((m) => set.has(m));
  }
  return monthsInPeriod(sorted, state.preset);
}

/** Short human label for the active window (for the top-bar button). */
export function periodLabel(state: PeriodState): string {
  if (state.mode === "preset") return PRESET_OPTIONS.find((p) => p.value === state.preset)?.label ?? "Period";
  const months = [...state.months].sort();
  if (months.length === 0) return "No months";
  if (months.length === 1) return monthLabel(months[0]);
  return `${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])} · ${months.length}`;
}

interface PeriodStore {
  period: PeriodState;
  setPreset: (preset: Preset) => void;
  setMonths: (months: string[]) => void;
  toggleMonth: (month: string) => void;
}

const PeriodContext = createContext<PeriodStore | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodState>(DEFAULT_PERIOD);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PeriodState>;
        if (saved && (saved.mode === "preset" || saved.mode === "custom")) {
          setPeriod({
            mode: saved.mode,
            preset: saved.preset ?? "6",
            months: Array.isArray(saved.months) ? saved.months : [],
          });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<PeriodStore>(() => {
    const persist = (next: PeriodState) => {
      setPeriod(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    };
    return {
      period,
      setPreset: (preset) => persist({ mode: "preset", preset, months: period.months }),
      setMonths: (months) => persist({ mode: "custom", preset: period.preset, months: [...months].sort() }),
      toggleMonth: (month) => {
        const has = period.months.includes(month);
        const months = (has ? period.months.filter((m) => m !== month) : [...period.months, month]).sort();
        persist({ mode: "custom", preset: period.preset, months });
      },
    };
  }, [period]);

  return <PeriodContext.Provider value={store}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodStore {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used inside PeriodProvider");
  return ctx;
}
