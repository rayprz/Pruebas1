"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { csvToShifts, shiftsToCsv, summarize } from "@/lib/shiftLog";
import { downloadCsv } from "@/lib/csv";
import { downloadTemplate, fileToCsv } from "@/lib/xlsx";
import { useShiftLog } from "@/lib/shiftStore";
import { usePeriod, resolveMonths } from "@/lib/periodStore";
import type { QuarryConfig } from "@/lib/types";
import type { QuarryResult } from "@/lib/quarry";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { useSort, SortHeader } from "@/components/Sortable";
import { IconPlus, IconTrash } from "@/components/Icons";
import {
  Button,
  Card,
  NumberField,
  SectionTitle,
  Select,
  StatCard,
  TextInput,
} from "@/components/ui";

const tons = (n: number) => `${Math.round(n).toLocaleString()} t`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const kt = (n: number) => `${(n / 1000).toFixed(1)}k`;
const FRONT_COLORS = ["#b06a3c", "#6f7548", "#5b7c8a", "#c08a44", "#b07a8c", "#8a8c5a"];

const TPL_HEADERS = ["date", "shift", "scheduledHours", "front", "tons", "downtimeHours", "downtimeReason", "note"];
const TPL_SAMPLE = [
  ["2026-06-08", "A", 10, "North Limestone", 9500, 1, "Waiting on trucks", ""],
  ["2026-06-08", "A", 10, "South Limestone", 6800, 1.2, "Blast clearance", ""],
  ["2026-06-08", "B", 10, "North Limestone", 8200, 2.5, "Crusher liner change", ""],
];
const TPL_NOTES = [
  { column: "date", note: "Shift date, YYYY-MM-DD." },
  { column: "shift", note: "Shift label, e.g. A / B / Night." },
  { column: "front", note: "Front name — should match a front of this quarry (see the Daily model tab)." },
  { column: "tons", note: "Saleable tons that front produced in the shift." },
  { column: "downtimeReason", note: "Free text; grouped in the downtime Pareto." },
];

export function QuarryActuals({
  model,
  config,
  quarryId,
}: {
  model: QuarryResult;
  config: QuarryConfig;
  quarryId: string;
}) {
  const { records: allRecords, addEntry, updateEntry, removeEntry, updateRecordMeta, replaceRecords, reset } =
    useShiftLog();
  const { period } = usePeriod();
  const [adding, setAdding] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const quarryRecords = useMemo(() => allRecords.filter((r) => r.quarryId === quarryId), [allRecords, quarryId]);
  // Respect the global period filter from the top bar (by shift month).
  const records = useMemo(() => {
    const window = new Set(resolveMonths([...new Set(quarryRecords.map((r) => r.date.slice(0, 7)))], period));
    return quarryRecords.filter((r) => window.has(r.date.slice(0, 7)));
  }, [quarryRecords, period]);
  const targetTph = config.targetTph;
  const modelByFront = useMemo(
    () => new Map(model.fronts.map((f) => [f.name, f.delivered])),
    [model]
  );
  const frontOptions = config.fronts.map((f) => f.name);

  const s = useMemo(
    () => summarize(records, modelByFront, targetTph),
    [records, modelByFront, targetTph]
  );

  const bestShift = [...s.byShift].sort((a, b) => b.avgAttainment - a.avgAttainment)[0];
  const worstShift = [...s.byShift].sort((a, b) => a.avgAttainment - b.avgAttainment)[0];

  // Trend: one bar per shift, stacked by front, with model & target lines
  const trendData = s.trend.map((m) => {
    const row: Record<string, number | string> = {
      name: `${m.date.slice(5)} ${m.shift}`,
      total: Math.round(m.totalTons),
      Model: Math.round(m.modelTons),
      Target: Math.round(m.targetTons),
    };
    for (const f of m.fronts) row[f.frontName] = Math.round(f.tons);
    return row;
  });

  const paretoData = s.pareto.map((p) => ({
    reason: p.reason,
    Hours: Number(p.hours.toFixed(1)),
    Cumulative: Number((p.cum * 100).toFixed(0)),
  }));

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await fileToCsv(file);
    const { records: parsed, errors } = csvToShifts(text, quarryId);
    if (parsed.length) replaceRecords([...allRecords.filter((r) => r.quarryId !== quarryId), ...parsed]);
    setImportMsg(
      parsed.length
        ? `Imported ${parsed.length} shifts.${errors.length ? ` ${errors[0]}` : ""}`
        : `No rows imported. ${errors[0] ?? ""}`
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const flatRows = s.trend.flatMap((m) => m.fronts.map((f) => ({ m, f })));

  type ByFront = (typeof s.byFront)[number];
  const byFrontAccessors = useMemo(
    () => ({
      frontName: (b: ByFront) => b.frontName,
      tons: (b: ByFront) => b.tons,
      avgActualTph: (b: ByFront) => b.avgActualTph,
      modelTph: (b: ByFront) => b.modelTph,
      vsModel: (b: ByFront) => b.vsModel,
      downtime: (b: ByFront) => b.downtime,
    }),
    []
  );
  const { sorted: sortedByFront, state: bfState, toggle: bfToggle } = useSort(s.byFront, byFrontAccessors);

  type FlatRow = (typeof flatRows)[number];
  const logAccessors = useMemo(
    () => ({
      date: (r: FlatRow) => r.m.date,
      shift: (r: FlatRow) => r.m.shift,
      front: (r: FlatRow) => r.f.frontName,
      scheduledHours: (r: FlatRow) => r.m.scheduledHours,
      tons: (r: FlatRow) => r.f.tons,
      downtimeHours: (r: FlatRow) => r.f.downtimeHours,
      actualTph: (r: FlatRow) => r.f.actualTph,
      vsModel: (r: FlatRow) => r.f.vsModel,
      reason: (r: FlatRow) => r.f.downtimeReason,
    }),
    []
  );
  const { sorted: sortedFlat, state: logState, toggle: logToggle } = useSort(flatRows, logAccessors);

  return (
    <div>
      <ModuleIntro
        id="quarry-actuals"
        purpose="Log what each FRONT actually produced per shift and compare it against the model and target — by shift, by front, and over time."
        edit="Add or import front-level shift entries: scheduled hours, tons, and downtime (with a reason) for each front."
        output="Attainment vs target, actual vs model per front, best/worst shift, the production trend, and a downtime Pareto by reason."
        connects="The 'Daily model' tab supplies each front's expected tph (delivered) and the plant target this compares against."
        formulas={[
          { label: "Operating hours", expr: "scheduled hours − front downtime" },
          { label: "Front actual tph", expr: "front tons ÷ front operating hours" },
          { label: "Front vs model", expr: "front actual tph ÷ model front tph" },
          { label: "Attainment", expr: "Σ front tons ÷ (target tph × scheduled hrs)" },
          { label: "vs Model", expr: "Σ front tons ÷ Σ(model front tph × front op hrs)" },
          { label: "Downtime Pareto", expr: "Σ downtime hours grouped by reason, ranked" },
        ]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={<>Avg attainment <InfoTip title="Attainment" formula="Σ tons ÷ (target tph × scheduled hrs)" /></>}
          value={pct(s.avgAttainment)}
          sub={`${s.count} shifts logged`}
          tone={s.avgAttainment >= 0.9 ? "olive" : "accent"}
        />
        <StatCard
          label={<>vs Model <InfoTip title="Actual vs model" formula="Σ tons ÷ Σ(model front tph × front op hrs)" align="left" /></>}
          value={pct(s.avgVsModel)}
          sub="actual ÷ achievable"
        />
        <StatCard label="Total produced" value={tons(s.totalTons)} sub="period saleable" />
        <StatCard
          label={<>Avg downtime <InfoTip title="Downtime" formula="avg Σ front downtime hours / shift" align="left" /></>}
          value={`${s.avgDowntime.toFixed(1)} h`}
          sub="per shift"
          tone="gold"
        />
        <StatCard label="Best shift" value={bestShift?.shift ?? "—"} sub={bestShift ? pct(bestShift.avgAttainment) : ""} tone="olive" />
        <StatCard label="Top stopper" value={<span className="text-lg">{s.pareto[0]?.reason ?? "—"}</span>} sub={s.pareto[0] ? `${s.pareto[0].hours.toFixed(1)} h` : ""} tone="danger" />
      </div>

      {/* Trend stacked by front */}
      <Card className="mb-6 p-5">
        <div className="mb-2 flex items-center gap-2">
          <SectionTitle>Production trend — by front, vs model &amp; target</SectionTitle>
          <InfoTip title="Trend" formula="stacked bars = tons by front; lines = model & target" align="left">
            The number above each bar is the shift total. Model tons = Σ(model front tph × operating hrs). Target = target tph × scheduled hrs.
          </InfoTip>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={trendData} margin={{ left: 8, right: 8, top: 22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#6c6356", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
            <YAxis tickFormatter={(v) => kt(Number(v))} tick={{ fill: "#a89e8c", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => tons(Number(v))} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
            <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
            {s.frontNames.map((fn, i) => {
              const isTop = i === s.frontNames.length - 1;
              return (
                <Bar key={fn} dataKey={fn} stackId="t" fill={FRONT_COLORS[i % FRONT_COLORS.length]} radius={isTop ? [4, 4, 0, 0] : undefined}>
                  {isTop && (
                    <LabelList dataKey="total" position="top" formatter={(v: unknown) => kt(Number(v))} style={{ fill: "#6c6356", fontSize: 11, fontWeight: 600 }} />
                  )}
                </Bar>
              );
            })}
            <Line dataKey="Model" stroke="#2a2620" strokeWidth={2} dot={false} />
            <Line dataKey="Target" stroke="#5b7c8a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* By front (linked to model) */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <SectionTitle>By front</SectionTitle>
            <InfoTip title="By front vs model" formula="avg(front actual tph ÷ model front tph)" align="left" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                  <SortHeader label="Front" sortKey="frontName" state={bfState} onSort={bfToggle} className="px-5 py-2.5" />
                  <SortHeader label="Tons" sortKey="tons" state={bfState} onSort={bfToggle} align="right" className="px-3 py-2.5" />
                  <SortHeader label="Avg tph" sortKey="avgActualTph" state={bfState} onSort={bfToggle} align="right" className="px-3 py-2.5" />
                  <SortHeader label="Model" sortKey="modelTph" state={bfState} onSort={bfToggle} align="right" className="px-3 py-2.5" />
                  <SortHeader label="vs Model" sortKey="vsModel" state={bfState} onSort={bfToggle} align="right" className="px-3 py-2.5" />
                  <SortHeader label="Down h" sortKey="downtime" state={bfState} onSort={bfToggle} align="right" className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sortedByFront.map((b) => (
                  <tr key={b.frontName} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2 font-medium text-ink">{b.frontName}</td>
                    <td className="px-3 py-2 text-right tabular text-inksoft">{tons(b.tons)}</td>
                    <td className="px-3 py-2 text-right tabular text-inksoft">{Math.round(b.avgActualTph)}</td>
                    <td className="px-3 py-2 text-right tabular text-inkfaint">{Math.round(b.modelTph)}</td>
                    <td className={`px-3 py-2 text-right tabular font-medium ${b.vsModel >= 0.9 ? "text-olive" : b.vsModel >= 0.75 ? "text-gold" : "text-danger"}`}>{pct(b.vsModel)}</td>
                    <td className="px-3 py-2 text-right tabular text-inksoft">{b.downtime.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bestShift && worstShift && bestShift.shift !== worstShift.shift && (
            <p className="border-t border-line px-5 py-2 text-xs text-inksoft">
              Shift {bestShift.shift} runs {pct(bestShift.avgAttainment - worstShift.avgAttainment)} higher attainment than Shift {worstShift.shift}.
            </p>
          )}
        </Card>

        {/* Downtime Pareto */}
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <SectionTitle>Downtime Pareto</SectionTitle>
            <InfoTip title="Downtime Pareto" formula="hours by reason, ranked; line = cumulative %" align="left" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={paretoData} margin={{ left: 4, right: 4, top: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
              <XAxis dataKey="reason" tick={{ fill: "#6c6356", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} interval={0} angle={-12} textAnchor="end" height={56} />
              <YAxis yAxisId="h" tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="c" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
              <Bar yAxisId="h" dataKey="Hours" fill="#b1492f" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Hours" position="top" formatter={(v: unknown) => Number(v).toFixed(1)} style={{ fill: "#6c6356", fontSize: 11, fontWeight: 600 }} />
              </Bar>
              <Line yAxisId="c" dataKey="Cumulative" stroke="#6f7548" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Shift log (per-front entries) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>Shift log</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={onFile} className="hidden" />
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>Import</Button>
          <Button variant="ghost" onClick={() => downloadCsv("shift-log.csv", shiftsToCsv(quarryRecords))}>Export</Button>
          <Button variant="ghost" onClick={() => downloadTemplate("shift-template.xlsx", TPL_HEADERS, TPL_SAMPLE, TPL_NOTES)}>Excel template</Button>
          <Button onClick={() => setAdding((a) => !a)}><IconPlus width={16} height={16} /> Add entry</Button>
        </div>
      </div>
      {importMsg && <p className="mb-2 text-xs text-inksoft">{importMsg}</p>}
      {adding && (
        <AddEntryForm
          frontOptions={frontOptions}
          onClose={() => setAdding(false)}
          onAdd={(date, shift, sched, entry) => addEntry(quarryId, date, shift, sched, entry)}
        />
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <SortHeader label="Date" sortKey="date" state={logState} onSort={logToggle} className="px-4 py-3" />
                <SortHeader label="Shift" sortKey="shift" state={logState} onSort={logToggle} className="px-4 py-3" />
                <SortHeader label="Front" sortKey="front" state={logState} onSort={logToggle} className="px-4 py-3" />
                <SortHeader label="Sched h" sortKey="scheduledHours" state={logState} onSort={logToggle} align="right" className="px-4 py-3" />
                <SortHeader label="Tons" sortKey="tons" state={logState} onSort={logToggle} align="right" className="px-4 py-3" />
                <SortHeader label="Down h" sortKey="downtimeHours" state={logState} onSort={logToggle} align="right" className="px-4 py-3" />
                <SortHeader label="tph" sortKey="actualTph" state={logState} onSort={logToggle} align="right" className="px-4 py-3"><InfoTip title="Front actual tph" formula="tons ÷ (sched − down)" align="right" /></SortHeader>
                <SortHeader label="vs Model" sortKey="vsModel" state={logState} onSort={logToggle} align="right" className="px-4 py-3"><InfoTip title="vs model" formula="actual tph ÷ model front tph" align="right" /></SortHeader>
                <SortHeader label="Reason" sortKey="reason" state={logState} onSort={logToggle} className="px-4 py-3" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedFlat.map(({ m, f }) => (
                <tr key={f.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-4 py-2 text-inksoft">{m.date}</td>
                  <td className="px-4 py-2 font-medium text-ink">{m.shift}</td>
                  <td className="px-4 py-2 text-inksoft">{f.frontName}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={m.scheduledHours} onChange={(e) => updateRecordMeta(m.id, { scheduledHours: Number(e.target.value) })}
                      className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={100} value={f.tons} onChange={(e) => updateEntry(m.id, f.id, { tons: Number(e.target.value) })}
                      className="w-24 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={0.5} value={f.downtimeHours} onChange={(e) => updateEntry(m.id, f.id, { downtimeHours: Number(e.target.value) })}
                      className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right tabular text-inksoft">{Math.round(f.actualTph)}</td>
                  <td className={`px-4 py-2 text-right tabular font-medium ${f.vsModel >= 0.9 ? "text-olive" : f.vsModel >= 0.75 ? "text-gold" : "text-danger"}`}>{pct(f.vsModel)}</td>
                  <td className="px-4 py-2">
                    <TextInput value={f.downtimeReason} onChange={(v) => updateEntry(m.id, f.id, { downtimeReason: v })} className="w-40 !py-0.5" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeEntry(m.id, f.id)} className="text-inkfaint hover:text-danger" title="Remove"><IconTrash width={16} height={16} /></button>
                  </td>
                </tr>
              ))}
              {flatRows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-inkfaint">No shifts logged. Add an entry or import a CSV.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-inkfaint">
        <p>Each row is one front in one shift. Edit inline; charts and KPIs recompute instantly. Model tph per front comes from the “Daily model” tab.</p>
        <button onClick={reset} className="underline-offset-2 hover:text-ink hover:underline">Reset sample log</button>
      </div>
    </div>
  );
}

function AddEntryForm({
  frontOptions,
  onClose,
  onAdd,
}: {
  frontOptions: string[];
  onClose: () => void;
  onAdd: (date: string, shift: string, scheduledHours: number, entry: { frontName: string; tons: number; downtimeHours: number; downtimeReason: string }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState("A");
  const [scheduledHours, setScheduledHours] = useState(10);
  const [frontName, setFrontName] = useState(frontOptions[0] ?? "North Limestone");
  const [tons, setTons] = useState(9000);
  const [downtimeHours, setDowntimeHours] = useState(1);
  const [reason, setReason] = useState("Waiting on trucks");

  const submit = () => {
    onAdd(date, shift, scheduledHours, { frontName, tons, downtimeHours, downtimeReason: reason });
    onClose();
  };

  return (
    <Card className="mb-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm"><span className="text-inksoft">Date</span>
          <TextInput value={date} onChange={setDate} className="w-full" /></label>
        <label className="space-y-1 text-sm"><span className="text-inksoft">Shift</span>
          <TextInput value={shift} onChange={setShift} className="w-full" /></label>
        <label className="space-y-1 text-sm"><span className="text-inksoft">Front</span>
          <Select value={frontName} onChange={setFrontName} options={frontOptions.map((f) => ({ value: f, label: f }))} className="w-full" /></label>
        <NumberField label="Scheduled h" value={scheduledHours} onChange={setScheduledHours} />
        <NumberField label="Tons" step={100} value={tons} onChange={setTons} />
        <NumberField label="Downtime h" step={0.5} value={downtimeHours} onChange={setDowntimeHours} />
        <label className="space-y-1 text-sm"><span className="text-inksoft">Downtime reason</span>
          <TextInput value={reason} onChange={setReason} className="w-full" /></label>
        <div className="flex items-end gap-2">
          <Button onClick={submit}>Add</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
