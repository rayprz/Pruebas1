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

const KEY = "fleet-tool-shifts-v2";

type Entry = [front: string, tons: number, downtime: number, reason: string];

const rec = (
  id: string,
  quarryId: string,
  date: string,
  sh: string,
  entries: Entry[]
): ShiftRecord => ({
  id,
  quarryId,
  date,
  shift: sh,
  scheduledHours: 10,
  fronts: entries.map((e, i) => ({
    id: `${id}-${i}`,
    frontName: e[0],
    tons: e[1],
    downtimeHours: e[2],
    downtimeReason: e[3],
  })),
});

const SEED: ShiftRecord[] = [
  // ===== Tepeaca (North + South Limestone) =====
  rec("t1", "q-tepeaca", "2026-06-01", "A", [["North Limestone", 9300, 1.0, "Waiting on trucks"], ["South Limestone", 6500, 1.5, "Loader breakdown"]]),
  rec("t2", "q-tepeaca", "2026-06-01", "B", [["North Limestone", 8200, 2.5, "Crusher liner change"], ["South Limestone", 5900, 2.0, "Waiting on trucks"]]),
  rec("t3", "q-tepeaca", "2026-06-02", "A", [["North Limestone", 9800, 0.8, "Blast clearance"], ["South Limestone", 6900, 1.0, "Blast clearance"]]),
  rec("t4", "q-tepeaca", "2026-06-02", "B", [["North Limestone", 7400, 3.0, "Truck breakdown"], ["South Limestone", 5600, 2.2, "Waiting on trucks"]]),
  rec("t5", "q-tepeaca", "2026-06-03", "A", [["North Limestone", 9900, 0.8, "Conveyor jam"], ["South Limestone", 7000, 0.7, "Road maintenance"]]),
  rec("t6", "q-tepeaca", "2026-06-03", "B", [["North Limestone", 8600, 2.0, "Waiting on trucks"], ["South Limestone", 6100, 1.8, "Truck breakdown"]]),
  rec("t7", "q-tepeaca", "2026-06-04", "A", [["North Limestone", 9500, 1.2, "Blast clearance"], ["South Limestone", 6700, 1.0, "Loader breakdown"]]),
  rec("t8", "q-tepeaca", "2026-06-04", "B", [["North Limestone", 6300, 4.0, "Power outage"], ["South Limestone", 4800, 4.0, "Power outage"]]),
  rec("t9", "q-tepeaca", "2026-06-05", "A", [["North Limestone", 9100, 1.5, "Crusher liner change"], ["South Limestone", 6600, 1.3, "Waiting on trucks"]]),
  rec("t10", "q-tepeaca", "2026-06-05", "B", [["North Limestone", 8400, 2.2, "Waiting on trucks"], ["South Limestone", 5900, 2.5, "Truck breakdown"]]),
  rec("t11", "q-tepeaca", "2026-06-06", "A", [["North Limestone", 10200, 0.5, "Planned maintenance"], ["South Limestone", 7200, 0.8, "Blast clearance"]]),
  rec("t12", "q-tepeaca", "2026-06-06", "B", [["North Limestone", 7800, 2.8, "Truck breakdown"], ["South Limestone", 5700, 2.0, "Waiting on trucks"]]),
  // ===== Atotonilco (Main Face) =====
  rec("a1", "q-atotonilco", "2026-06-01", "A", [["Main Face", 6800, 1.0, "Waiting on trucks"]]),
  rec("a2", "q-atotonilco", "2026-06-01", "B", [["Main Face", 5900, 2.2, "Crusher liner change"]]),
  rec("a3", "q-atotonilco", "2026-06-02", "A", [["Main Face", 7000, 0.8, "Blast clearance"]]),
  rec("a4", "q-atotonilco", "2026-06-02", "B", [["Main Face", 5200, 3.0, "Truck breakdown"]]),
  rec("a5", "q-atotonilco", "2026-06-03", "A", [["Main Face", 6600, 1.2, "Waiting on trucks"]]),
  rec("a6", "q-atotonilco", "2026-06-03", "B", [["Main Face", 6100, 1.8, "Conveyor jam"]]),
  // ===== Monterrey (Main Pit) — under-trucked, more downtime =====
  rec("o1", "q-monterrey", "2026-06-01", "A", [["Main Pit", 4100, 1.5, "Waiting on trucks"]]),
  rec("o2", "q-monterrey", "2026-06-01", "B", [["Main Pit", 3300, 3.0, "Truck breakdown"]]),
  rec("o3", "q-monterrey", "2026-06-02", "A", [["Main Pit", 4300, 1.2, "Waiting on trucks"]]),
  rec("o4", "q-monterrey", "2026-06-02", "B", [["Main Pit", 2900, 4.0, "Power outage"]]),
  rec("o5", "q-monterrey", "2026-06-03", "A", [["Main Pit", 4000, 1.8, "Waiting on trucks"]]),
  rec("o6", "q-monterrey", "2026-06-03", "B", [["Main Pit", 3600, 2.5, "Crusher liner change"]]),
];

interface ShiftStore {
  records: ShiftRecord[];
  addEntry: (
    quarryId: string,
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
      addEntry: (quarryId, date, sh, scheduledHours, entry) => {
        const newEntry: ShiftFrontEntry = { ...entry, id: `fe-${Date.now()}` };
        const existing = records.find((r) => r.quarryId === quarryId && r.date === date && r.shift === sh);
        if (existing) {
          persist(records.map((r) => (r === existing ? { ...r, fronts: [...r.fronts, newEntry] } : r)));
        } else {
          persist([...records, { id: `s-${Date.now()}`, quarryId, date, shift: sh, scheduledHours, fronts: [newEntry] }]);
        }
      },
      updateEntry: (recordId, entryId, patch) =>
        persist(records.map((r) => (r.id === recordId ? { ...r, fronts: r.fronts.map((f) => (f.id === entryId ? { ...f, ...patch } : f)) } : r))),
      removeEntry: (recordId, entryId) =>
        persist(
          records
            .map((r) => (r.id === recordId ? { ...r, fronts: r.fronts.filter((f) => f.id !== entryId) } : r))
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
