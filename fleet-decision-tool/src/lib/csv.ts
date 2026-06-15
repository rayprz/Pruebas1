import type { FleetUnit } from "./types";

const COLUMNS = [
  "unitNo",
  "classId",
  "modelId",
  "year",
  "currentHours",
  "annualHours",
  "availability",
  "quarryId",
  "status",
] as const;

function escapeField(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function unitsToCsv(units: FleetUnit[]): string {
  const header = COLUMNS.join(",");
  const rows = units.map((u) =>
    COLUMNS.map((c) => escapeField(String(u[c] ?? ""))).join(",")
  );
  return [header, ...rows].join("\n");
}

/** Minimal CSV line splitter that respects double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export interface ParseResult {
  units: FleetUnit[];
  errors: string[];
}

const STATUSES = new Set(["active", "standby", "down"]);

export function csvToUnits(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { units: [], errors: ["File is empty."] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const need = ["unitNo", "classId"];
  for (const col of need) {
    if (idx(col) === -1) errors.push(`Missing required column: ${col}`);
  }
  if (errors.length) return { units: [], errors };

  const units: FleetUnit[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (name: string) => {
      const j = idx(name);
      return j === -1 ? "" : (cells[j] ?? "").trim();
    };
    const num = (name: string, def = 0) => {
      const raw = get(name).replace(/[, ]/g, "");
      const n = Number(raw);
      return Number.isFinite(n) ? n : def;
    };
    const unitNo = get("unitNo");
    if (!unitNo) {
      errors.push(`Row ${i + 1}: missing unitNo, skipped.`);
      continue;
    }
    const status = get("status").toLowerCase();
    units.push({
      id: `imp-${Date.now()}-${i}`,
      unitNo,
      classId: get("classId"),
      modelId: get("modelId"),
      year: num("year", new Date().getFullYear()),
      currentHours: num("currentHours"),
      annualHours: num("annualHours", 4000),
      availability: num("availability", 0.85),
      quarryId: get("quarryId") || "q-tepeaca",
      status: (STATUSES.has(status) ? status : "active") as FleetUnit["status"],
    });
  }
  return { units, errors };
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
