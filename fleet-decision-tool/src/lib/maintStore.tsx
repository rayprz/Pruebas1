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
import { HISTORY_MONTHS } from "./periodStore";

const KEY = "fleet-tool-maint-v2";

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

type LineSeed = [subsystem: string, type: MaintType, cost: number, labor?: number, downtime?: number];

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
    // Unplanned downtime ≈ a third of corrective labor when not given explicitly
    downtimeHours: l[4] ?? (l[1] === "corrective" && l[3] ? Math.round((l[3] as number) / 3) : undefined),
  })),
});

// Per-unit maintenance profiles. Targets a realistic $/hr so the benchmark
// story holds: old units (HT-01, MHT-01) run well above the modeled baseline;
// the new Komatsu (HT-04) below it. Data is generated for every month in the
// canonical 12-month timeline, deterministically (no Math.random) so SSR/CSR
// hydration matches.
interface MaintProfile {
  unitId: string;
  hours: number; // monthly operating hours
  perHr: number; // target maintenance $/hr
  sched: number; // preventive share of cost
  events: number; // # corrective events across the window
  corr: [subsystem: string, laborPerK: number][]; // corrective pool (labor hrs per $1k)
}

const PROFILES: MaintProfile[] = [
  { unitId: "ht01", hours: 415, perHr: 56, sched: 0.45, events: 9, corr: [["Engine", 4.4], ["Final Drives", 3.8], ["Hydraulics", 3.9], ["Brakes", 4.0]] },
  { unitId: "ht04", hours: 420, perHr: 28, sched: 0.85, events: 3, corr: [["Electrical", 4.2], ["Cooling", 3.9]] },
  { unitId: "ht06", hours: 380, perHr: 24, sched: 0.70, events: 5, corr: [["Brakes", 3.8], ["Transmission", 3.9]] },
  { unitId: "ld01", hours: 375, perHr: 42, sched: 0.65, events: 6, corr: [["Hydraulics", 3.9], ["Final Drives", 4.0]] },
  { unitId: "m-ht1", hours: 350, perHr: 47, sched: 0.50, events: 8, corr: [["Engine", 4.3], ["Undercarriage", 2.6], ["Transmission", 3.9]] },
];

const wob = (i: number, s: number) => 1 + 0.1 * Math.sin(i * 1.1 + s);

function genMaint(): MaintRecord[] {
  const n = HISTORY_MONTHS.length;
  const out: MaintRecord[] = [];
  PROFILES.forEach((p, pi) => {
    const monthlyTotal = p.perHr * p.hours;
    const prevMonthly = monthlyTotal * p.sched;
    const eventCost = p.events > 0 ? (monthlyTotal * (1 - p.sched) * n) / p.events : 0;
    const eventMonths = new Set<number>();
    for (let e = 0; e < p.events; e++) eventMonths.add(Math.round(((e + 0.5) * n) / p.events) % n);

    HISTORY_MONTHS.forEach((month, i) => {
      const esc = 1 + 0.012 * i; // gentle aging escalation across the year
      const pv = prevMonthly * esc * wob(i, pi);
      const lines: LineSeed[] = [];
      lines.push(["Engine", "preventive", Math.round(pv * 0.55), Math.max(12, Math.round((pv * 0.55) / 260))]);
      if (i % 3 === 0) lines.push(["Tires", "preventive", Math.round(pv * 0.45)]);
      else lines.push(["Hydraulics", "preventive", Math.round(pv * 0.3), Math.max(8, Math.round((pv * 0.3) / 260))]);
      if (eventMonths.has(i)) {
        const [sub, lpk] = p.corr[(i + pi) % p.corr.length];
        const cost = Math.round(eventCost * wob(i, pi + 3));
        lines.push([sub, "corrective", cost, Math.max(8, Math.round((cost / 1000) * lpk))]);
      }
      const hrs = Math.round(p.hours + 12 * Math.sin(i * 0.9 + pi));
      out.push(rec(`m-${p.unitId}-${String(i).padStart(2, "0")}`, p.unitId, month, hrs, lines));
    });
  });
  return out;
}

export const SEED: MaintRecord[] = genMaint();

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
