import type { Transaction } from "./types";

/** Minimal CSV line splitter that respects double-quoted fields.
 *  (Same approach as the sibling fleet-decision-tool.) */
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
  transactions: Transaction[];
  errors: string[];
}

/** Accepted column headers (case-insensitive), with a few common aliases. */
const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  vendor: "vendor",
  supplier: "vendor",
  merchant: "vendor",
  description: "description",
  memo: "description",
  detail: "description",
  amount: "amount",
  value: "amount",
  total: "amount",
  currency: "currency",
  glaccount: "glAccount",
  "gl account": "glAccount",
  gl: "glAccount",
  costcenter: "costCenter",
  "cost center": "costCenter",
  department: "costCenter",
};

/** Parse spend rows from CSV text (already converted from XLSX where needed). */
export function csvToTransactions(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { transactions: [], errors: ["File is empty."] };

  const header = splitCsvLine(lines[0]).map((h) =>
    (HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim())
  );
  const idx = (name: string) => header.indexOf(name);

  for (const col of ["vendor", "amount"] as const) {
    if (idx(col) === -1) errors.push(`Missing required column: ${col}`);
  }
  if (errors.length) return { transactions: [], errors };

  const transactions: Transaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (name: string) => {
      const j = idx(name);
      return j === -1 ? "" : (cells[j] ?? "").trim();
    };
    const vendor = get("vendor");
    const description = get("description");
    if (!vendor && !description) {
      errors.push(`Row ${i + 1}: no vendor or description, skipped.`);
      continue;
    }
    const rawAmount = get("amount").replace(/[$,\s]/g, "");
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount)) {
      errors.push(`Row ${i + 1}: invalid amount "${get("amount")}", skipped.`);
      continue;
    }
    transactions.push({
      id: `tx-${Date.now()}-${i}`,
      date: get("date"),
      vendor,
      description,
      amount,
      currency: get("currency") || undefined,
      glAccount: get("glAccount") || undefined,
      costCenter: get("costCenter") || undefined,
      classification: {
        categoryId: null,
        subcategoryId: null,
        confidence: 0,
        source: "unclassified",
      },
    });
  }
  return { transactions, errors };
}
