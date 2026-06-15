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
import { HISTORY_MONTHS } from "./periodStore";

const KEY = "fleet-tool-shifts-v3";

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

// Fronts logged per quarry (the crusher-feeding faces), with a base tons/shift.
const QUARRY_FRONTS: Record<string, [front: string, baseTons: number][]> = {
  "q-tepeaca": [["North Limestone", 9200], ["South Limestone", 6500]],
  "q-atotonilco": [["Main Face", 6500]],
  "q-monterrey": [["Main Pit", 3900]],
};
const REASONS = [
  "Waiting on trucks", "Crusher liner change", "Blast clearance", "Truck breakdown",
  "Loader breakdown", "Conveyor jam", "Planned maintenance", "Power outage",
];
// Representative shift-days per month (day-of-month, shift). Deterministic.
const SHIFT_DAYS: [day: string, shift: string][] = [["08", "A"], ["18", "B"], ["24", "A"]];

// Generate 12 months of shift actuals for every quarry, with a gentle upward
// attainment trend so the production trend tells a story. Deterministic.
function genShifts(): ShiftRecord[] {
  const out: ShiftRecord[] = [];
  HISTORY_MONTHS.forEach((month, mi) => {
    const trend = 0.85 + 0.012 * mi; // attainment climbs ~0.85 → ~1.0 over the year
    SHIFT_DAYS.forEach(([day, sh], di) => {
      Object.entries(QUARRY_FRONTS).forEach(([qid, fronts], qi) => {
        const entries: Entry[] = fronts.map(([front, base], fi) => {
          const noise = 1 + 0.08 * Math.sin(mi * 1.3 + di * 2 + fi + qi);
          const tons = Math.round(base * trend * noise);
          const downtime = Math.max(0.5, Math.round((1.2 + 1.3 * Math.abs(Math.sin(mi + di * 1.7 + fi + qi))) * 10) / 10);
          const reason = REASONS[(mi + di + fi + qi) % REASONS.length];
          return [front, tons, downtime, reason];
        });
        out.push(rec(`${qid}-${month}-${day}-${sh}`, qid, `${month}-${day}`, sh, entries));
      });
    });
  });
  return out;
}

const SEED: ShiftRecord[] = genShifts();

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
