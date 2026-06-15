"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShiftRecord } from "./types";

const KEY = "fleet-tool-shifts-v1";

// Sample two weeks of shift logs (shifts A/B) so the trend view is populated.
const SEED: ShiftRecord[] = [
  { id: "s1", date: "2026-06-01", shift: "A", scheduledHours: 10, downtimeHours: 1.5, actualTons: 16200, downtimeReason: "Waiting on trucks" },
  { id: "s2", date: "2026-06-01", shift: "B", scheduledHours: 10, downtimeHours: 2.5, actualTons: 14100, downtimeReason: "Crusher liner change" },
  { id: "s3", date: "2026-06-02", shift: "A", scheduledHours: 10, downtimeHours: 1.0, actualTons: 17300, downtimeReason: "Blast clearance" },
  { id: "s4", date: "2026-06-02", shift: "B", scheduledHours: 10, downtimeHours: 3.0, actualTons: 12800, downtimeReason: "Truck breakdown" },
  { id: "s5", date: "2026-06-03", shift: "A", scheduledHours: 10, downtimeHours: 0.8, actualTons: 17800, downtimeReason: "Conveyor jam" },
  { id: "s6", date: "2026-06-03", shift: "B", scheduledHours: 10, downtimeHours: 2.0, actualTons: 14600, downtimeReason: "Waiting on trucks" },
  { id: "s7", date: "2026-06-04", shift: "A", scheduledHours: 10, downtimeHours: 1.2, actualTons: 16900, downtimeReason: "Blast clearance" },
  { id: "s8", date: "2026-06-04", shift: "B", scheduledHours: 10, downtimeHours: 4.0, actualTons: 10500, downtimeReason: "Power outage" },
  { id: "s9", date: "2026-06-05", shift: "A", scheduledHours: 10, downtimeHours: 1.5, actualTons: 16000, downtimeReason: "Crusher liner change" },
  { id: "s10", date: "2026-06-05", shift: "B", scheduledHours: 10, downtimeHours: 2.2, actualTons: 14300, downtimeReason: "Waiting on trucks" },
  { id: "s11", date: "2026-06-06", shift: "A", scheduledHours: 10, downtimeHours: 0.5, actualTons: 18200, downtimeReason: "Planned maintenance" },
  { id: "s12", date: "2026-06-06", shift: "B", scheduledHours: 10, downtimeHours: 2.8, actualTons: 13400, downtimeReason: "Truck breakdown" },
];

interface ShiftStore {
  records: ShiftRecord[];
  addRecord: (r: ShiftRecord) => void;
  updateRecord: (id: string, patch: Partial<ShiftRecord>) => void;
  removeRecord: (id: string) => void;
  replaceRecords: (records: ShiftRecord[]) => void;
  reset: () => void;
}

const ShiftContext = createContext<ShiftStore | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<ShiftRecord[]>(SEED);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRecords(JSON.parse(raw) as ShiftRecord[]);
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<ShiftStore>(() => {
    const persist = (next: ShiftRecord[]) => {
      setRecords(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    };
    return {
      records,
      addRecord: (r) => persist([...records, r]),
      updateRecord: (id, patch) =>
        persist(records.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      removeRecord: (id) => persist(records.filter((r) => r.id !== id)),
      replaceRecords: (next) => persist(next),
      reset: () => persist(SEED),
    };
  }, [records]);

  return <ShiftContext.Provider value={store}>{children}</ShiftContext.Provider>;
}

export function useShiftLog(): ShiftStore {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShiftLog must be used inside ShiftProvider");
  return ctx;
}
