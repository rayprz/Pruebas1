"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
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
import { BASE_YEAR, CAPEX_HORIZON, useFleet } from "@/lib/fleetStore";
import { quarryMetrics, type QuarryMetrics } from "@/lib/rollup";
import { actualMaintPerHrByUnit, actualAvailabilityByUnit, quarryMaint } from "@/lib/maintLog";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useQuarry } from "@/lib/quarryStore";
import { useShiftLog } from "@/lib/shiftStore";
import { useMaint } from "@/lib/maintStore";
import { useFleetHistory } from "@/lib/fleetHistoryStore";
import { usePeriod, resolveMonths } from "@/lib/periodStore";
import { kpiHistory, KPI_DEFS, aggKpi } from "@/lib/history";
import { Card, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { MiniTrend } from "@/components/MiniTrend";
import { SortHeader, type SortState } from "@/components/Sortable";
import { InfoTip } from "@/components/InfoTip";

export default function DashboardPage() {
  const { params } = useParams();
  const { classById } = useCatalog();
  const { units } = useFleet();
  const { quarries, selectedQuarries } = useQuarry();
  const { records } = useShiftLog();
  const { records: maintRecords } = useMaint();
  const { months: fleetMonths } = useFleetHistory();
  const { period } = usePeriod();
  const maintByUnit = useMemo(
    () => (params.useActualMaint ? actualMaintPerHrByUnit(maintRecords) : undefined),
    [params.useActualMaint, maintRecords]
  );
  const availByUnit = useMemo(
    () => (params.useActualAvailability ? actualAvailabilityByUnit(maintRecords) : undefined),
    [params.useActualAvailability, maintRecords]
  );

  const maintByQuarry = useMemo(() => {
    const quarryByUnit = new Map(units.map((u) => [u.id, u.quarryId]));
    const productionByQuarry = new Map(quarries.map((q) => [q.id, q.productionTons]));
    return quarryMaint(maintRecords, quarryByUnit, productionByQuarry);
  }, [maintRecords, units, quarries]);

  // Scoped by the global quarry multi-select in the top bar.
  const includedQuarries = selectedQuarries;

  const metrics = useMemo(
    () => includedQuarries.map((q) => quarryMetrics(q, units, records, classById, params, maintByUnit, availByUnit)),
    [includedQuarries, units, records, classById, params, maintByUnit, availByUnit]
  );

  const agg = useMemo(() => {
    const operating = metrics.reduce((s, m) => s + m.operating, 0);
    const owning = metrics.reduce((s, m) => s + m.owning, 0);
    const capex = metrics.reduce((s, m) => s + m.capexTotal, 0);
    const excess = metrics.reduce((s, m) => s + m.excess, 0);
    const losses = metrics.reduce((s, m) => s + m.lossesUsd, 0);
    const attainment = metrics.length ? metrics.reduce((s, m) => s + m.attainment, 0) / metrics.length : 0;
    const unitCount = metrics.reduce((s, m) => s + m.units.length, 0);
    // CAPEX by year aggregated
    const years = Array.from({ length: CAPEX_HORIZON }, (_, i) => BASE_YEAR + 1 + i);
    const byYear = years.map((y) => ({ year: y, capex: metrics.reduce((s, m) => s + (m.capexByYear.get(y) ?? 0), 0) }));
    // combined top losses & aging
    const topLosses = metrics.flatMap((m) => m.losses).sort((a, b) => b.usdPerYear - a.usdPerYear).slice(0, 5);
    const aging = metrics.flatMap((m) => m.aging).sort((a, b) => b.lifePct - a.lifePct).slice(0, 5);
    const nearEol = metrics.reduce((s, m) => s + m.nearEol, 0);
    return { operating, owning, capex, excess, losses, attainment, unitCount, byYear, topLosses, aging, nearEol };
  }, [metrics]);

  // Region subtotals for the By-quarry rollup
  const byRegion = useMemo(() => {
    const m = new Map<string, QuarryMetrics[]>();
    for (const x of metrics) {
      const l = m.get(x.quarry.region) ?? [];
      l.push(x);
      m.set(x.quarry.region, l);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([region, list]) => {
        const annualized = list.reduce((s, x) => s + (maintByQuarry.get(x.quarry.id)?.annualizedCost ?? 0), 0);
        const production = list.reduce((s, x) => s + x.quarry.productionTons, 0);
        return {
          region,
          list,
          operating: list.reduce((s, x) => s + x.operating, 0),
          excess: list.reduce((s, x) => s + x.excess, 0),
          losses: list.reduce((s, x) => s + x.lossesUsd, 0),
          systemTph: list.reduce((s, x) => s + x.systemTph, 0),
          attainment: list.length ? list.reduce((s, x) => s + x.attainment, 0) / list.length : 0,
          maintPerTon: production > 0 ? annualized / production : 0,
        };
      });
  }, [metrics, maintByQuarry]);

  const aggMaintPerTon = useMemo(() => {
    const annualized = metrics.reduce((s, m) => s + (maintByQuarry.get(m.quarry.id)?.annualizedCost ?? 0), 0);
    const production = metrics.reduce((s, m) => s + m.quarry.productionTons, 0);
    return production > 0 ? annualized / production : 0;
  }, [metrics, maintByQuarry]);

  const trendMonths = useMemo(
    () => resolveMonths([...new Set(fleetMonths.map((m) => m.month))], period),
    [fleetMonths, period]
  );
  const trends = useMemo(() => {
    const hist = kpiHistory(trendMonths, includedQuarries, units, fleetMonths, records, maintRecords, classById, params);
    const point = (key: string) => {
      const def = KPI_DEFS.find((d) => d.key === key)!;
      return { def, data: hist.map((h, i) => ({ month: trendMonths[i], value: aggKpi(def, [...h.byQuarry.values()]) })) };
    };
    return { operating: point("operating"), attainment: point("attainment"), maintPerTon: point("maintPerTon") };
  }, [trendMonths, includedQuarries, units, fleetMonths, records, maintRecords, classById, params]);

  // Sort the leaf rows within each region group on header click.
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });
  const toggle = (k: string) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }));
  const leafAcc: Record<string, (m: QuarryMetrics) => number | string> = {
    name: (m) => m.quarry.name,
    region: (m) => m.quarry.region,
    systemTph: (m) => m.systemTph,
    attainment: (m) => m.attainment,
    costPerTon: (m) => m.costPerTon,
    maintPerTon: (m) => maintByQuarry.get(m.quarry.id)?.perTon ?? 0,
    operating: (m) => m.operating,
    excess: (m) => m.excess,
    lossesUsd: (m) => m.lossesUsd,
  };
  const sortLeaves = (list: QuarryMetrics[]) => {
    const acc = sort.key ? leafAcc[sort.key] : undefined;
    if (!acc) return list;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      return typeof av === "number" && typeof bv === "number"
        ? (av - bv) * dir
        : String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  };

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="The whole aggregates operation on one screen — scope it with the quarry and period filters in the top bar."
        actions={<span className="text-xs text-inkfaint">{includedQuarries.length} of {quarries.length} quarries</span>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={<>Fleet OPEX / yr <InfoTip title="Fleet operating cost" formula="Σ unit (fuel + maint×age + operator) × hrs/yr" /></>} value={usdCompact(agg.operating)} sub={`${agg.unitCount} units · ${includedQuarries.length} quarr${includedQuarries.length === 1 ? "y" : "ies"}`} tone="accent" />
        <StatCard label="Owning / yr" value={usdCompact(agg.owning)} sub="deprec.+capital+ins." />
        <StatCard label={<>CAPEX {CAPEX_HORIZON}-yr <InfoTip title="Capital plan" formula="Σ overhaul + replacement over horizon" align="left" /></>} value={usdCompact(agg.capex)} tone="gold" />
        <StatCard label={<>Excess OPEX / yr <InfoTip title="Non-optimal fleet" formula="Σ (current − optimal operating) per quarry" align="left" /></>} value={usdCompact(Math.max(0, agg.excess))} sub="vs right-sized" tone={agg.excess > 0 ? "danger" : "olive"} />
        <StatCard label={<>Quarry losses / yr <InfoTip title="Quarry efficiency" formula="Σ loss tph × productive hrs/yr × margin" align="right" /></>} value={usdCompact(agg.losses)} tone="danger" />
        <StatCard label="Plant attainment" value={`${(agg.attainment * 100).toFixed(0)}%`} sub="avg of quarries" tone={agg.attainment >= 0.9 ? "olive" : "accent"} />
      </div>

      {/* Trends over the selected period */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniTrend label="Fleet OPEX / yr" data={trends.operating.data} fmt={trends.operating.def.fmt} color="#b06a3c" goodWhenUp={false} />
        <MiniTrend label="Plan attainment" data={trends.attainment.data} fmt={trends.attainment.def.fmt} color="#6f7548" goodWhenUp />
        <MiniTrend label="Maintenance $/ton" data={trends.maintPerTon.data} fmt={trends.maintPerTon.def.fmt} color="#5b7c8a" goodWhenUp={false} />
      </div>

      {/* By quarry rollup */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <SectionTitle>By quarry</SectionTitle>
          <Link href="/compare-quarries" className="text-xs text-accent hover:underline">Compare quarries →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <SortHeader label="Quarry" sortKey="name" state={sort} onSort={toggle} className="px-5 py-3" />
                <SortHeader label="Region" sortKey="region" state={sort} onSort={toggle} className="px-3 py-3" />
                <SortHeader label="System tph" sortKey="systemTph" state={sort} onSort={toggle} align="right" className="px-3 py-3" />
                <SortHeader label="Attain." sortKey="attainment" state={sort} onSort={toggle} align="right" className="px-3 py-3" />
                <SortHeader label="Cost/ton" sortKey="costPerTon" state={sort} onSort={toggle} align="right" className="px-3 py-3" />
                <SortHeader label="Maint $/t" sortKey="maintPerTon" state={sort} onSort={toggle} align="right" className="px-3 py-3"><InfoTip title="Maintenance $/ton" formula="annualized logged maintenance ÷ quarry production" align="right" /></SortHeader>
                <SortHeader label="Fleet OPEX" sortKey="operating" state={sort} onSort={toggle} align="right" className="px-3 py-3" />
                <SortHeader label="Excess OPEX" sortKey="excess" state={sort} onSort={toggle} align="right" className="px-3 py-3" />
                <SortHeader label="Losses/yr" sortKey="lossesUsd" state={sort} onSort={toggle} align="right" className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {byRegion.map((rg) => (
                <Fragment key={rg.region}>
                  <tr className="border-b border-line bg-panel/40 text-[11px] uppercase tracking-[0.1em] text-inksoft">
                    <td className="px-5 py-1.5 font-semibold" colSpan={2}>Región {rg.region}</td>
                    <td className="px-3 py-1.5 text-right tabular">{Math.round(rg.systemTph).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right tabular">{(rg.attainment * 100).toFixed(0)}%</td>
                    <td className="px-3 py-1.5" />
                    <td className="px-3 py-1.5 text-right tabular">{usd(rg.maintPerTon, 2)}</td>
                    <td className="px-3 py-1.5 text-right tabular">{usdCompact(rg.operating)}</td>
                    <td className="px-3 py-1.5 text-right tabular">{usdCompact(Math.max(0, rg.excess))}</td>
                    <td className="px-3 py-1.5 text-right tabular">{usdCompact(rg.losses)}</td>
                  </tr>
                  {sortLeaves(rg.list).map((m) => (
                    <tr key={m.quarry.id} className="border-b border-line/60 hover:bg-panel/50">
                      <td className="px-5 py-2 pl-8 font-medium text-ink">{m.quarry.name}</td>
                      <td className="px-3 py-2 text-inksoft">{m.quarry.region}</td>
                      <td className="px-3 py-2 text-right tabular text-inksoft">{Math.round(m.systemTph).toLocaleString()}</td>
                      <td className={`px-3 py-2 text-right tabular font-medium ${m.attainment >= 0.9 ? "text-olive" : m.attainment >= 0.75 ? "text-gold" : "text-danger"}`}>{(m.attainment * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right tabular text-inksoft">{usd(m.costPerTon, 2)}</td>
                      <td className="px-3 py-2 text-right tabular text-inksoft">{usd(maintByQuarry.get(m.quarry.id)?.perTon ?? 0, 2)}</td>
                      <td className="px-3 py-2 text-right tabular text-inksoft">{usdCompact(m.operating)}</td>
                      <td className={`px-3 py-2 text-right tabular ${m.excess > 0 ? "text-danger" : "text-olive"}`}>{usdCompact(Math.max(0, m.excess))}</td>
                      <td className="px-3 py-2 text-right tabular text-danger">{usdCompact(m.lossesUsd)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {byRegion.length > 1 && (
                <tr className="border-t-2 border-line-strong font-semibold text-ink">
                  <td className="px-5 py-2" colSpan={5}>All quarries</td>
                  <td className="px-3 py-2 text-right tabular">{usd(aggMaintPerTon, 2)}</td>
                  <td className="px-3 py-2 text-right tabular">{usdCompact(agg.operating)}</td>
                  <td className="px-3 py-2 text-right tabular">{usdCompact(Math.max(0, agg.excess))}</td>
                  <td className="px-3 py-2 text-right tabular text-danger">{usdCompact(agg.losses)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CAPEX outlook */}
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Capital outlook</SectionTitle>
            <Link href="/capex" className="text-xs text-accent hover:underline">Open CAPEX →</Link>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={agg.byYear} margin={{ top: 20, left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#6c6356", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
              <YAxis tickFormatter={(v) => usdCompact(Number(v))} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => usd(Number(v), 0)} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
              <Bar dataKey="capex" fill="#b06a3c" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="capex" position="top" formatter={(v: unknown) => (Number(v) > 0 ? usdCompact(Number(v)) : "")} style={{ fill: "#6c6356", fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top losses */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>What&apos;s costing efficiency</SectionTitle>
            <Link href="/quarry" className="text-xs text-accent hover:underline">Open Quarry →</Link>
          </div>
          <div className="space-y-2">
            {agg.topLosses.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.title}</span>
                <span className="shrink-0 tabular text-sm font-semibold text-danger">{usdCompact(l.usdPerYear)}/yr</span>
              </div>
            ))}
            {agg.topLosses.length === 0 && <p className="text-sm text-olive">Everything balanced.</p>}
          </div>
        </Card>

        {/* Attainment by quarry */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Attainment by quarry</SectionTitle>
            <Link href="/quarry" className="text-xs text-accent hover:underline">Shift log →</Link>
          </div>
          <div className="space-y-3">
            {metrics.map((m) => (
              <div key={m.quarry.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-inksoft">{m.quarry.name}</span>
                  <span className={`tabular font-medium ${m.attainment >= 0.9 ? "text-olive" : m.attainment >= 0.75 ? "text-gold" : "text-danger"}`}>{(m.attainment * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                  <div className={`h-full rounded-full ${m.attainment >= 0.9 ? "bg-olive" : m.attainment >= 0.75 ? "bg-gold" : "bg-danger"}`} style={{ width: `${Math.min(100, m.attainment * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fleet aging */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Fleet closest to end of life</SectionTitle>
            <Link href="/fleet" className="text-xs text-accent hover:underline">Open Fleet →</Link>
          </div>
          <div className="space-y-3">
            {agg.aging.map((a) => (
              <div key={a.unitNo}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-inksoft">{a.unitNo} · {a.model}</span>
                  <span className={`tabular font-medium ${a.lifePct >= 0.8 ? "text-danger" : a.lifePct >= 0.5 ? "text-gold" : "text-inksoft"}`}>{(a.lifePct * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                  <div className={`h-full rounded-full ${a.lifePct >= 0.8 ? "bg-danger" : a.lifePct >= 0.5 ? "bg-gold" : "bg-olive"}`} style={{ width: `${Math.min(100, a.lifePct * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-inkfaint">{agg.nearEol} unit(s) at ≥ 80% of life — candidates for the CAPEX plan.</p>
        </Card>
      </div>
    </div>
  );
}
