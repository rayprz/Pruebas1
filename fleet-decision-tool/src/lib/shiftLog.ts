import { splitCsvLine } from "./csv";
import type { ShiftRecord } from "./types";

export interface ShiftMetrics extends ShiftRecord {
  operatingHours: number;
  actualTph: number;
  targetTons: number;
  attainment: number; // actual ÷ target
  modelTons: number;
  vsModel: number; // actual ÷ model
}

export function shiftMetrics(
  rec: ShiftRecord,
  modelTph: number,
  targetTph: number
): ShiftMetrics {
  const operatingHours = Math.max(0, rec.scheduledHours - rec.downtimeHours);
  const actualTph = operatingHours > 0 ? rec.actualTons / operatingHours : 0;
  const targetTons = targetTph * rec.scheduledHours;
  const modelTons = modelTph * operatingHours;
  return {
    ...rec,
    operatingHours,
    actualTph,
    targetTons,
    attainment: targetTons > 0 ? rec.actualTons / targetTons : 0,
    modelTons,
    vsModel: modelTons > 0 ? rec.actualTons / modelTons : 0,
  };
}

export interface ShiftSummary {
  count: number;
  totalTons: number;
  avgAttainment: number;
  avgVsModel: number;
  avgDowntime: number;
  avgTph: number;
  byShift: {
    shift: string;
    count: number;
    tons: number;
    avgTph: number;
    avgAttainment: number;
    avgDowntime: number;
  }[];
  pareto: { reason: string; hours: number; pct: number; cum: number }[];
  trend: ShiftMetrics[];
}

export function summarize(
  records: ShiftRecord[],
  modelTph: number,
  targetTph: number
): ShiftSummary {
  const metrics = records
    .map((r) => shiftMetrics(r, modelTph, targetTph))
    .sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));

  const count = metrics.length;
  const totalTons = metrics.reduce((s, m) => s + m.actualTons, 0);
  const avg = (sel: (m: ShiftMetrics) => number) =>
    count > 0 ? metrics.reduce((s, m) => s + sel(m), 0) / count : 0;

  // By shift
  const shiftMap = new Map<string, ShiftMetrics[]>();
  for (const m of metrics) {
    const list = shiftMap.get(m.shift) ?? [];
    list.push(m);
    shiftMap.set(m.shift, list);
  }
  const byShift = [...shiftMap.entries()]
    .map(([shift, list]) => ({
      shift,
      count: list.length,
      tons: list.reduce((s, m) => s + m.actualTons, 0),
      avgTph: list.reduce((s, m) => s + m.actualTph, 0) / list.length,
      avgAttainment: list.reduce((s, m) => s + m.attainment, 0) / list.length,
      avgDowntime: list.reduce((s, m) => s + m.downtimeHours, 0) / list.length,
    }))
    .sort((a, b) => a.shift.localeCompare(b.shift));

  // Downtime Pareto
  const reasonMap = new Map<string, number>();
  for (const m of metrics) {
    if (m.downtimeHours > 0) {
      const key = m.downtimeReason || "Unspecified";
      reasonMap.set(key, (reasonMap.get(key) ?? 0) + m.downtimeHours);
    }
  }
  const totalDown = [...reasonMap.values()].reduce((s, h) => s + h, 0);
  let cum = 0;
  const pareto = [...reasonMap.entries()]
    .map(([reason, hours]) => ({ reason, hours }))
    .sort((a, b) => b.hours - a.hours)
    .map((x) => {
      const pct = totalDown > 0 ? x.hours / totalDown : 0;
      cum += pct;
      return { ...x, pct, cum };
    });

  return {
    count,
    totalTons,
    avgAttainment: avg((m) => m.attainment),
    avgVsModel: avg((m) => m.vsModel),
    avgDowntime: avg((m) => m.downtimeHours),
    avgTph: avg((m) => m.actualTph),
    byShift,
    pareto,
    trend: metrics,
  };
}

// --- CSV ------------------------------------------------------------------

const COLUMNS = [
  "date",
  "shift",
  "scheduledHours",
  "downtimeHours",
  "actualTons",
  "downtimeReason",
  "note",
] as const;

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function shiftsToCsv(records: ShiftRecord[]): string {
  const header = COLUMNS.join(",");
  const rows = records.map((r) =>
    COLUMNS.map((c) => esc(String(r[c] ?? ""))).join(",")
  );
  return [header, ...rows].join("\n");
}

export interface ShiftParseResult {
  records: ShiftRecord[];
  errors: string[];
}

export function csvToShifts(text: string): ShiftParseResult {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { records: [], errors: ["File is empty."] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = (n: string) => header.indexOf(n);
  if (idx("date") === -1 || idx("actualTons") === -1) {
    return { records: [], errors: ["Need at least 'date' and 'actualTons' columns."] };
  }

  const records: ShiftRecord[] = [];
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
    const date = get("date");
    if (!date) {
      errors.push(`Row ${i + 1}: missing date, skipped.`);
      continue;
    }
    records.push({
      id: `s-imp-${Date.now()}-${i}`,
      date,
      shift: get("shift") || "A",
      scheduledHours: num("scheduledHours", 10),
      downtimeHours: num("downtimeHours"),
      actualTons: num("actualTons"),
      downtimeReason: get("downtimeReason") || "Unspecified",
      note: get("note") || undefined,
    });
  }
  return { records, errors };
}
