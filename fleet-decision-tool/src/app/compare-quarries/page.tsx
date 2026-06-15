"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usd, usdCompact } from "@/lib/engine";
import { quarryMetrics, type QuarryMetrics } from "@/lib/rollup";
import { actualMaintPerHrByUnit, actualAvailabilityByUnit } from "@/lib/maintLog";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import { useShiftLog } from "@/lib/shiftStore";
import { useMaint } from "@/lib/maintStore";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { Card, PageHeader, SectionTitle, Select } from "@/components/ui";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

type SortKey = "region" | "systemTph" | "attainment" | "costPerTon" | "lossesUsd" | "excess";

export default function CompareQuarriesPage() {
  const { params } = useParams();
  const { classById } = useCatalog();
  const { units } = useFleet();
  const { quarries } = useQuarry();
  const { records } = useShiftLog();
  const { records: maintRecords } = useMaint();
  const [sortBy, setSortBy] = useState<SortKey>("region");

  const maintByUnit = useMemo(
    () => (params.useActualMaint ? actualMaintPerHrByUnit(maintRecords) : undefined),
    [params.useActualMaint, maintRecords]
  );
  const availByUnit = useMemo(
    () => (params.useActualAvailability ? actualAvailabilityByUnit(maintRecords) : undefined),
    [params.useActualAvailability, maintRecords]
  );

  const metrics = useMemo(
    () => quarries.map((q) => quarryMetrics(q, units, records, classById, params, maintByUnit, availByUnit)),
    [quarries, units, records, classById, params, maintByUnit, availByUnit]
  );

  const sorted = useMemo(() => {
    const arr = [...metrics];
    const cmp: Record<SortKey, (a: QuarryMetrics, b: QuarryMetrics) => number> = {
      region: (a, b) => a.quarry.region.localeCompare(b.quarry.region) || a.quarry.name.localeCompare(b.quarry.name),
      systemTph: (a, b) => b.systemTph - a.systemTph,
      attainment: (a, b) => b.attainment - a.attainment,
      costPerTon: (a, b) => a.costPerTon - b.costPerTon,
      lossesUsd: (a, b) => b.lossesUsd - a.lossesUsd,
      excess: (a, b) => b.excess - a.excess,
    };
    return arr.sort(cmp[sortBy]);
  }, [metrics, sortBy]);

  const chart = (sel: (m: QuarryMetrics) => number, round = 0) =>
    metrics.map((m) => ({ name: m.quarry.name, value: Number(sel(m).toFixed(round)) }));

  return (
    <div>
      <PageHeader
        title="Compare Quarries"
        subtitle="Every quarry side-by-side for the VP of Aggregates — throughput, cost, OEE and the money on the table."
        actions={
          <Select
            value={sortBy}
            onChange={(v) => setSortBy(v as SortKey)}
            options={[
              { value: "region", label: "Sort: Region" },
              { value: "systemTph", label: "Sort: Throughput" },
              { value: "attainment", label: "Sort: Attainment" },
              { value: "costPerTon", label: "Sort: Cost/ton" },
              { value: "lossesUsd", label: "Sort: Losses" },
              { value: "excess", label: "Sort: Excess OPEX" },
            ]}
          />
        }
      />

      <ModuleIntro
        id="compare-quarries"
        purpose="A portfolio view of every quarry in the operation, grouped by region, so the VP can see who leads and who lags."
        edit="Nothing here — it rolls up each quarry's model, fleet and shift log. Edit a quarry from Quarry Performance (pick it in the top bar)."
        output="Throughput & attainment, cost & energy per ton, OEE & availability, and lost-efficiency $ + excess OPEX, all side-by-side."
        connects="Same engines as the per-quarry modules; the Executive Dashboard aggregates these same numbers."
      />

      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-3 font-semibold">Quarry</th>
                <th className="px-3 py-3 font-semibold">Region</th>
                <th className="px-3 py-3 text-right font-semibold">tph <InfoTip title="System throughput" formula="min(Σ crusher fronts, crusher cap) + Σ stockpile fronts" align="right" /></th>
                <th className="px-3 py-3 text-right font-semibold">Plan</th>
                <th className="px-3 py-3 text-right font-semibold">Actual <InfoTip title="Actual attainment" formula="Σ tons ÷ (target tph × scheduled hrs), avg of shifts" align="right" /></th>
                <th className="px-3 py-3 text-right font-semibold">$/ton</th>
                <th className="px-3 py-3 text-right font-semibold">gal/t</th>
                <th className="px-3 py-3 text-right font-semibold">kWh/t</th>
                <th className="px-3 py-3 text-right font-semibold">OEE <InfoTip title="Crusher OEE" formula="availability × utilization × quality" align="right" /></th>
                <th className="px-3 py-3 text-right font-semibold">Avail</th>
                <th className="px-3 py-3 text-right font-semibold">Losses/yr</th>
                <th className="px-3 py-3 text-right font-semibold">Excess/yr</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.quarry.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-4 py-2 font-medium text-ink">{m.quarry.name}</td>
                  <td className="px-3 py-2 text-inksoft">{m.quarry.region}</td>
                  <td className="px-3 py-2 text-right tabular text-ink">{Math.round(m.systemTph).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{pct(m.planAttainment)}</td>
                  <td className={`px-3 py-2 text-right tabular font-medium ${m.attainment >= 0.9 ? "text-olive" : m.attainment >= 0.75 ? "text-gold" : "text-danger"}`}>{pct(m.attainment)}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{usd(m.costPerTon, 2)}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{m.fuelGalPerTon.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{m.kwhPerTon.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{pct(m.oee)}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{pct(m.avgAvailability)}</td>
                  <td className="px-3 py-2 text-right tabular text-danger">{usdCompact(m.lossesUsd)}</td>
                  <td className={`px-3 py-2 text-right tabular ${m.excess > 0 ? "text-danger" : "text-olive"}`}>{usdCompact(Math.max(0, m.excess))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Cost per ton" data={chart((m) => m.costPerTon, 2)} fill="#b06a3c" fmt={(v) => usd(v, 2)} />
        <ChartCard title="Actual attainment" data={chart((m) => m.attainment * 100, 0)} fill="#6f7548" fmt={(v) => `${v.toFixed(0)}%`} />
        <ChartCard title="Efficiency $ at stake / yr" data={chart((m) => m.lossesUsd, 0)} fill="#b1492f" fmt={(v) => usdCompact(v)} />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  fill,
  fmt,
}: {
  title: string;
  data: { name: string; value: number }[];
  fill: string;
  fmt: (v: number) => string;
}) {
  return (
    <Card className="p-4">
      <SectionTitle className="mb-2 text-base">{title}</SectionTitle>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 22, left: 4, right: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#6c6356", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
          <YAxis hide />
          <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
          <Bar dataKey="value" fill={fill} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="value" position="top" formatter={(v: unknown) => fmt(Number(v))} style={{ fill: "#6c6356", fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
