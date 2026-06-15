import { splitCsvLine } from "./csv";
import type { ShiftFrontEntry, ShiftRecord } from "./types";

export interface FrontEntryMetrics extends ShiftFrontEntry {
  operatingHours: number;
  actualTph: number;
  modelTph: number;
  vsModel: number;
}

export interface ShiftMetrics {
  id: string;
  date: string;
  shift: string;
  scheduledHours: number;
  note?: string;
  fronts: FrontEntryMetrics[];
  totalTons: number;
  totalDowntime: number;
  targetTons: number;
  modelTons: number;
  attainment: number; // total ÷ target
  vsModel: number; // total ÷ model
  plantTph: number;
}

export function shiftMetrics(
  rec: ShiftRecord,
  modelByFront: Map<string, number>,
  targetTph: number
): ShiftMetrics {
  const fronts: FrontEntryMetrics[] = rec.fronts.map((f) => {
    const operatingHours = Math.max(0, rec.scheduledHours - f.downtimeHours);
    const modelTph = modelByFront.get(f.frontName) ?? 0;
    const actualTph = operatingHours > 0 ? f.tons / operatingHours : 0;
    return {
      ...f,
      operatingHours,
      actualTph,
      modelTph,
      vsModel: modelTph > 0 ? actualTph / modelTph : 0,
    };
  });
  const totalTons = fronts.reduce((s, f) => s + f.tons, 0);
  const totalDowntime = fronts.reduce((s, f) => s + f.downtimeHours, 0);
  const targetTons = targetTph * rec.scheduledHours;
  const modelTons = fronts.reduce((s, f) => s + f.modelTph * f.operatingHours, 0);
  return {
    id: rec.id,
    date: rec.date,
    shift: rec.shift,
    scheduledHours: rec.scheduledHours,
    note: rec.note,
    fronts,
    totalTons,
    totalDowntime,
    targetTons,
    modelTons,
    attainment: targetTons > 0 ? totalTons / targetTons : 0,
    vsModel: modelTons > 0 ? totalTons / modelTons : 0,
    plantTph: rec.scheduledHours > 0 ? totalTons / rec.scheduledHours : 0,
  };
}

export interface ShiftSummary {
  count: number;
  totalTons: number;
  avgAttainment: number;
  avgVsModel: number;
  avgDowntime: number;
  avgPlantTph: number;
  byShift: {
    shift: string;
    count: number;
    tons: number;
    avgPlantTph: number;
    avgAttainment: number;
    avgDowntime: number;
  }[];
  byFront: {
    frontName: string;
    tons: number;
    avgActualTph: number;
    modelTph: number;
    vsModel: number;
    downtime: number;
  }[];
  pareto: { reason: string; hours: number; pct: number; cum: number }[];
  frontNames: string[];
  trend: ShiftMetrics[];
}

export function summarize(
  records: ShiftRecord[],
  modelByFront: Map<string, number>,
  targetTph: number
): ShiftSummary {
  const metrics = records
    .map((r) => shiftMetrics(r, modelByFront, targetTph))
    .sort((a, b) => (a.date + a.shift).localeCompare(b.date + b.shift));

  const count = metrics.length;
  const totalTons = metrics.reduce((s, m) => s + m.totalTons, 0);
  const avg = (sel: (m: ShiftMetrics) => number) =>
    count > 0 ? metrics.reduce((s, m) => s + sel(m), 0) / count : 0;

  // By shift label
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
      tons: list.reduce((s, m) => s + m.totalTons, 0),
      avgPlantTph: list.reduce((s, m) => s + m.plantTph, 0) / list.length,
      avgAttainment: list.reduce((s, m) => s + m.attainment, 0) / list.length,
      avgDowntime: list.reduce((s, m) => s + m.totalDowntime, 0) / list.length,
    }))
    .sort((a, b) => a.shift.localeCompare(b.shift));

  // By front (linked to the model)
  const frontMap = new Map<string, FrontEntryMetrics[]>();
  for (const m of metrics) {
    for (const f of m.fronts) {
      const list = frontMap.get(f.frontName) ?? [];
      list.push(f);
      frontMap.set(f.frontName, list);
    }
  }
  const byFront = [...frontMap.entries()]
    .map(([frontName, list]) => ({
      frontName,
      tons: list.reduce((s, f) => s + f.tons, 0),
      avgActualTph: list.reduce((s, f) => s + f.actualTph, 0) / list.length,
      modelTph: list[0]?.modelTph ?? 0,
      vsModel: list.reduce((s, f) => s + f.vsModel, 0) / list.length,
      downtime: list.reduce((s, f) => s + f.downtimeHours, 0),
    }))
    .sort((a, b) => b.tons - a.tons);

  // Downtime Pareto (by reason, across all front entries)
  const reasonMap = new Map<string, number>();
  for (const m of metrics) {
    for (const f of m.fronts) {
      if (f.downtimeHours > 0) {
        const key = f.downtimeReason || "Unspecified";
        reasonMap.set(key, (reasonMap.get(key) ?? 0) + f.downtimeHours);
      }
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

  const frontNames = byFront.map((f) => f.frontName);

  return {
    count,
    totalTons,
    avgAttainment: avg((m) => m.attainment),
    avgVsModel: avg((m) => m.vsModel),
    avgDowntime: avg((m) => m.totalDowntime),
    avgPlantTph: avg((m) => m.plantTph),
    byShift,
    byFront,
    pareto,
    frontNames,
    trend: metrics,
  };
}

// --- CSV (long format: one row per front per shift) ------------------------

const COLUMNS = [
  "date",
  "shift",
  "scheduledHours",
  "front",
  "tons",
  "downtimeHours",
  "downtimeReason",
  "note",
] as const;

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function shiftsToCsv(records: ShiftRecord[]): string {
  const header = COLUMNS.join(",");
  const rows: string[] = [];
  for (const r of records) {
    for (const f of r.fronts) {
      rows.push(
        [
          esc(r.date),
          esc(r.shift),
          String(r.scheduledHours),
          esc(f.frontName),
          String(f.tons),
          String(f.downtimeHours),
          esc(f.downtimeReason),
          esc(r.note ?? ""),
        ].join(",")
      );
    }
  }
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
  if (idx("date") === -1 || idx("tons") === -1) {
    return { records: [], errors: ["Need at least 'date' and 'tons' columns."] };
  }

  // Group rows by date+shift into one ShiftRecord
  const map = new Map<string, ShiftRecord>();
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
    const shift = get("shift") || "A";
    const key = `${date}|${shift}`;
    if (!map.has(key)) {
      map.set(key, {
        id: `s-imp-${Date.now()}-${map.size}`,
        date,
        shift,
        scheduledHours: num("scheduledHours", 10),
        fronts: [],
        note: get("note") || undefined,
      });
    }
    map.get(key)!.fronts.push({
      id: `fe-${Date.now()}-${i}`,
      frontName: get("front") || "Front",
      tons: num("tons"),
      downtimeHours: num("downtimeHours"),
      downtimeReason: get("downtimeReason") || "Unspecified",
    });
  }
  return { records: [...map.values()], errors };
}
