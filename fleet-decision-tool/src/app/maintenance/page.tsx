"use client";

import { useMemo, useRef, useState } from "react";
import { MODELS } from "@/data/catalog";
import { usd, usdCompact } from "@/lib/engine";
import { unitMaint, quarryMaint, maintToCsv, csvToMaint } from "@/lib/maintLog";
import { downloadCsv } from "@/lib/csv";
import { downloadTemplate, downloadSheets, fileToCsv } from "@/lib/xlsx";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import { useMaint, SUBSYSTEMS } from "@/lib/maintStore";
import { usePeriod, resolveMonths } from "@/lib/periodStore";
import type { MaintType } from "@/lib/types";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { IconPlus, IconTrash } from "@/components/Icons";
import { MaintAnalysis } from "@/components/MaintAnalysis";
import { MiniTrend } from "@/components/MiniTrend";
import { useSort, SortHeader } from "@/components/Sortable";
import {
  Button,
  Card,
  NumberField,
  PageHeader,
  Segmented,
  Select,
  StatCard,
  TextInput,
} from "@/components/ui";

const TYPE_OPTIONS = [
  { value: "preventive", label: "Preventive" },
  { value: "corrective", label: "Corrective" },
  { value: "overhaul", label: "Overhaul" },
];
const TYPE_STYLE: Record<MaintType, string> = {
  preventive: "bg-olivesoft text-olive",
  corrective: "bg-dangersoft text-danger",
  overhaul: "bg-accentsoft text-accentink",
};

const TPL_HEADERS = ["unitNo", "month", "hours", "subsystem", "type", "cost", "laborHours", "downtimeHours", "note"];
const TPL_SAMPLE = [
  ["HT-01", "2026-05", 420, "Engine", "corrective", 14000, 60, 20, ""],
  ["HT-01", "2026-05", 420, "Tires", "preventive", 8000, "", "", ""],
];
const TPL_NOTES = [
  { column: "unitNo", note: "Unit number as it appears in My Fleet (e.g. HT-01)." },
  { column: "month", note: "Month, YYYY-MM (e.g. 2026-05)." },
  { column: "hours", note: "Operating hours the unit ran that month (drives $/hr)." },
  { column: "subsystem", note: "Engine, Transmission, Hydraulics, Final Drives, Tires, Undercarriage, Brakes, Electrical, Structure, Cooling, Other." },
  { column: "type", note: "preventive, corrective or overhaul." },
  { column: "downtimeHours", note: "Machine downtime caused (mainly for corrective) — drives MTBF/availability." },
];

export default function MaintenancePage() {
  const { params } = useParams();
  const { classById } = useCatalog();
  const { units } = useFleet();
  const { quarries, selectedQuarryIds, selectedQuarries } = useQuarry();
  const { records, addLine, updateLine, removeLine, updateRecordMeta, replaceRecords, reset } = useMaint();
  const { period } = usePeriod();

  const [tab, setTab] = useState<"log" | "analysis">("log");
  const [fUnit, setFUnit] = useState("all");
  const [fType, setFType] = useState("all");
  const [adding, setAdding] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);
  const unitNoById = useMemo(() => new Map(units.map((u) => [u.id, u.unitNo])), [units]);
  const unitIdByNo = useMemo(() => new Map(units.map((u) => [u.unitNo, u.id])), [units]);
  const quarryName = useMemo(() => new Map(quarries.map((q) => [q.id, q.name])), [quarries]);

  const label = (unitId: string) => {
    const u = unitsById.get(unitId);
    if (!u) return unitId;
    const m = modelById.get(u.modelId);
    return `${u.unitNo} · ${m ? `${m.brand} ${m.model}` : u.classId}`;
  };

  const windowMonths = useMemo(() => {
    const all = [...new Set(records.map((r) => r.month))];
    return new Set(resolveMonths(all, period));
  }, [records, period]);

  // Flatten records → lines, apply filters (including the global period window)
  const rows = useMemo(() => {
    const out: { recId: string; unitId: string; month: string; hours: number; lineId: string; subsystem: string; type: MaintType; cost: number; laborHours?: number }[] = [];
    for (const r of records) {
      if (!windowMonths.has(r.month)) continue;
      const u = unitsById.get(r.unitId);
      if (u && !selectedQuarryIds.includes(u.quarryId)) continue;
      if (fUnit !== "all" && r.unitId !== fUnit) continue;
      for (const l of r.lines) {
        if (fType !== "all" && l.type !== fType) continue;
        out.push({ recId: r.id, unitId: r.unitId, month: r.month, hours: r.hours, lineId: l.id, subsystem: l.subsystem, type: l.type, cost: l.cost, laborHours: l.laborHours });
      }
    }
    return out.sort((a, b) => b.month.localeCompare(a.month) || a.unitId.localeCompare(b.unitId));
  }, [records, unitsById, selectedQuarryIds, fUnit, fType, windowMonths]);

  type LogRow = (typeof rows)[number];
  const logAccessors = useMemo(
    () => ({
      month: (r: LogRow) => r.month,
      unit: (r: LogRow) => label(r.unitId),
      subsystem: (r: LogRow) => r.subsystem,
      type: (r: LogRow) => r.type,
      cost: (r: LogRow) => r.cost,
      laborHours: (r: LogRow) => r.laborHours,
      hours: (r: LogRow) => r.hours,
    }),
    // label depends on units/models which are stable for a render set
    [unitsById, modelById] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const { sorted: sortedRows, state: logState, toggle: logToggle } = useSort(rows, logAccessors, { key: "month", dir: "desc" });

  const perHourTrend = useMemo(() => {
    const months = resolveMonths([...new Set(records.map((r) => r.month))], period);
    return months.map((month) => {
      let cost = 0, hours = 0;
      const seen = new Set<string>();
      for (const r of records) {
        if (r.month !== month) continue;
        const u = unitsById.get(r.unitId);
        if (u && !selectedQuarryIds.includes(u.quarryId)) continue;
        if (fUnit !== "all" && r.unitId !== fUnit) continue;
        for (const l of r.lines) cost += l.cost;
        if (!seen.has(r.unitId)) { hours += r.hours; seen.add(r.unitId); }
      }
      return { month, value: hours > 0 ? cost / hours : 0 };
    });
  }, [records, period, unitsById, selectedQuarryIds, fUnit]);

  const totals = useMemo(() => {
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const um = unitMaint(records.filter((r) => { const u = unitsById.get(r.unitId); return !u || selectedQuarryIds.includes(u.quarryId); }));
    let totalCost = 0, totalHours = 0, sched = 0;
    for (const u of um.values()) { totalCost += u.totalCost; totalHours += u.totalHours; sched += u.byType.preventive; }
    const top = [...um.values()].flatMap((u) => u.bySubsystem).reduce((m, s) => m.set(s.subsystem, (m.get(s.subsystem) ?? 0) + s.cost), new Map<string, number>());
    const topSub = [...top.entries()].sort((a, b) => b[1] - a[1])[0];
    return { filteredCost: cost, perHour: totalHours > 0 ? totalCost / totalHours : 0, scheduledPct: totalCost > 0 ? sched / totalCost : 0, topSub: topSub?.[0] ?? "—" };
  }, [rows, records, unitsById, selectedQuarryIds]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await fileToCsv(file);
    const { records: parsed, errors } = csvToMaint(text, unitIdByNo);
    if (parsed.length) replaceRecords(parsed);
    setImportMsg(parsed.length ? `Imported ${parsed.length} unit-months.${errors.length ? ` ${errors[0]}` : ""}` : `No rows imported. ${errors[0] ?? ""}`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const exportExcel = () => {
    const um = unitMaint(records);
    const qm = quarryMaint(
      records,
      new Map(units.map((u) => [u.id, u.quarryId])),
      new Map(quarries.map((q) => [q.id, q.productionTons]))
    );
    const r2 = (n: number) => Number(n.toFixed(2));
    const r1 = (n: number) => Number(n.toFixed(1));
    const log: (string | number)[][] = [["unitNo", "month", "hours", "subsystem", "type", "cost", "laborHours", "downtimeHours"]];
    for (const r of records) for (const l of r.lines) log.push([unitNoById.get(r.unitId) ?? r.unitId, r.month, r.hours, l.subsystem, l.type, l.cost, l.laborHours ?? "", l.downtimeHours ?? ""]);
    const byUnit: (string | number)[][] = [["unitNo", "quarry", "model", "$/hr", "total $", "scheduled %", "MTBF (h)", "MTTR (h)", "availability %"]];
    for (const [id, m] of um) {
      const u = unitsById.get(id);
      const mod = u ? modelById.get(u.modelId) : undefined;
      byUnit.push([u?.unitNo ?? id, u ? quarryName.get(u.quarryId) ?? "" : "", mod ? `${mod.brand} ${mod.model}` : "", r2(m.perHour), Math.round(m.totalCost), Math.round(m.scheduledPct * 100), Number.isFinite(m.mtbf) ? Math.round(m.mtbf) : "", r1(m.mttr), r1(m.availability * 100)]);
    }
    const byQuarry: (string | number)[][] = [["quarry", "region", "annualized $", "$/ton", "availability %", "units"]];
    for (const q of quarries) {
      const m = qm.get(q.id);
      if (!m) continue;
      byQuarry.push([q.name, q.region, Math.round(m.annualizedCost), r2(m.perTon), r1(m.availability * 100), m.unitsWithData]);
    }
    downloadSheets("maintenance-report.xlsx", [
      { name: "Log", rows: log },
      { name: "By unit", rows: byUnit },
      { name: "By quarry", rows: byQuarry },
    ]);
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Capture maintenance cost per unit per month by subsystem & type — and compare equivalent equipment over time and across quarries."
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={exportExcel}>Export Excel</Button>
            <Button variant="ghost" onClick={() => window.print()}>Print / PDF</Button>
            {tab === "log" && <Button onClick={() => setAdding((a) => !a)}><IconPlus width={16} height={16} /> Add line</Button>}
          </div>
        }
      />

      <ModuleIntro
        id="maintenance"
        purpose="A maintenance cost ledger per unit-month with subsystem & type detail, plus an analysis view that benchmarks equivalent machines."
        edit="Log tab: add/import maintenance lines (subsystem, type, cost, labor, monthly hours). Analysis tab: pick a class to compare."
        output="Cost & $/hr per unit, scheduled-vs-unscheduled split, subsystem Pareto, and actual-vs-modeled benchmark across quarries."
        connects="Units, class, brand and hours come from My Fleet. Turn on Parameters → Maintenance source: Actual to feed real $/hr into Fleet / Quarry / Dashboard."
        formulas={[
          { label: "Maint $/hr", expr: "Σ cost ÷ Σ monthly hours" },
          { label: "Scheduled %", expr: "preventive cost ÷ total cost" },
          { label: "vs Benchmark", expr: "actual $/hr ÷ modeled class $/hr (age-adjusted)" },
        ]}
      />

      <div className="mb-5">
        <Segmented value={tab} onChange={(v) => setTab(v as "log" | "analysis")} options={[{ value: "log", label: "Log" }, { value: "analysis", label: "Analysis" }]} />
      </div>

      {tab === "analysis" && <MaintAnalysis units={units.filter((u) => selectedQuarryIds.includes(u.quarryId))} records={records} classById={classById} params={params} quarries={selectedQuarries} />}

      {tab === "log" && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Spend (filtered)" value={usdCompact(totals.filteredCost)} sub={`${rows.length} lines`} tone="accent" />
            <StatCard label={<>Maint $/hr <InfoTip title="Maintenance $/hr" formula="Σ cost ÷ Σ monthly hours" /></>} value={usd(totals.perHour, 2)} />
            <StatCard label={<>Scheduled % <InfoTip title="Scheduled share" formula="preventive cost ÷ total cost" align="left" /></>} value={`${(totals.scheduledPct * 100).toFixed(0)}%`} tone={totals.scheduledPct >= 0.6 ? "olive" : "gold"} />
            <StatCard label="Top subsystem" value={<span className="text-lg">{totals.topSub}</span>} tone="danger" />
          </div>

          <div className="mb-4 grid grid-cols-1 sm:max-w-sm">
            <MiniTrend label="Maintenance $/hr" data={perHourTrend} fmt={(n) => usd(n, 2)} color="#b07a8c" goodWhenUp={false} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={fUnit} onChange={setFUnit} options={[{ value: "all", label: "All units" }, ...units.filter((u) => selectedQuarryIds.includes(u.quarryId)).map((u) => ({ value: u.id, label: u.unitNo }))]} />
            <Select value={fType} onChange={setFType} options={[{ value: "all", label: "All types" }, ...TYPE_OPTIONS]} />
            <span className="mx-1 h-5 w-px bg-line" />
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={onFile} className="hidden" />
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>Import</Button>
            <Button variant="ghost" onClick={() => downloadCsv("maintenance.csv", maintToCsv(records, unitNoById))}>Export CSV</Button>
            <Button variant="ghost" onClick={() => downloadTemplate("maintenance-template.xlsx", TPL_HEADERS, TPL_SAMPLE, TPL_NOTES)}>Excel template</Button>
            {importMsg && <span className="text-xs text-inksoft">{importMsg}</span>}
          </div>

          {adding && <AddLineForm units={units} quarryName={quarryName} onClose={() => setAdding(false)} onAdd={addLine} />}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                    <SortHeader label="Month" sortKey="month" state={logState} onSort={logToggle} className="px-4 py-3" />
                    <SortHeader label="Unit" sortKey="unit" state={logState} onSort={logToggle} className="px-4 py-3" />
                    <SortHeader label="Subsystem" sortKey="subsystem" state={logState} onSort={logToggle} className="px-4 py-3" />
                    <SortHeader label="Type" sortKey="type" state={logState} onSort={logToggle} className="px-4 py-3" />
                    <SortHeader label="Cost" sortKey="cost" state={logState} onSort={logToggle} align="right" className="px-4 py-3" />
                    <SortHeader label="Labor h" sortKey="laborHours" state={logState} onSort={logToggle} align="right" className="px-4 py-3" />
                    <SortHeader label="Hrs (mo)" sortKey="hours" state={logState} onSort={logToggle} align="right" className="px-4 py-3"><InfoTip title="Monthly hours" formula="hours the unit ran that month (drives $/hr)" align="right" /></SortHeader>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r) => (
                    <tr key={r.lineId} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                      <td className="px-4 py-2 tabular text-inksoft">{r.month}</td>
                      <td className="px-4 py-2 text-ink">{label(r.unitId)}</td>
                      <td className="px-4 py-2 text-inksoft">{r.subsystem}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${TYPE_STYLE[r.type]}`}>{r.type}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" step={100} value={r.cost} onChange={(e) => updateLine(r.recId, r.lineId, { cost: Number(e.target.value) })}
                          className="w-24 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                      </td>
                      <td className="px-4 py-2 text-right tabular text-inksoft">{r.laborHours ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" step={10} value={r.hours} onChange={(e) => updateRecordMeta(r.recId, { hours: Number(e.target.value) })}
                          className="w-16 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => removeLine(r.recId, r.lineId)} className="text-inkfaint hover:text-danger" title="Remove"><IconTrash width={16} height={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-inkfaint">No maintenance lines match the filters. Add one or import a CSV.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-between text-xs text-inkfaint">
            <p>Lines roll up by unit-month. Editing monthly hours updates $/hr for that unit-month. Months use “YYYY-MM”.</p>
            <button onClick={reset} className="underline-offset-2 hover:text-ink hover:underline">Reset sample data</button>
          </div>
        </>
      )}
    </div>
  );
}

function AddLineForm({
  units,
  quarryName,
  onClose,
  onAdd,
}: {
  units: ReturnType<typeof useFleet>["units"];
  quarryName: Map<string, string>;
  onClose: () => void;
  onAdd: (unitId: string, month: string, hours: number, line: { subsystem: string; type: MaintType; cost: number; laborHours?: number }) => void;
}) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [hours, setHours] = useState(400);
  const [subsystem, setSubsystem] = useState(SUBSYSTEMS[0]);
  const [type, setType] = useState<MaintType>("preventive");
  const [cost, setCost] = useState(5000);
  const [laborHours, setLaborHours] = useState(0);

  const submit = () => {
    onAdd(unitId, month, hours, { subsystem, type, cost, laborHours: laborHours || undefined });
    onClose();
  };

  return (
    <Card className="mb-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm"><span className="text-inksoft">Unit</span>
          <Select value={unitId} onChange={setUnitId} options={units.map((u) => ({ value: u.id, label: `${u.unitNo} · ${quarryName.get(u.quarryId) ?? ""}` }))} className="w-full" /></label>
        <label className="space-y-1 text-sm"><span className="text-inksoft">Month (YYYY-MM)</span>
          <TextInput value={month} onChange={setMonth} className="w-full" /></label>
        <NumberField label="Monthly hours" step={10} value={hours} onChange={setHours} />
        <label className="space-y-1 text-sm"><span className="text-inksoft">Subsystem</span>
          <Select value={subsystem} onChange={setSubsystem} options={SUBSYSTEMS.map((s) => ({ value: s, label: s }))} className="w-full" /></label>
        <label className="space-y-1 text-sm"><span className="text-inksoft">Type</span>
          <Select value={type} onChange={(v) => setType(v as MaintType)} options={TYPE_OPTIONS} className="w-full" /></label>
        <NumberField label="Cost" suffix="USD" step={100} value={cost} onChange={setCost} />
        <NumberField label="Labor hours" value={laborHours} onChange={setLaborHours} />
        <div className="flex items-end gap-2">
          <Button onClick={submit}>Add</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
