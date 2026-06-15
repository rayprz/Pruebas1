"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usdCompact } from "@/lib/engine";
import { summarize } from "@/lib/shiftLog";
import { csvToShifts, shiftsToCsv } from "@/lib/shiftLog";
import { downloadCsv } from "@/lib/csv";
import { useShiftLog } from "@/lib/shiftStore";
import type { QuarryConfig, ShiftRecord } from "@/lib/types";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { IconPlus, IconTrash } from "@/components/Icons";
import {
  Button,
  Card,
  NumberField,
  SectionTitle,
  StatCard,
  TextInput,
} from "@/components/ui";

const tons = (n: number) => `${Math.round(n).toLocaleString()} t`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

const TEMPLATE = `date,shift,scheduledHours,downtimeHours,actualTons,downtimeReason,note
2026-06-08,A,10,1.5,16000,Waiting on trucks,
2026-06-08,B,10,2,14000,Crusher liner change,`;

export function QuarryActuals({
  modelTph,
  config,
}: {
  modelTph: number;
  config: QuarryConfig;
}) {
  const { records, addRecord, updateRecord, removeRecord, replaceRecords, reset } = useShiftLog();
  const [adding, setAdding] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const targetTph = config.targetTph;
  const s = useMemo(
    () => summarize(records, modelTph, targetTph),
    [records, modelTph, targetTph]
  );

  const bestShift = [...s.byShift].sort((a, b) => b.avgAttainment - a.avgAttainment)[0];
  const worstShift = [...s.byShift].sort((a, b) => a.avgAttainment - b.avgAttainment)[0];

  const trendData = s.trend.map((m) => ({
    name: `${m.date.slice(5)} ${m.shift}`,
    Actual: Math.round(m.actualTons),
    Model: Math.round(m.modelTons),
    Target: Math.round(m.targetTons),
  }));

  const paretoData = s.pareto.map((p) => ({
    reason: p.reason,
    Hours: Number(p.hours.toFixed(1)),
    Cumulative: Number((p.cum * 100).toFixed(0)),
  }));

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { records: parsed, errors } = csvToShifts(text);
    if (parsed.length) replaceRecords(parsed);
    setImportMsg(
      parsed.length
        ? `Imported ${parsed.length} shifts.${errors.length ? ` ${errors[0]}` : ""}`
        : `No rows imported. ${errors[0] ?? ""}`
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <ModuleIntro
        id="quarry-actuals"
        purpose="Log what each shift actually produced and compare it against this quarry's model and target — by shift and over time."
        edit="Add or import shift records: scheduled hours, downtime (with a reason), and saleable tons produced."
        output="Attainment vs target, actual vs model, the best/worst shift, the production trend, and a downtime Pareto of what stops you."
        connects="The 'Model' tab provides the expected tph (crusher throughput) and target this compares against."
        formulas={[
          { label: "Operating hours", expr: "scheduled hours − downtime hours" },
          { label: "Actual tph", expr: "actual tons ÷ operating hours" },
          { label: "Attainment", expr: "actual tons ÷ (target tph × scheduled hours)" },
          { label: "vs Model", expr: "actual tons ÷ (model tph × operating hours)" },
          { label: "Downtime Pareto", expr: "Σ downtime hours grouped by reason, ranked" },
        ]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={<>Avg attainment <InfoTip title="Attainment" formula="actual ÷ (target tph × scheduled hrs)" /></>}
          value={pct(s.avgAttainment)}
          sub={`${s.count} shifts logged`}
          tone={s.avgAttainment >= 0.9 ? "olive" : "accent"}
        />
        <StatCard
          label={<>vs Model <InfoTip title="Actual vs model" formula="actual ÷ (model tph × operating hrs)" align="left" /></>}
          value={pct(s.avgVsModel)}
          sub={`model ${Math.round(modelTph)} tph`}
        />
        <StatCard label="Total produced" value={tons(s.totalTons)} sub="period saleable" tone="ink" />
        <StatCard
          label={<>Avg downtime <InfoTip title="Downtime" formula="avg downtime hours per shift" align="left" /></>}
          value={`${s.avgDowntime.toFixed(1)} h`}
          sub="per shift"
          tone="gold"
        />
        <StatCard label="Best shift" value={bestShift?.shift ?? "—"} sub={bestShift ? pct(bestShift.avgAttainment) : ""} tone="olive" />
        <StatCard label="Top stopper" value={<span className="text-lg">{s.pareto[0]?.reason ?? "—"}</span>} sub={s.pareto[0] ? `${s.pareto[0].hours.toFixed(1)} h` : ""} tone="danger" />
      </div>

      {/* Trend: actual vs model vs target */}
      <Card className="mb-6 p-5">
        <div className="mb-2 flex items-center gap-2">
          <SectionTitle>Production trend — actual vs model vs target</SectionTitle>
          <InfoTip title="Trend" formula="bars = actual tons; lines = model & target" align="left">
            Model tons = model tph × operating hours. Target tons = target tph × scheduled hours.
          </InfoTip>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={trendData} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#6c6356", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
            <YAxis tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} tick={{ fill: "#a89e8c", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => tons(Number(v))} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
            <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
            <Bar dataKey="Actual" fill="#b06a3c" radius={[4, 4, 0, 0]} />
            <Line dataKey="Model" stroke="#6f7548" strokeWidth={2} dot={false} />
            <Line dataKey="Target" stroke="#5b7c8a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* By shift */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <SectionTitle>By shift</SectionTitle>
            <InfoTip title="By shift" formula="averages grouped by shift label" align="left" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                  <th className="px-5 py-2.5 font-semibold">Shift</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Shifts</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Avg tph</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Attain.</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Downtime</th>
                </tr>
              </thead>
              <tbody>
                {s.byShift.map((b) => (
                  <tr key={b.shift} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2 font-medium text-ink">Shift {b.shift}</td>
                    <td className="px-3 py-2 text-right tabular text-inksoft">{b.count}</td>
                    <td className="px-3 py-2 text-right tabular text-inksoft">{Math.round(b.avgTph)}</td>
                    <td className={`px-3 py-2 text-right tabular font-medium ${b.avgAttainment >= 0.9 ? "text-olive" : b.avgAttainment >= 0.75 ? "text-gold" : "text-danger"}`}>{pct(b.avgAttainment)}</td>
                    <td className="px-3 py-2 text-right tabular text-inksoft">{b.avgDowntime.toFixed(1)} h</td>
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
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={paretoData} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
              <XAxis dataKey="reason" tick={{ fill: "#6c6356", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} interval={0} angle={-12} textAnchor="end" height={54} />
              <YAxis yAxisId="h" tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="c" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
              <Bar yAxisId="h" dataKey="Hours" fill="#b1492f" radius={[4, 4, 0, 0]} />
              <Line yAxisId="c" dataKey="Cumulative" stroke="#6f7548" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Shift log */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>Shift log</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>Import CSV</Button>
          <Button variant="ghost" onClick={() => downloadCsv("shift-log.csv", shiftsToCsv(records))}>Export</Button>
          <Button variant="ghost" onClick={() => downloadCsv("shift-template.csv", TEMPLATE)}>Template</Button>
          <Button onClick={() => setAdding((a) => !a)}><IconPlus width={16} height={16} /> Add shift</Button>
        </div>
      </div>
      {importMsg && <p className="mb-2 text-xs text-inksoft">{importMsg}</p>}
      {adding && <AddShiftForm onClose={() => setAdding(false)} onAdd={addRecord} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                <th className="px-4 py-3 text-right font-semibold">Sched h</th>
                <th className="px-4 py-3 text-right font-semibold">Down h</th>
                <th className="px-4 py-3 text-right font-semibold">Tons</th>
                <th className="px-4 py-3 text-right font-semibold">tph <InfoTip title="Actual tph" formula="tons ÷ (sched − down)" align="right" /></th>
                <th className="px-4 py-3 text-right font-semibold">Attain. <InfoTip title="Attainment" formula="tons ÷ (target tph × sched)" align="right" /></th>
                <th className="px-4 py-3 font-semibold">Downtime reason</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {s.trend.map((m) => (
                <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-4 py-2 text-inksoft">{m.date}</td>
                  <td className="px-4 py-2 font-medium text-ink">{m.shift}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={m.scheduledHours} onChange={(e) => updateRecord(m.id, { scheduledHours: Number(e.target.value) })}
                      className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={0.5} value={m.downtimeHours} onChange={(e) => updateRecord(m.id, { downtimeHours: Number(e.target.value) })}
                      className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={100} value={m.actualTons} onChange={(e) => updateRecord(m.id, { actualTons: Number(e.target.value) })}
                      className="w-24 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right tabular text-inksoft">{Math.round(m.actualTph)}</td>
                  <td className={`px-4 py-2 text-right tabular font-medium ${m.attainment >= 0.9 ? "text-olive" : m.attainment >= 0.75 ? "text-gold" : "text-danger"}`}>{pct(m.attainment)}</td>
                  <td className="px-4 py-2">
                    <TextInput value={m.downtimeReason} onChange={(v) => updateRecord(m.id, { downtimeReason: v })} className="w-40 !py-0.5" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeRecord(m.id)} className="text-inkfaint hover:text-danger" title="Remove"><IconTrash width={16} height={16} /></button>
                  </td>
                </tr>
              ))}
              {s.trend.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-inkfaint">No shifts logged. Add one or import a CSV.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-inkfaint">
        <p>Edit any cell inline; the charts and KPIs recompute instantly. Model tph comes from the “Model” tab (crusher throughput).</p>
        <button onClick={reset} className="underline-offset-2 hover:text-ink hover:underline">Reset sample log</button>
      </div>
    </div>
  );
}

function AddShiftForm({ onClose, onAdd }: { onClose: () => void; onAdd: (r: ShiftRecord) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState("A");
  const [scheduledHours, setScheduledHours] = useState(10);
  const [downtimeHours, setDowntimeHours] = useState(1);
  const [actualTons, setActualTons] = useState(15000);
  const [reason, setReason] = useState("Waiting on trucks");

  const submit = () => {
    onAdd({
      id: `s-${Date.now()}`,
      date,
      shift,
      scheduledHours,
      downtimeHours,
      actualTons,
      downtimeReason: reason,
    });
    onClose();
  };

  return (
    <Card className="mb-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm"><span className="text-inksoft">Date</span>
          <TextInput value={date} onChange={setDate} className="w-full" /></label>
        <label className="space-y-1 text-sm"><span className="text-inksoft">Shift</span>
          <TextInput value={shift} onChange={setShift} className="w-full" /></label>
        <NumberField label="Scheduled h" value={scheduledHours} onChange={setScheduledHours} />
        <NumberField label="Downtime h" step={0.5} value={downtimeHours} onChange={setDowntimeHours} />
        <NumberField label="Actual tons" step={100} value={actualTons} onChange={setActualTons} />
        <label className="space-y-1 text-sm lg:col-span-2"><span className="text-inksoft">Downtime reason</span>
          <TextInput value={reason} onChange={setReason} className="w-full" /></label>
        <div className="flex items-end gap-2">
          <Button onClick={submit}>Add</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
