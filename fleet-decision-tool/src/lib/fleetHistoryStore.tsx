"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { SEED_UNITS } from "./fleetStore";
import { HISTORY_MONTHS } from "./periodStore";
import type { FleetMonth } from "./types";
import { api } from "./config";
import { JSON_HEADERS, useSyncedList } from "./clientSync";

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

export const SEED = seedHistory();

interface FleetHistoryStore {
  months: FleetMonth[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  updateMonth: (unitId: string, month: string, patch: Partial<FleetMonth>) => void;
  replaceMonths: (months: FleetMonth[]) => void;
  reset: () => void;
}

const FleetHistoryContext = createContext<FleetHistoryStore | null>(null);

const bulk = (next: FleetMonth[]) =>
  fetch(api("/api/fleet-history"), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(next) });

export function FleetHistoryProvider({ children }: { children: ReactNode }) {
  const { items: months, isLoading, isSyncing, error, mutate } = useSyncedList<FleetMonth>("/api/fleet-history");

  const store = useMemo<FleetHistoryStore>(() => {
    return {
      months,
      isLoading,
      isSyncing,
      error,
      updateMonth: (unitId, month, patch) => {
        const existing = months.find((m) => m.unitId === unitId && m.month === month);
        const next = months.map((m) => (m.unitId === unitId && m.month === month ? { ...m, ...patch } : m));
        const merged = existing ? { ...existing, ...patch } : undefined;
        mutate(next, () =>
          merged
            ? fetch(api("/api/fleet-history"), { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(merged) })
            : Promise.resolve(new Response(null, { status: 200 }))
        );
      },
      replaceMonths: (next) => mutate(next, () => bulk(next)),
      reset: () => mutate(SEED, () => bulk(SEED)),
    };
  }, [months, isLoading, isSyncing, error, mutate]);

  return <FleetHistoryContext.Provider value={store}>{children}</FleetHistoryContext.Provider>;
}

export function useFleetHistory(): FleetHistoryStore {
  const ctx = useContext(FleetHistoryContext);
  if (!ctx) throw new Error("useFleetHistory must be used inside FleetHistoryProvider");
  return ctx;
}
