"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MODELS, CATEGORY_LABELS } from "@/data/catalog";
import {
  ageMaintenanceMultiplier,
  maintenanceCostPerHr,
  usd,
  usdCompact,
} from "@/lib/engine";
import { unitMaint, bySubsystem, quarryMaint } from "@/lib/maintLog";
import type { EquivalenceClass, FleetUnit, GlobalParams, MaintRecord, Quarry } from "@/lib/types";
import { InfoTip } from "@/components/InfoTip";
import { BrandBadge } from "@/components/BrandBadge";
import { Card, SectionTitle, Select } from "@/components/ui";

const PALETTE = ["#b06a3c", "#6f7548", "#5b7c8a", "#c08a44", "#b07a8c", "#8a8c5a"];

export function MaintAnalysis({
  units,
  records,
  classById,
  params,
  quarries,
}: {
  units: FleetUnit[];
  records: MaintRecord[];
  classById: Map<string, EquivalenceClass>;
  params: GlobalParams;
  quarries: Quarry[];
}) {
  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);
  const quarryName = useMemo(() => new Map(quarries.map((q) => [q.id, q.name])), [quarries]);
  const um = useMemo(() => unitMaint(records), [records]);

  // Classes that have logged data, sorted by how many units have data (desc)
  const classesWithData = useMemo(() => {
    const count = new Map<string, Set<string>>();
    for (const r of records) {
      const u = units.find((x) => x.id === r.unitId);
      if (u) (count.get(u.classId) ?? count.set(u.classId, new Set()).get(u.classId)!).add(u.id);
    }
    return [...count.keys()]
      .map((id) => classById.get(id))
      .filter((c): c is EquivalenceClass => !!c)
      .sort((a, b) => (count.get(b.id)!.size - count.get(a.id)!.size) || a.name.localeCompare(b.name));
  }, [records, units, classById]);

  const [classId, setClassId] = useState(classesWithData[0]?.id ?? "");
  const [scope, setScope] = useState("all"); // all | quarryId

  // Units of the selected class (with data), respecting scope
  const rows = useMemo(() => {
    const cls = classById.get(classId);
    return units
      .filter((u) => u.classId === classId && um.has(u.id) && (scope === "all" || u.quarryId === scope))
      .map((u) => {
        const m = um.get(u.id)!;
        const model = modelById.get(u.modelId);
        const benchmark = cls && model
          ? maintenanceCostPerHr(cls, model, "medium", params) * ageMaintenanceMultiplier(u.currentHours, cls.lifeHours)
          : 0;
        return {
          unit: u,
          model,
          perHour: m.perHour,
          totalCost: m.totalCost,
          scheduledPct: m.scheduledPct,
          benchmark,
          vsBenchmark: benchmark > 0 ? m.perHour / benchmark : 0,
          mtbf: m.mtbf,
          availability: m.availability,
        };
      })
      .sort((a, b) => b.perHour - a.perHour);
  }, [classId, scope, units, um, classById, modelById, params]);

  const unitIds = useMemo(() => new Set(rows.map((r) => r.unit.id)), [rows]);

  // Actual vs benchmark $/hr by unit
  const barData = rows.map((r) => ({ name: r.unit.unitNo, Actual: Number(r.perHour.toFixed(2)), Benchmark: Number(r.benchmark.toFixed(2)) }));

  // Monthly $/hr trend, one series per unit
  const trend = useMemo(() => {
    const months = [...new Set(records.filter((r) => unitIds.has(r.unitId)).map((r) => r.month))].sort();
    const perUnitMonth = new Map<string, Map<string, number>>(); // unitNo -> month -> $/hr
    for (const r of records) {
      if (!unitIds.has(r.unitId)) continue;
      const u = units.find((x) => x.id === r.unitId)!;
      const cost = r.lines.reduce((s, l) => s + l.cost, 0);
      const perHr = r.hours > 0 ? cost / r.hours : 0;
      const mm = perUnitMonth.get(u.unitNo) ?? new Map();
      mm.set(r.month, perHr);
      perUnitMonth.set(u.unitNo, mm);
    }
    return months.map((m) => {
      const row: Record<string, number | string> = { month: m };
      for (const [unitNo, mm] of perUnitMonth) if (mm.has(m)) row[unitNo] = Number((mm.get(m) ?? 0).toFixed(2));
      return row;
    });
  }, [records, unitIds, units]);
  const trendUnits = useMemo(() => rows.map((r) => r.unit.unitNo), [rows]);

  // Subsystem breakdown for the class
  const subs = useMemo(() => bySubsystem(records, unitIds).map((s) => ({
    subsystem: s.subsystem, Preventive: s.preventive, Corrective: s.corrective, Overhaul: s.overhaul, total: s.total,
  })), [records, unitIds]);

  // By-quarry maintenance $/ton & reliability (all classes, not just selected)
  const qmaint = useMemo(() => {
    const quarryByUnit = new Map(units.map((u) => [u.id, u.quarryId]));
    const productionByQuarry = new Map(quarries.map((q) => [q.id, q.productionTons]));
    return quarryMaint(records, quarryByUnit, productionByQuarry);
  }, [records, units, quarries]);
  const qRows = quarries
    .map((q) => ({ q, m: qmaint.get(q.id) }))
    .filter((x): x is { q: Quarry; m: NonNullable<ReturnType<typeof qmaint.get>> } => !!x.m);

  const flags = rows.filter((r) => r.vsBenchmark > 1.15);

  if (classesWithData.length === 0) {
    return <Card className="p-8 text-center text-inkfaint">No maintenance data logged yet. Add lines in the Log tab.</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-inkfaint">Compare class</span>
        <Select value={classId} onChange={setClassId} options={classesWithData.map((c) => ({ value: c.id, label: `${CATEGORY_LABELS[c.category]} · ${c.name}` }))} />
        <Select value={scope} onChange={setScope} options={[{ value: "all", label: "All quarries" }, ...quarries.map((q) => ({ value: q.id, label: q.name }))]} />
      </div>

      {/* Compare equivalent units */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <SectionTitle>Equivalent units — actual vs benchmark</SectionTitle>
          <InfoTip title="vs Benchmark" formula="actual $/hr ÷ modeled class $/hr (age-adjusted)" align="left">Same class across brands and quarries. &gt;100% = costlier than the modeled baseline.</InfoTip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-3 py-3 font-semibold">Brand / model</th>
                <th className="px-3 py-3 font-semibold">Quarry</th>
                <th className="px-3 py-3 text-right font-semibold">$/hr</th>
                <th className="px-3 py-3 text-right font-semibold">Benchmark</th>
                <th className="px-3 py-3 text-right font-semibold">vs Bm</th>
                <th className="px-3 py-3 text-right font-semibold">Sched%</th>
                <th className="px-3 py-3 text-right font-semibold">MTBF <InfoTip title="Mean time between failures" formula="operating hours ÷ # corrective events" align="right" /></th>
                <th className="px-3 py-3 text-right font-semibold">Avail <InfoTip title="Reliability availability" formula="uptime ÷ (uptime + corrective downtime)" align="right" /></th>
                <th className="px-3 py-3 text-right font-semibold">Total $</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unit.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-5 py-2 font-medium text-ink">{r.unit.unitNo}</td>
                  <td className="px-3 py-2">{r.model ? <span className="flex items-center gap-1.5"><BrandBadge brand={r.model.brand} /><span className="text-inksoft">{r.model.model}</span></span> : "—"}</td>
                  <td className="px-3 py-2 text-inksoft">{quarryName.get(r.unit.quarryId)}</td>
                  <td className="px-3 py-2 text-right tabular font-semibold text-ink">{usd(r.perHour, 2)}</td>
                  <td className="px-3 py-2 text-right tabular text-inkfaint">{usd(r.benchmark, 2)}</td>
                  <td className={`px-3 py-2 text-right tabular font-medium ${r.vsBenchmark > 1.15 ? "text-danger" : r.vsBenchmark > 1 ? "text-gold" : "text-olive"}`}>{(r.vsBenchmark * 100).toFixed(0)}%</td>
                  <td className={`px-3 py-2 text-right tabular ${r.scheduledPct >= 0.6 ? "text-olive" : "text-gold"}`}>{(r.scheduledPct * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{Number.isFinite(r.mtbf) ? `${Math.round(r.mtbf)} h` : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular ${r.availability >= 0.95 ? "text-olive" : r.availability >= 0.9 ? "text-gold" : "text-danger"}`}>{(r.availability * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{usd(r.totalCost, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Actual vs benchmark bar */}
        <Card className="p-5">
          <SectionTitle className="mb-2 text-base">Maintenance $/hr — actual vs benchmark</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 22, left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#6c6356", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => usd(Number(v), 2)} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
              <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
              <Bar dataKey="Benchmark" fill="#6f7548" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#b06a3c" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="Actual" position="top" formatter={(v: unknown) => usd(Number(v), 0)} style={{ fill: "#6c6356", fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly trend per unit */}
        <Card className="p-5">
          <SectionTitle className="mb-2 text-base">Cost trend — $/hr by month</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 8, left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#6c6356", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => usd(Number(v), 2)} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
              <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
              {trendUnits.map((un, i) => (
                <Line key={un} dataKey={un} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* By quarry — $/ton & reliability */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <SectionTitle>Maintenance by quarry — $/ton &amp; reliability</SectionTitle>
          <InfoTip title="Maintenance $/ton" formula="annualized maintenance $ ÷ quarry production (t/yr)" align="left">Annualized = logged $ × 12 ÷ months logged. Availability = uptime ÷ (uptime + corrective downtime).</InfoTip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-5 py-3 font-semibold">Quarry</th>
                <th className="px-3 py-3 font-semibold">Region</th>
                <th className="px-3 py-3 text-right font-semibold">Units</th>
                <th className="px-3 py-3 text-right font-semibold">Annualized $</th>
                <th className="px-3 py-3 text-right font-semibold">$/ton</th>
                <th className="px-3 py-3 text-right font-semibold">Availability</th>
              </tr>
            </thead>
            <tbody>
              {qRows.map(({ q, m }) => (
                <tr key={q.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-5 py-2 font-medium text-ink">{q.name}</td>
                  <td className="px-3 py-2 text-inksoft">{q.region}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{m.unitsWithData}</td>
                  <td className="px-3 py-2 text-right tabular text-inksoft">{usdCompact(m.annualizedCost)}</td>
                  <td className="px-3 py-2 text-right tabular font-semibold text-ink">{usd(m.perTon, 2)}</td>
                  <td className={`px-3 py-2 text-right tabular ${m.availability >= 0.95 ? "text-olive" : m.availability >= 0.9 ? "text-gold" : "text-danger"}`}>{(m.availability * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subsystem breakdown */}
      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <SectionTitle>Cost by subsystem</SectionTitle>
          <InfoTip title="Subsystem split" formula="Σ cost by subsystem, stacked by preventive / corrective / overhaul" align="left" />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={subs} margin={{ top: 22, left: 4, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
            <XAxis dataKey="subsystem" tick={{ fill: "#6c6356", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} interval={0} angle={-12} textAnchor="end" height={54} />
            <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fill: "#a89e8c", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => usd(Number(v), 0)} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
            <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
            <Bar dataKey="Preventive" stackId="s" fill="#6f7548" />
            <Bar dataKey="Corrective" stackId="s" fill="#b1492f" />
            <Bar dataKey="Overhaul" stackId="s" fill="#c08a44" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="total" position="top" formatter={(v: unknown) => `$${(Number(v) / 1000).toFixed(0)}k`} style={{ fill: "#6c6356", fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {flags.length > 0 && (
        <Card className="border-danger/40 p-4">
          <p className="mb-2 text-sm font-semibold text-danger">Above benchmark — replacement / overhaul candidates</p>
          <div className="space-y-1.5">
            {flags.map((r) => (
              <div key={r.unit.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{r.unit.unitNo} · {quarryName.get(r.unit.quarryId)} — {usd(r.perHour, 2)}/hr ({(r.vsBenchmark * 100).toFixed(0)}% of benchmark)</span>
                <Link href="/capex" className="shrink-0 text-xs text-accent hover:underline">CAPEX →</Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
