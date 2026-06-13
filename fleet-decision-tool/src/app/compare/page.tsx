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
import { CATEGORY_LABELS, EQUIVALENCE_CLASSES, MODELS } from "@/data/catalog";
import {
  SCENARIOS,
  SCENARIO_LABELS,
  annualHours,
  costBreakdown,
  usd,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import type { Scenario } from "@/lib/types";
import { BrandBadge, EstimateBadge } from "@/components/BrandBadge";
import { ParamsPanel } from "@/components/ParamsPanel";

const MAX_SELECTION = 5;

export default function ComparePage() {
  const { params } = useParams();
  const [scenario, setScenario] = useState<Scenario>("medium");
  const [selected, setSelected] = useState<string[]>([
    "cat-980m",
    "km-wa500",
    "vo-l220",
    "jd-844",
  ]);

  const classById = useMemo(
    () => new Map(EQUIVALENCE_CLASSES.map((c) => [c.id, c])),
    []
  );

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
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <ParamsPanel />
      </div>

      <section className="min-w-0 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Compare Models</h1>
          <p className="text-sm text-slate-400">
            Pick up to {MAX_SELECTION} machines — including across brands within
            an equivalence class — and compare the hourly cost stack.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Scenario:
          </span>
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`rounded-md px-3 py-1 text-sm ${
                scenario === s
                  ? "bg-yellow-400 font-semibold text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {SCENARIO_LABELS[s]}
            </button>
          ))}
          <span className="text-xs text-slate-500">
            ≈ {hours.toLocaleString()} hrs/yr
          </span>
        </div>

        {chartData.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  label={{
                    value: "USD / hr",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                  }}
                />
                <Tooltip
                  formatter={(value) => usd(Number(value))}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    color: "#f1f5f9",
                  }}
                />
                <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                <Bar dataKey="Fuel" stackId="a" fill="#38bdf8" />
                <Bar dataKey="Maintenance" stackId="a" fill="#facc15" />
                <Bar dataKey="Operator" stackId="a" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {chartData.map((d) => (
                <div key={d.name} className="flex justify-between gap-3">
                  <span className="text-slate-400">{d.name}</span>
                  <span className="tabular-nums">
                    {usd(d.total)}/hr · {usd(d.total * hours, 0)}/yr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {EQUIVALENCE_CLASSES.map((cls) => {
            const members = MODELS.filter((m) => m.classId === cls.id);
            if (members.length === 0) return null;
            return (
              <div
                key={cls.id}
                className="rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2"
              >
                <p className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">
                  {CATEGORY_LABELS[cls.category]} — {cls.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((mod) => {
                    const active = selected.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggle(mod.id)}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${
                          active
                            ? "border-yellow-400 bg-yellow-400/10"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <BrandBadge brand={mod.brand} />
                        <span>{mod.model}</span>
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
  );
}
