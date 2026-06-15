"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MODELS } from "@/data/catalog";
import { BASE_YEAR, CAPEX_HORIZON, useFleet } from "@/lib/fleetStore";
import { useCatalog } from "@/lib/catalogStore";
import { unitCapexEvents, usd, usdCompact, type CapexEvent } from "@/lib/engine";
import { BrandBadge } from "@/components/BrandBadge";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { Card, PageHeader, SectionTitle, StatCard } from "@/components/ui";

export default function CapexPage() {
  const { units } = useFleet();
  const { classById } = useCatalog();

  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);

  const events = useMemo(() => {
    const all: CapexEvent[] = [];
    for (const u of units) {
      const cls = classById.get(u.classId);
      if (!cls) continue;
      all.push(...unitCapexEvents(cls, u, BASE_YEAR, CAPEX_HORIZON));
    }
    return all.sort((a, b) => a.year - b.year || a.unitNo.localeCompare(b.unitNo));
  }, [units, classById]);

  const years = useMemo(
    () => Array.from({ length: CAPEX_HORIZON }, (_, i) => BASE_YEAR + 1 + i),
    []
  );

  const byYear = useMemo(() => {
    const map = new Map<number, { year: number; Overhaul: number; Replacement: number }>();
    for (const y of years) map.set(y, { year: y, Overhaul: 0, Replacement: 0 });
    for (const e of events) {
      const row = map.get(e.year);
      if (!row) continue;
      if (e.type === "overhaul") row.Overhaul += e.cost;
      else row.Replacement += e.cost;
    }
    return years.map((y) => map.get(y)!);
  }, [events, years]);

  const totals = useMemo(() => {
    const overhaul = events.filter((e) => e.type === "overhaul").reduce((s, e) => s + e.cost, 0);
    const replacement = events.filter((e) => e.type === "replacement").reduce((s, e) => s + e.cost, 0);
    const peak = byYear.reduce(
      (best, r) => {
        const t = r.Overhaul + r.Replacement;
        return t > best.total ? { year: r.year, total: t } : best;
      },
      { year: years[0], total: 0 }
    );
    return { overhaul, replacement, total: overhaul + replacement, peak };
  }, [events, byYear, years]);

  return (
    <div>
      <PageHeader
        title="CAPEX Planner"
        subtitle={`Projected overhaul & replacement spend, ${years[0]}–${years[years.length - 1]}, driven by each unit's hours and utilization.`}
      />

      <ModuleIntro
        id="capex"
        purpose="The multi-year capital budget: when each machine needs a major overhaul or full replacement, and what it costs."
        edit="Nothing here directly — it derives from My Fleet (hours, utilization) and Catalog (price, life, overhaul interval & cost)."
        output="Annual CAPEX by year, the peak-spend year, and a unit-by-unit event schedule to take to finance."
        connects="Pulls units from My Fleet and economics from Catalog. Change a unit's hours or a class price and this updates."
        formulas={[
          { label: "Projected hours", expr: "current hours + annual hours × years ahead" },
          { label: "Overhaul year", expr: "when projected hours cross a multiple of the overhaul interval" },
          { label: "Overhaul cost", expr: "new price × overhaul %" },
          { label: "Replacement year", expr: "when projected hours reach life hours" },
          { label: "Replacement cost", expr: "new price (full)" },
        ]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Total ${CAPEX_HORIZON}-yr`} value={usdCompact(totals.total)} sub="overhaul + replacement" tone="accent" />
        <StatCard label="Overhauls" value={usdCompact(totals.overhaul)} sub={`${events.filter((e) => e.type === "overhaul").length} events`} />
        <StatCard label="Replacements" value={usdCompact(totals.replacement)} sub={`${events.filter((e) => e.type === "replacement").length} units`} />
        <StatCard label="Peak year" value={totals.peak.year} sub={usd(totals.peak.total, 0)} tone="gold" />
      </div>

      <Card className="mb-6 p-4">
        <span className="text-[11px] uppercase tracking-[0.12em] text-inkfaint">Annual CAPEX (USD)</span>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byYear} margin={{ left: 8, right: 4, top: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#6c6356", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
            <YAxis tickFormatter={(v) => usdCompact(Number(v))} tick={{ fill: "#a89e8c", fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
            <Tooltip
              cursor={{ fill: "rgba(176,106,60,0.06)" }}
              formatter={(value) => usd(Number(value), 0)}
              contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12, color: "#2a2620" }}
            />
            <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
            <Bar dataKey="Overhaul" stackId="a" fill="#6f7548" />
            <Bar dataKey="Replacement" stackId="a" fill="#b06a3c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle className="mb-2">Event schedule</SectionTitle>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-3 font-semibold">Year</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">
                  Event <InfoTip title="Event type" formula="overhaul at each interval; replacement at life hours" align="left" />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Hours at event <InfoTip title="Hours at event" formula="current + annual hours × years ahead" align="right" />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Cost <InfoTip title="Event cost" formula="overhaul = price × overhaul %; replacement = new price" align="right" />
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => {
                const model = modelById.get(units.find((u) => u.id === e.unitId)?.modelId ?? "");
                return (
                  <tr key={i} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                    <td className="px-4 py-2.5 tabular font-medium text-ink">{e.year}</td>
                    <td className="px-4 py-2.5 text-ink">{e.unitNo}</td>
                    <td className="px-4 py-2.5">
                      {model ? (
                        <span className="flex items-center gap-1.5">
                          <BrandBadge brand={model.brand} />
                          <span className="text-inksoft">{model.model}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          e.type === "replacement"
                            ? "bg-accentsoft text-accentink"
                            : "bg-olivesoft text-olive"
                        }`}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-inksoft">
                      {Math.round(e.hoursAtEvent).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold text-ink">{usd(e.cost, 0)}</td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-inkfaint">
                    No overhauls or replacements fall within the horizon for the
                    current fleet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-inkfaint">
        An overhaul is scheduled at each overhaul interval (cost = a % of new
        price); a replacement when a unit reaches its life hours (cost = new
        price). All economics are editable estimates — refine acquisition
        prices and intervals as you load real data.
      </p>
    </div>
  );
}
