import { splitCsvLine } from "./csv";
import type { MaintRecord, MaintType } from "./types";

export interface UnitMaint {
  unitId: string;
  totalCost: number;
  totalHours: number;
  perHour: number;
  laborHours: number;
  /** preventive cost ÷ total cost */
  scheduledPct: number;
  byType: Record<MaintType, number>;
  bySubsystem: { subsystem: string; cost: number }[];
  months: number;
  // Reliability (from corrective / unplanned events)
  failures: number;
  downtimeHours: number;
  /** Mean time between failures, operating hours */
  mtbf: number;
  /** Mean time to repair, downtime hours per failure */
  mttr: number;
  /** Reliability availability = uptime ÷ (uptime + downtime) */
  availability: number;
}

/** Per-unit maintenance rollup over the given records. */
export function unitMaint(records: MaintRecord[]): Map<string, UnitMaint> {
  const map = new Map<string, UnitMaint & { _subs: Map<string, number>; _months: Set<string> }>();
  for (const r of records) {
    let u = map.get(r.unitId);
    if (!u) {
      u = {
        unitId: r.unitId, totalCost: 0, totalHours: 0, perHour: 0, laborHours: 0,
        scheduledPct: 0, byType: { preventive: 0, corrective: 0, overhaul: 0 },
        bySubsystem: [], months: 0, failures: 0, downtimeHours: 0, mtbf: 0, mttr: 0, availability: 1,
        _subs: new Map(), _months: new Set(),
      };
      map.set(r.unitId, u);
    }
    u.totalHours += r.hours;
    u._months.add(r.month);
    for (const l of r.lines) {
      u.totalCost += l.cost;
      u.byType[l.type] += l.cost;
      u.laborHours += l.laborHours ?? 0;
      u._subs.set(l.subsystem, (u._subs.get(l.subsystem) ?? 0) + l.cost);
      if (l.type === "corrective") {
        u.failures += 1;
        u.downtimeHours += l.downtimeHours ?? 0;
      }
    }
  }
  const out = new Map<string, UnitMaint>();
  for (const [id, u] of map) {
    out.set(id, {
      unitId: u.unitId,
      totalCost: u.totalCost,
      totalHours: u.totalHours,
      perHour: u.totalHours > 0 ? u.totalCost / u.totalHours : 0,
      laborHours: u.laborHours,
      scheduledPct: u.totalCost > 0 ? u.byType.preventive / u.totalCost : 0,
      byType: u.byType,
      bySubsystem: [...u._subs.entries()].map(([subsystem, cost]) => ({ subsystem, cost })).sort((a, b) => b.cost - a.cost),
      months: u._months.size,
      failures: u.failures,
      downtimeHours: u.downtimeHours,
      mtbf: u.failures > 0 ? u.totalHours / u.failures : Infinity,
      mttr: u.failures > 0 ? u.downtimeHours / u.failures : 0,
      availability: u.totalHours + u.downtimeHours > 0 ? u.totalHours / (u.totalHours + u.downtimeHours) : 1,
    });
  }
  return out;
}

export interface QuarryMaint {
  quarryId: string;
  totalCost: number;
  months: number;
  annualizedCost: number;
  perTon: number;
  availability: number;
  unitsWithData: number;
}

/** Per-quarry maintenance rollup: annualized cost and $/ton vs production. */
export function quarryMaint(
  records: MaintRecord[],
  quarryByUnit: Map<string, string>,
  productionByQuarry: Map<string, number>
): Map<string, QuarryMaint> {
  const acc = new Map<string, { cost: number; months: Set<string>; up: number; down: number; units: Set<string> }>();
  for (const r of records) {
    const qid = quarryByUnit.get(r.unitId);
    if (!qid) continue;
    const a = acc.get(qid) ?? { cost: 0, months: new Set<string>(), up: 0, down: 0, units: new Set<string>() };
    a.months.add(r.month);
    a.units.add(r.unitId);
    a.up += r.hours;
    for (const l of r.lines) {
      a.cost += l.cost;
      if (l.type === "corrective") a.down += l.downtimeHours ?? 0;
    }
    acc.set(qid, a);
  }
  const out = new Map<string, QuarryMaint>();
  for (const [qid, a] of acc) {
    const months = a.months.size || 1;
    const annualized = a.cost * (12 / months);
    const production = productionByQuarry.get(qid) ?? 0;
    out.set(qid, {
      quarryId: qid,
      totalCost: a.cost,
      months: a.months.size,
      annualizedCost: annualized,
      perTon: production > 0 ? annualized / production : 0,
      availability: a.up + a.down > 0 ? a.up / (a.up + a.down) : 1,
      unitsWithData: a.units.size,
    });
  }
  return out;
}

/** Σ cost ÷ Σ hours per unit — the override feed for "use actuals". */
export function actualMaintPerHrByUnit(records: MaintRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const [id, u] of unitMaint(records)) m.set(id, u.perHour);
  return m;
}

export interface MonthPoint {
  month: string;
  cost: number;
  hours: number;
  perHour: number;
}

/** Monthly time series for a set of units (or all if unitIds omitted). */
export function monthlyTrend(records: MaintRecord[], unitIds?: Set<string>): MonthPoint[] {
  const map = new Map<string, { cost: number; hours: number }>();
  for (const r of records) {
    if (unitIds && !unitIds.has(r.unitId)) continue;
    const m = map.get(r.month) ?? { cost: 0, hours: 0 };
    m.hours += r.hours;
    for (const l of r.lines) m.cost += l.cost;
    map.set(r.month, m);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, cost: v.cost, hours: v.hours, perHour: v.hours > 0 ? v.cost / v.hours : 0 }));
}

export interface SubsystemRow {
  subsystem: string;
  preventive: number;
  corrective: number;
  overhaul: number;
  total: number;
}

export function bySubsystem(records: MaintRecord[], unitIds?: Set<string>): SubsystemRow[] {
  const map = new Map<string, SubsystemRow>();
  for (const r of records) {
    if (unitIds && !unitIds.has(r.unitId)) continue;
    for (const l of r.lines) {
      const row = map.get(l.subsystem) ?? { subsystem: l.subsystem, preventive: 0, corrective: 0, overhaul: 0, total: 0 };
      row[l.type] += l.cost;
      row.total += l.cost;
      map.set(l.subsystem, row);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// --- CSV (long format: one row per maintenance line) -----------------------

const COLUMNS = ["unitNo", "month", "hours", "subsystem", "type", "cost", "laborHours", "downtimeHours", "note"] as const;
const TYPES = new Set<MaintType>(["preventive", "corrective", "overhaul"]);

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function maintToCsv(records: MaintRecord[], unitNoById: Map<string, string>): string {
  const rows: string[] = [COLUMNS.join(",")];
  for (const r of records) {
    for (const l of r.lines) {
      rows.push(
        [
          esc(unitNoById.get(r.unitId) ?? r.unitId),
          esc(r.month),
          String(r.hours),
          esc(l.subsystem),
          esc(l.type),
          String(l.cost),
          String(l.laborHours ?? ""),
          String(l.downtimeHours ?? ""),
          esc(r.note ?? ""),
        ].join(",")
      );
    }
  }
  return rows.join("\n");
}

export interface MaintParseResult {
  records: MaintRecord[];
  errors: string[];
}

export function csvToMaint(text: string, unitIdByNo: Map<string, string>): MaintParseResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { records: [], errors: ["File is empty."] };
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = (n: string) => header.indexOf(n);
  if (idx("unitNo") === -1 || idx("month") === -1 || idx("cost") === -1) {
    return { records: [], errors: ["Need at least 'unitNo', 'month' and 'cost' columns."] };
  }
  const map = new Map<string, MaintRecord>();
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (n: string) => {
      const j = idx(n);
      return j === -1 ? "" : (cells[j] ?? "").trim();
    };
    const num = (n: string, def = 0) => {
      const v = Number(get(n).replace(/[, ]/g, ""));
      return Number.isFinite(v) ? v : def;
    };
    const unitNo = get("unitNo");
    const unitId = unitIdByNo.get(unitNo);
    const month = get("month");
    if (!unitId) {
      errors.push(`Row ${i + 1}: unknown unit "${unitNo}", skipped.`);
      continue;
    }
    if (!month) {
      errors.push(`Row ${i + 1}: missing month, skipped.`);
      continue;
    }
    const key = `${unitId}|${month}`;
    if (!map.has(key)) {
      map.set(key, { id: `m-imp-${Date.now()}-${map.size}`, unitId, month, hours: num("hours"), lines: [], note: get("note") || undefined });
    }
    const t = get("type").toLowerCase() as MaintType;
    map.get(key)!.lines.push({
      id: `ml-${Date.now()}-${i}`,
      subsystem: get("subsystem") || "Other",
      type: TYPES.has(t) ? t : "corrective",
      cost: num("cost"),
      laborHours: get("laborHours") ? num("laborHours") : undefined,
      downtimeHours: get("downtimeHours") ? num("downtimeHours") : undefined,
    });
  }
  return { records: [...map.values()], errors };
}
