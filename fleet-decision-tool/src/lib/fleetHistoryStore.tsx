"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_UNITS } from "./fleetStore";
import { HISTORY_MONTHS } from "./periodStore";
import type { FleetMonth } from "./types";

const KEY = "fleet-tool-fleethist-v3";

/** Back-derive a monthly meter history from the current fleet: the latest month
 *  equals each unit's current hours, stepping back by annualHours / 12. */
function seedHistory(): FleetMonth[] {
  const out: FleetMonth[] = [];
  const last = HISTORY_MONTHS.length - 1;
  for (const u of SEED_UNITS) {
    const perMonth = u.annualHours / 12;
    HISTORY_MONTHS.forEach((month, i) => {
      out.push({
        unitId: u.id,
        month,
        meterHours: Math.max(0, Math.round(u.currentHours - perMonth * (last - i))),
        availability: u.availability,
        status: u.status,
      });
    });
  }
  return out;
}

const SEED = seedHistory();

interface FleetHistoryStore {
  months: FleetMonth[];
  updateMonth: (unitId: string, month: string, patch: Partial<FleetMonth>) => void;
  replaceMonths: (months: FleetMonth[]) => void;
  reset: () => void;
}

const FleetHistoryContext = createContext<FleetHistoryStore | null>(null);

export function FleetHistoryProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<FleetMonth[]>(SEED);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setMonths(JSON.parse(raw) as FleetMonth[]);
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<FleetHistoryStore>(() => {
    const persist = (next: FleetMonth[]) => {
      setMonths(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    };
    return {
      months,
      updateMonth: (unitId, month, patch) =>
        persist(months.map((m) => (m.unitId === unitId && m.month === month ? { ...m, ...patch } : m))),
      replaceMonths: (next) => persist(next),
      reset: () => persist(SEED),
    };
  }, [months]);

  return <FleetHistoryContext.Provider value={store}>{children}</FleetHistoryContext.Provider>;
}

export function useFleetHistory(): FleetHistoryStore {
  const ctx = useContext(FleetHistoryContext);
  if (!ctx) throw new Error("useFleetHistory must be used inside FleetHistoryProvider");
  return ctx;
}
