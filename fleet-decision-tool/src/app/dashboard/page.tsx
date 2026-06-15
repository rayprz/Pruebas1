"use client";

import { useMemo } from "react";
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
import { MODELS } from "@/data/catalog";
import {
  sizeSite,
  unitAnnualCost,
  unitCapexEvents,
  unitOperatingPerHour,
  usd,
  usdCompact,
} from "@/lib/engine";
import { computeQuarry } from "@/lib/quarry";
import { summarize } from "@/lib/shiftLog";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet, BASE_YEAR, CAPEX_HORIZON } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import { useShiftLog } from "@/lib/shiftStore";
import { Card, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";

const refModel = (classId: string) =>
  MODELS.find((m) => m.classId === classId && m.source === "oem") ??
  MODELS.find((m) => m.classId === classId);

const SITE_HRS = 5000;
const SITE_TPL = 3;

export default function DashboardPage() {
  const { params } = useParams();
  const { classById } = useCatalog();
  const { units, sites } = useFleet();
  const { config } = useQuarry();
  const { records } = useShiftLog();

  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);

  // --- Fleet ---------------------------------------------------------------
  const fleet = useMemo(() => {
    let operating = 0,
      owning = 0,
      nearEol = 0;
    const aging: { unitNo: string; lifePct: number; model: string }[] = [];
    for (const u of units) {
      const cls = classById.get(u.classId);
      if (!cls) continue;
      const model = modelById.get(u.modelId) ?? refModel(u.classId);
      if (!model) continue;
      const c = unitAnnualCost(cls, model, "medium", u, params);
      operating += c.operating;
      owning += c.owning;
      const lifePct = cls.lifeHours ? u.currentHours / cls.lifeHours : 0;
      if (lifePct >= 0.8) nearEol++;
      aging.push({ unitNo: u.unitNo, lifePct, model: `${model.brand} ${model.model}` });
    }
    aging.sort((a, b) => b.lifePct - a.lifePct);
    return { operating, owning, nearEol, aging: aging.slice(0, 5) };
  }, [units, classById, modelById, params]);

  // --- CAPEX ---------------------------------------------------------------
  const capex = useMemo(() => {
    const years = Array.from({ length: CAPEX_HORIZON }, (_, i) => BASE_YEAR + 1 + i);
    const map = new Map(years.map((y) => [y, 0]));
    let total = 0;
    for (const u of units) {
      const cls = classById.get(u.classId);
      if (!cls) continue;
      for (const e of unitCapexEvents(cls, u, BASE_YEAR, CAPEX_HORIZON)) {
        map.set(e.year, (map.get(e.year) ?? 0) + e.cost);
        total += e.cost;
      }
    }
    const byYear = years.map((y) => ({ year: y, capex: map.get(y) ?? 0 }));
    const peak = byYear.reduce((b, r) => (r.capex > b.capex ? r : b), byYear[0]);
    return { total, byYear, peak };
  }, [units, classById]);

  // --- Sites (excess OPEX) -------------------------------------------------
  const sitesExcess = useMemo(() => {
    let excess = 0;
    for (const site of sites) {
      const truckCls = classById.get(site.truckClassId);
      const loaderCls = classById.get(site.loaderClassId);
      if (!truckCls || !loaderCls) continue;
      const sizing = sizeSite(site, truckCls, SITE_HRS, SITE_TPL);
      const tModel = refModel(truckCls.id);
      const lModel = refModel(loaderCls.id);
      if (!tModel || !lModel) continue;
      const optimal =
        sizing.trucksNeeded * unitOperatingPerHour(truckCls, tModel, "medium", 0, params).total * SITE_HRS +
        sizing.loadersNeeded * unitOperatingPerHour(loaderCls, lModel, "medium", 0, params).total * SITE_HRS;
      const current = units
        .filter((u) => u.site === site.name)
        .reduce((s, u) => {
          const c = classById.get(u.classId);
          const m = modelById.get(u.modelId) ?? refModel(u.classId);
          return c && m ? s + unitAnnualCost(c, m, "medium", u, params).operating : s;
        }, 0);
      excess += current - optimal;
    }
    return excess;
  }, [sites, units, classById, modelById, params]);

  // --- Quarry (model + actuals) -------------------------------------------
  const quarry = useMemo(() => computeQuarry(config, classById, params), [config, classById, params]);
  const shift = useMemo(() => {
    const modelByFront = new Map(quarry.fronts.map((f) => [f.name, f.delivered]));
    return summarize(records, modelByFront, config.targetTph);
  }, [records, quarry, config.targetTph]);

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="One screen across the fleet: operating cost, capital plan, fleet right-sizing, and quarry performance."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={<>Fleet OPEX / yr <InfoTip title="Fleet operating cost" formula="Σ unit (fuel + maint×age + operator) × hrs/yr" /></>} value={usdCompact(fleet.operating)} sub={`${units.length} units`} tone="accent" />
        <StatCard label="Owning / yr" value={usdCompact(fleet.owning)} sub="deprec.+capital+ins." />
        <StatCard label={<>CAPEX {CAPEX_HORIZON}-yr <InfoTip title="Capital plan" formula="Σ overhaul + replacement over horizon" align="left" /></>} value={usdCompact(capex.total)} sub={`peak ${capex.peak.year}`} tone="gold" />
        <StatCard label={<>Excess OPEX / yr <InfoTip title="Non-optimal fleet" formula="Σ (current − optimal operating) per site" align="left" /></>} value={usdCompact(Math.max(0, sitesExcess))} sub="vs right-sized" tone={sitesExcess > 0 ? "danger" : "olive"} />
        <StatCard label={<>Quarry losses / yr <InfoTip title="Quarry efficiency" formula="Σ loss tph × productive hrs/yr × margin" align="right" /></>} value={usdCompact(quarry.totalLossUsdYear)} sub={`bottleneck: ${quarry.systemBottleneck === "Crusher" ? "Crusher" : "Fronts"}`} tone="danger" />
        <StatCard label="Plant attainment" value={`${(shift.avgAttainment * 100).toFixed(0)}%`} sub={`top stop: ${shift.pareto[0]?.reason ?? "—"}`} tone={shift.avgAttainment >= 0.9 ? "olive" : "accent"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CAPEX outlook */}
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Capital outlook</SectionTitle>
            <Link href="/capex" className="text-xs text-accent hover:underline">Open CAPEX →</Link>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={capex.byYear} margin={{ top: 20, left: 4, right: 4 }}>
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

        {/* Quarry losses */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>What&apos;s costing efficiency</SectionTitle>
            <Link href="/quarry" className="text-xs text-accent hover:underline">Open Quarry →</Link>
          </div>
          <div className="space-y-2">
            {quarry.losses.slice(0, 4).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.title}</span>
                <span className="shrink-0 tabular text-sm font-semibold text-danger">{usdCompact(l.usdPerYear)}/yr</span>
              </div>
            ))}
            {quarry.losses.length === 0 && <p className="text-sm text-olive">Quarry is balanced.</p>}
          </div>
        </Card>

        {/* Attainment by shift */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Attainment by shift</SectionTitle>
            <Link href="/quarry" className="text-xs text-accent hover:underline">Shift log →</Link>
          </div>
          <div className="space-y-3">
            {shift.byShift.map((b) => (
              <div key={b.shift}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-inksoft">Shift {b.shift}</span>
                  <span className={`tabular font-medium ${b.avgAttainment >= 0.9 ? "text-olive" : b.avgAttainment >= 0.75 ? "text-gold" : "text-danger"}`}>{(b.avgAttainment * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                  <div className={`h-full rounded-full ${b.avgAttainment >= 0.9 ? "bg-olive" : b.avgAttainment >= 0.75 ? "bg-gold" : "bg-danger"}`} style={{ width: `${Math.min(100, b.avgAttainment * 100)}%` }} />
                </div>
              </div>
            ))}
            {shift.byShift.length === 0 && <p className="text-sm text-inkfaint">No shift data logged.</p>}
          </div>
        </Card>

        {/* Fleet aging */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Fleet closest to end of life</SectionTitle>
            <Link href="/fleet" className="text-xs text-accent hover:underline">Open Fleet →</Link>
          </div>
          <div className="space-y-3">
            {fleet.aging.map((a) => (
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
          <p className="mt-3 text-xs text-inkfaint">{fleet.nearEol} unit(s) at ≥ 80% of life — candidates for the CAPEX plan.</p>
        </Card>
      </div>
    </div>
  );
}
