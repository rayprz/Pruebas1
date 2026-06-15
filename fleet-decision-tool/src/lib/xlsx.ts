import * as XLSX from "xlsx";

type Cell = string | number;

export interface Instruction {
  column: string;
  note: string;
}

/** Download an .xlsx template: a Template sheet (header + sample rows) plus an
 *  optional Instructions sheet describing each column. */
export function downloadTemplate(
  filename: string,
  headers: string[],
  sample: Cell[][],
  instructions?: Instruction[]
) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...sample]), "Template");
  if (instructions?.length) {
    const aoa: Cell[][] = [["Column", "Description / valid values"], ...instructions.map((i) => [i.column, i.note])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Instructions");
  }
  XLSX.writeFile(wb, filename);
}

/** Download a multi-sheet .xlsx report. Each sheet's rows include its header. */
export function downloadSheets(filename: string, sheets: { name: string; rows: Cell[][] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

/** Read an uploaded .xlsx/.xls/.csv file into CSV text, so existing CSV parsers
 *  work for either format. Uses the first sheet for spreadsheets. */
export async function fileToCsv(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return ws ? XLSX.utils.sheet_to_csv(ws) : "";
  }
  return file.text();
}
