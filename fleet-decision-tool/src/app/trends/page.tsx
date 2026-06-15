"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { kpiHistory, KPI_DEFS, aggKpi, type QuarryKpi } from "@/lib/history";
import { downloadSheets } from "@/lib/xlsx";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import { useShiftLog } from "@/lib/shiftStore";
import { useMaint } from "@/lib/maintStore";
import { useFleetHistory } from "@/lib/fleetHistoryStore";
import { usePeriod, resolveMonths } from "@/lib/periodStore";
import { ModuleIntro } from "@/components/ModuleIntro";
import { Button, Card, PageHeader, SectionTitle, Segmented, Select, StatCard } from "@/components/ui";

const PALETTE = ["#b06a3c", "#6f7548", "#5b7c8a", "#c08a44", "#b07a8c", "#8a8c5a"];

export default function TrendsPage() {
  const { params } = useParams();
  const { classById } = useCatalog();
  const { units } = useFleet();
  const { selectedQuarries: quarries } = useQuarry();
  const { records: shiftRecords } = useShiftLog();
  const { records: maintRecords } = useMaint();
  const { months: fleetMonths } = useFleetHistory();
  const { period } = usePeriod();

  const [kpiKey, setKpiKey] = useState("operating");
  const [group, setGroup] = useState<"aggregate" | "region" | "quarry">("aggregate");

  const def = KPI_DEFS.find((d) => d.key === kpiKey) ?? KPI_DEFS[0];

  const months = useMemo(() => {
    const all = [...new Set(fleetMonths.map((m) => m.month))];
    return resolveMonths(all, period);
  }, [fleetMonths, period]);

  const hist = useMemo(
    () => kpiHistory(months, quarries, units, fleetMonths, shiftRecords, maintRecords, classById, params),
    [months, quarries, units, fleetMonths, shiftRecords, maintRecords, classById, params]
  );

  const regions = useMemo(() => [...new Set(quarries.map((q) => q.region))], [quarries]);

  // Build named series (per grouping)
  const series = useMemo(() => {
    const out: { name: string; values: number[] }[] = [];
    if (group === "aggregate") {
      out.push({ name: "Total", values: hist.map((h) => aggKpi(def, [...h.byQuarry.values()])) });
    } else if (group === "region") {
      for (const rg of regions) {
        const qids = quarries.filter((q) => q.region === rg).map((q) => q.id);
        out.push({ name: rg, values: hist.map((h) => aggKpi(def, qids.map((id) => h.byQuarry.get(id)).filter((k): k is QuarryKpi => !!k))) });
      }
    } else {
      for (const q of quarries) {
        out.push({ name: q.name, values: hist.map((h) => { const k = h.byQuarry.get(q.id); return k ? def.sel(k) : 0; }) });
      }
    }
    return out;
  }, [group, hist, def, regions, quarries]);

  const chartData = useMemo(
    () => months.map((m, i) => {
      const row: Record<string, number | string> = { month: m };
      for (const s of series) row[s.name] = Number(s.values[i].toFixed(2));
      return row;
    }),
    [months, series]
  );

  const exportExcel = () => {
    const header = ["month", ...series.map((s) => s.name)];
    const rows: (string | number)[][] = [header];
    months.forEach((m, i) => rows.push([m, ...series.map((s) => Number(s.values[i].toFixed(2)))]));
    downloadSheets(`trend-${def.key}.xlsx`, [{ name: def.label.slice(0, 28), rows }]);
  };

  return (
    <div>
      <PageHeader
        title="Trends & History"
        subtitle="Every KPI over time — recomputed each month from the fleet's meter history, shift log and maintenance. Period is set in the top bar."
        actions={<Button variant="ghost" onClick={exportExcel}>Export Excel</Button>}
      />

      <ModuleIntro
        id="trends"
        purpose="The historical view: any KPI charted month by month, for the whole operation, by region, or by quarry."
        edit="Pick a KPI and a grouping here; set the time window (Last 3/6/12 months) in the top bar."
        output="Time series + period-over-period deltas, so you see whether costs, throughput, attainment and reliability are improving or slipping."
        connects="Reuses the same engine as every module — fleet meter history drives the financial/model KPIs; shift & maintenance logs drive the operational ones."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select value={kpiKey} onChange={setKpiKey} options={KPI_DEFS.map((d) => ({ value: d.key, label: d.label }))} />
        <Segmented value={group} onChange={(v) => setGroup(v as typeof group)} options={[{ value: "aggregate", label: "Aggregate" }, { value: "region", label: "By region" }, { value: "quarry", label: "By quarry" }]} />
        <span className="text-xs text-inkfaint">{months[0]} → {months[months.length - 1]}</span>
      </div>

      {/* Delta cards per series */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {series.map((s) => {
          const first = s.values[0] ?? 0;
          const last = s.values[s.values.length - 1] ?? 0;
          const delta = first !== 0 ? (last - first) / Math.abs(first) : 0;
          return (
            <StatCard
              key={s.name}
              label={s.name}
              value={def.fmt(last)}
              sub={`${delta > 0 ? "+" : ""}${(delta * 100).toFixed(0)}% over period`}
              tone={Math.abs(delta) < 0.005 ? "ink" : delta > 0 ? "gold" : "olive"}
            />
          );
        })}
      </div>

      <Card className="p-5">
        <SectionTitle className="mb-2 text-base">{def.label} — by month</SectionTitle>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 8, left: 8, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#6c6356", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
            <YAxis tickFormatter={(v) => def.fmt(Number(v))} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
            <Tooltip formatter={(v) => def.fmt(Number(v))} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
            <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
            {series.map((s, i) => (
              <Line key={s.name} dataKey={s.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <p className="mt-4 text-xs text-inkfaint">
        Financial &amp; model KPIs (OPEX, CAPEX, cost/ton, OEE…) are recomputed
        each month from each unit&apos;s meter history; production and maintenance
        KPIs come from the shift and maintenance logs. Quarry config and global
        parameters are held at their current values across the window.
      </p>
    </div>
  );
}
