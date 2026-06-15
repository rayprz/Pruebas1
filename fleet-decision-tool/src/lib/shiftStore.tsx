"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShiftFrontEntry, ShiftRecord } from "./types";

const KEY = "fleet-tool-shifts-v1";

// Sample two weeks of shift logs, broken down by the two limestone fronts that
// feed the crusher, so the trend, by-front and Pareto views are populated.
const shift = (
  id: string,
  date: string,
  sh: string,
  north: [number, number, string],
  south: [number, number, string]
): ShiftRecord => ({
  id,
  date,
  shift: sh,
  scheduledHours: 10,
  fronts: [
    { id: `${id}-n`, frontName: "North Limestone", tons: north[0], downtimeHours: north[1], downtimeReason: north[2] },
    { id: `${id}-s`, frontName: "South Limestone", tons: south[0], downtimeHours: south[1], downtimeReason: south[2] },
  ],
});

const SEED: ShiftRecord[] = [
  shift("s1", "2026-06-01", "A", [9300, 1.0, "Waiting on trucks"], [6500, 1.5, "Loader breakdown"]),
  shift("s2", "2026-06-01", "B", [8200, 2.5, "Crusher liner change"], [5900, 2.0, "Waiting on trucks"]),
  shift("s3", "2026-06-02", "A", [9800, 0.8, "Blast clearance"], [6900, 1.0, "Blast clearance"]),
  shift("s4", "2026-06-02", "B", [7400, 3.0, "Truck breakdown"], [5600, 2.2, "Waiting on trucks"]),
  shift("s5", "2026-06-03", "A", [9900, 0.8, "Conveyor jam"], [7000, 0.7, "Road maintenance"]),
  shift("s6", "2026-06-03", "B", [8600, 2.0, "Waiting on trucks"], [6100, 1.8, "Truck breakdown"]),
  shift("s7", "2026-06-04", "A", [9500, 1.2, "Blast clearance"], [6700, 1.0, "Loader breakdown"]),
  shift("s8", "2026-06-04", "B", [6300, 4.0, "Power outage"], [4800, 4.0, "Power outage"]),
  shift("s9", "2026-06-05", "A", [9100, 1.5, "Crusher liner change"], [6600, 1.3, "Waiting on trucks"]),
  shift("s10", "2026-06-05", "B", [8400, 2.2, "Waiting on trucks"], [5900, 2.5, "Truck breakdown"]),
  shift("s11", "2026-06-06", "A", [10200, 0.5, "Planned maintenance"], [7200, 0.8, "Blast clearance"]),
  shift("s12", "2026-06-06", "B", [7800, 2.8, "Truck breakdown"], [5700, 2.0, "Waiting on trucks"]),
];

interface ShiftStore {
  records: ShiftRecord[];
  /** Add a front entry to the matching date+shift (creating the shift if needed). */
  addEntry: (
    date: string,
    shift: string,
    scheduledHours: number,
    entry: Omit<ShiftFrontEntry, "id">
  ) => void;
  updateEntry: (recordId: string, entryId: string, patch: Partial<ShiftFrontEntry>) => void;
  removeEntry: (recordId: string, entryId: string) => void;
  updateRecordMeta: (recordId: string, patch: Partial<Pick<ShiftRecord, "scheduledHours">>) => void;
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
      addEntry: (date, sh, scheduledHours, entry) => {
        const newEntry: ShiftFrontEntry = { ...entry, id: `fe-${Date.now()}` };
        const existing = records.find((r) => r.date === date && r.shift === sh);
        if (existing) {
          persist(
            records.map((r) =>
              r === existing ? { ...r, fronts: [...r.fronts, newEntry] } : r
            )
          );
        } else {
          persist([
            ...records,
            { id: `s-${Date.now()}`, date, shift: sh, scheduledHours, fronts: [newEntry] },
          ]);
        }
      },
      updateEntry: (recordId, entryId, patch) =>
        persist(
          records.map((r) =>
            r.id === recordId
              ? { ...r, fronts: r.fronts.map((f) => (f.id === entryId ? { ...f, ...patch } : f)) }
              : r
          )
        ),
      removeEntry: (recordId, entryId) =>
        persist(
          records
            .map((r) =>
              r.id === recordId
                ? { ...r, fronts: r.fronts.filter((f) => f.id !== entryId) }
                : r
            )
            .filter((r) => r.fronts.length > 0)
        ),
      updateRecordMeta: (recordId, patch) =>
        persist(records.map((r) => (r.id === recordId ? { ...r, ...patch } : r))),
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
