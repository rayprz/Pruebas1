"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MaintLine, MaintRecord, MaintType } from "./types";

const KEY = "fleet-tool-maint-v1";

export const SUBSYSTEMS = [
  "Engine",
  "Transmission",
  "Hydraulics",
  "Final Drives",
  "Tires",
  "Undercarriage",
  "Brakes",
  "Electrical",
  "Structure",
  "Cooling",
  "Other",
];

type LineSeed = [subsystem: string, type: MaintType, cost: number, labor?: number];

const rec = (
  id: string,
  unitId: string,
  month: string,
  hours: number,
  lines: LineSeed[]
): MaintRecord => ({
  id,
  unitId,
  month,
  hours,
  lines: lines.map((l, i) => ({
    id: `${id}-${i}`,
    subsystem: l[0],
    type: l[1],
    cost: l[2],
    laborHours: l[3],
  })),
});

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04"];

const SEED: MaintRecord[] = [
  // HT-01 — old Cat 777 (Tepeaca): high, engine-heavy corrective
  rec("m-ht01-1", "ht01", MONTHS[0], 420, [["Engine", "corrective", 14200, 60], ["Tires", "preventive", 8600], ["Hydraulics", "preventive", 4200, 18]]),
  rec("m-ht01-2", "ht01", MONTHS[1], 415, [["Engine", "preventive", 5200, 20], ["Tires", "preventive", 4100], ["Final Drives", "corrective", 12800, 48]]),
  rec("m-ht01-3", "ht01", MONTHS[2], 430, [["Engine", "corrective", 16800, 72], ["Brakes", "corrective", 5400, 22], ["Tires", "preventive", 4300]]),
  rec("m-ht01-4", "ht01", MONTHS[3], 410, [["Engine", "preventive", 5600, 22], ["Hydraulics", "corrective", 9200, 36], ["Tires", "preventive", 8800]]),
  // HT-04 — new Komatsu HD785 (Tepeaca): lower, preventive-heavy
  rec("m-ht04-1", "ht04", MONTHS[0], 420, [["Engine", "preventive", 4800, 18], ["Tires", "preventive", 6800], ["Electrical", "corrective", 1900, 8]]),
  rec("m-ht04-2", "ht04", MONTHS[1], 425, [["Engine", "preventive", 4600, 18], ["Tires", "preventive", 3200], ["Hydraulics", "preventive", 2600, 10]]),
  rec("m-ht04-3", "ht04", MONTHS[2], 418, [["Engine", "preventive", 4900, 18], ["Brakes", "preventive", 2100], ["Tires", "preventive", 6600]]),
  rec("m-ht04-4", "ht04", MONTHS[3], 422, [["Engine", "preventive", 4700, 18], ["Cooling", "corrective", 3100, 12], ["Tires", "preventive", 3000]]),
  // HT-06 — Cat 773 (Tepeaca)
  rec("m-ht06-1", "ht06", MONTHS[0], 380, [["Engine", "preventive", 3600, 14], ["Brakes", "corrective", 4200, 16]]),
  rec("m-ht06-2", "ht06", MONTHS[1], 375, [["Engine", "preventive", 3400, 14], ["Tires", "preventive", 5200]]),
  rec("m-ht06-3", "ht06", MONTHS[2], 385, [["Transmission", "corrective", 7800, 30], ["Engine", "preventive", 3500, 14]]),
  rec("m-ht06-4", "ht06", MONTHS[3], 378, [["Engine", "preventive", 3600, 14], ["Hydraulics", "preventive", 2400, 10]]),
  // LD-01 — Cat 992 loader (Tepeaca): big iron
  rec("m-ld01-1", "ld01", MONTHS[0], 375, [["Hydraulics", "preventive", 9200, 30], ["Final Drives", "preventive", 6800, 24], ["Tires", "preventive", 7400]]),
  rec("m-ld01-2", "ld01", MONTHS[1], 370, [["Hydraulics", "corrective", 13400, 52], ["Engine", "preventive", 5600, 20]]),
  rec("m-ld01-3", "ld01", MONTHS[2], 380, [["Final Drives", "corrective", 11200, 44], ["Tires", "preventive", 7600], ["Engine", "preventive", 5500, 20]]),
  rec("m-ld01-4", "ld01", MONTHS[3], 372, [["Hydraulics", "preventive", 8800, 30], ["Tires", "preventive", 3800]]),
  // MHT-01 — old Cat 773 (Monterrey): high, engine + undercarriage
  rec("m-mht01-1", "m-ht1", MONTHS[0], 350, [["Engine", "corrective", 11800, 52], ["Undercarriage", "corrective", 6400, 26]]),
  rec("m-mht01-2", "m-ht1", MONTHS[1], 345, [["Engine", "preventive", 3800, 16], ["Transmission", "corrective", 9600, 40], ["Tires", "preventive", 4200]]),
  rec("m-mht01-3", "m-ht1", MONTHS[2], 355, [["Engine", "corrective", 13200, 58], ["Undercarriage", "preventive", 3600]]),
  rec("m-mht01-4", "m-ht1", MONTHS[3], 348, [["Engine", "preventive", 4000, 16], ["Brakes", "corrective", 5200, 22], ["Tires", "preventive", 4100]]),
];

interface MaintStore {
  records: MaintRecord[];
  addLine: (unitId: string, month: string, hours: number, line: Omit<MaintLine, "id">) => void;
  updateLine: (recordId: string, lineId: string, patch: Partial<MaintLine>) => void;
  removeLine: (recordId: string, lineId: string) => void;
  updateRecordMeta: (recordId: string, patch: Partial<Pick<MaintRecord, "hours" | "note">>) => void;
  replaceRecords: (records: MaintRecord[]) => void;
  reset: () => void;
}

const MaintContext = createContext<MaintStore | null>(null);

export function MaintProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<MaintRecord[]>(SEED);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRecords(JSON.parse(raw) as MaintRecord[]);
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<MaintStore>(() => {
    const persist = (next: MaintRecord[]) => {
      setRecords(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    };
    return {
      records,
      addLine: (unitId, month, hours, line) => {
        const newLine: MaintLine = { ...line, id: `ml-${Date.now()}` };
        const existing = records.find((r) => r.unitId === unitId && r.month === month);
        if (existing) {
          persist(records.map((r) => (r === existing ? { ...r, lines: [...r.lines, newLine] } : r)));
        } else {
          persist([...records, { id: `m-${Date.now()}`, unitId, month, hours, lines: [newLine] }]);
        }
      },
      updateLine: (recordId, lineId, patch) =>
        persist(records.map((r) => (r.id === recordId ? { ...r, lines: r.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) } : r))),
      removeLine: (recordId, lineId) =>
        persist(
          records
            .map((r) => (r.id === recordId ? { ...r, lines: r.lines.filter((l) => l.id !== lineId) } : r))
            .filter((r) => r.lines.length > 0)
        ),
      updateRecordMeta: (recordId, patch) =>
        persist(records.map((r) => (r.id === recordId ? { ...r, ...patch } : r))),
      replaceRecords: (next) => persist(next),
      reset: () => persist(SEED),
    };
  }, [records]);

  return <MaintContext.Provider value={store}>{children}</MaintContext.Provider>;
}

export function useMaint(): MaintStore {
  const ctx = useContext(MaintContext);
  if (!ctx) throw new Error("useMaint must be used inside MaintProvider");
  return ctx;
}
