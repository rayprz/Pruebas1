"use client";

import { useMemo, useState } from "react";
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
import { CATEGORY_LABELS, MODELS } from "@/data/catalog";
import {
  SCENARIOS,
  SCENARIO_LABELS,
  annualHours,
  costBreakdown,
  usd,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import type { Scenario } from "@/lib/types";
import { BrandBadge, EstimateBadge } from "@/components/BrandBadge";
import { ParamsPanel } from "@/components/ParamsPanel";
import { ModuleIntro } from "@/components/ModuleIntro";
import { Card, PageHeader, Segmented } from "@/components/ui";

const MAX_SELECTION = 5;

export default function ComparePage() {
  const { params } = useParams();
  const { classes, classById } = useCatalog();
  const [scenario, setScenario] = useState<Scenario>("medium");
  const [selected, setSelected] = useState<string[]>([
    "cat-980m",
    "km-wa500",
    "vo-l220",
    "jd-844",
  ]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_SELECTION
          ? prev
          : [...prev, id]
    );

  const chartData = useMemo(
    () =>
      selected
        .map((id) => MODELS.find((m) => m.id === id))
        .filter((m) => m !== undefined)
        .map((mod) => {
          const cls = classById.get(mod.classId)!;
          const b = costBreakdown(cls, mod, scenario, params);
          return {
            name: `${mod.brand} ${mod.model}`,
            Fuel: Number(b.fuel.toFixed(2)),
            Maintenance: Number(b.maintenance.toFixed(2)),
            Operator: Number(b.labor.toFixed(2)),
            total: b.total,
          };
        }),
    [selected, scenario, classById, params]
  );

  const hours = annualHours(scenario, params);

  return (
    <div>
      <PageHeader
        title="Compare Models"
        subtitle={`Up to ${MAX_SELECTION} machines — across brands within a class — by hourly cost stack.`}
        actions={
          <Segmented
            value={scenario}
            onChange={(v) => setScenario(v as Scenario)}
            options={SCENARIOS.map((s) => ({ value: s, label: SCENARIO_LABELS[s] }))}
          />
        }
      />

      <ModuleIntro
        id="compare"
        purpose="A side-by-side cost comparison of up to 5 specific machines — including the same class across different brands."
        edit="Pick machines from the class list below and the duty scenario at the top. Underlying costs are edited in Catalog and Parameters."
        output="A stacked bar of fuel/maintenance/operator per hour, plus annualized totals — to choose between brands or sizes."
        connects="Reads the same Catalog and Parameters as every other module, so a change there updates this instantly."
        formulas={[
          { label: "Bar segments", expr: "fuel + maintenance + operator = $/hr" },
          { label: "Annualized", expr: "$/hr × (weekly hrs × 52)" },
          { label: "Maintenance", expr: "base 2022 × escalation × brand factor" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ParamsPanel />

        <section className="min-w-0 space-y-4">
          {chartData.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.12em] text-inkfaint">
                  USD per hour
                </span>
                <span className="text-xs text-inkfaint">
                  ≈ {hours.toLocaleString()} hrs/yr
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#6c6356", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#e8dfcd" }} />
                  <YAxis tick={{ fill: "#a89e8c", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(176,106,60,0.06)" }}
                    formatter={(value) => usd(Number(value))}
                    contentStyle={{
                      background: "#fffdf9",
                      border: "1px solid #e8dfcd",
                      borderRadius: 12,
                      color: "#2a2620",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
                  <Bar dataKey="Fuel" stackId="a" fill="#5b7c8a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Maintenance" stackId="a" fill="#b06a3c" />
                  <Bar dataKey="Operator" stackId="a" fill="#6f7548" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid gap-1 border-t border-line pt-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {chartData.map((d) => (
                  <div key={d.name} className="flex justify-between gap-3">
                    <span className="text-inksoft">{d.name}</span>
                    <span className="tabular text-ink">
                      {usd(d.total)}/hr · {usd(d.total * hours, 0)}/yr
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {classes.map((cls) => {
              const members = MODELS.filter((m) => m.classId === cls.id);
              if (members.length === 0) return null;
              return (
                <div key={cls.id}>
                  <p className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                    {CATEGORY_LABELS[cls.category]} — {cls.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((mod) => {
                      const active = selected.includes(mod.id);
                      return (
                        <button
                          key={mod.id}
                          onClick={() => toggle(mod.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm transition-colors ${
                            active
                              ? "border-accent bg-accentsoft"
                              : "border-line bg-card hover:border-line-strong"
                          }`}
                        >
                          <BrandBadge brand={mod.brand} />
                          <span className="text-ink">{mod.model}</span>
                          {mod.source === "equivalence" && <EstimateBadge />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
