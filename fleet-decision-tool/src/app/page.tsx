"use client";

import { useMemo, useState } from "react";
import {
  BRANDS,
  CATEGORY_LABELS,
  EQUIVALENCE_CLASSES,
  MODELS,
} from "@/data/catalog";
import {
  SCENARIOS,
  SCENARIO_LABELS,
  costBreakdown,
  laborCostPerHr,
  usd,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import type { Brand, Category } from "@/lib/types";
import { BrandBadge, EstimateBadge } from "@/components/BrandBadge";
import { ParamsPanel } from "@/components/ParamsPanel";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function CalculatorPage() {
  const { params } = useParams();
  const [category, setCategory] = useState<Category>("wheel-loader");
  const [activeBrands, setActiveBrands] = useState<Set<Brand>>(
    new Set(BRANDS)
  );

  const classById = useMemo(
    () => new Map(EQUIVALENCE_CLASSES.map((c) => [c.id, c])),
    []
  );

  const rows = useMemo(() => {
    return MODELS.filter((mod) => {
      const cls = classById.get(mod.classId);
      return cls?.category === category && activeBrands.has(mod.brand);
    }).map((mod) => {
      const cls = classById.get(mod.classId)!;
      return {
        mod,
        cls,
        scenarios: SCENARIOS.map((s) => costBreakdown(cls, mod, s, params)),
      };
    });
  }, [category, activeBrands, classById, params]);

  const toggleBrand = (b: Brand) =>
    setActiveBrands((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ParamsPanel />

      <section className="min-w-0 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Operating Cost per Hour</h1>
          <p className="text-sm text-slate-400">
            Fuel + maintenance &amp; service + operator, by duty scenario.
            Operator cost: {usd(laborCostPerHr("low", params))}/hr (Low) ·{" "}
            {usd(laborCostPerHr("medium", params))}/hr (Medium) ·{" "}
            {usd(laborCostPerHr("high", params))}/hr (High).
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                category === c
                  ? "bg-yellow-400 font-semibold text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Brands:
          </span>
          {BRANDS.map((b) => (
            <button
              key={b}
              onClick={() => toggleBrand(b)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                activeBrands.has(b)
                  ? "border-slate-500 bg-slate-800 text-white"
                  : "border-slate-800 text-slate-600 hover:text-slate-400"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/70 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2 text-right">Fuel gal/hr</th>
                <th className="px-3 py-2 text-right">Maint $/hr</th>
                {SCENARIOS.map((s) => (
                  <th key={s} className="px-3 py-2 text-right">
                    {SCENARIO_LABELS[s]} $/hr
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ mod, cls, scenarios }) => (
                <tr
                  key={mod.id}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <BrandBadge brand={mod.brand} />
                      <span className="font-semibold">{mod.model}</span>
                      {mod.source === "equivalence" && <EstimateBadge />}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{cls.name}</td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {cls.fuelGalPerHr.moderate}–{cls.fuelGalPerHr.severe}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {usd(scenarios[0].maintenance)}–{usd(scenarios[2].maintenance)}
                  </td>
                  {scenarios.map((b, i) => (
                    <td
                      key={i}
                      className={`px-3 py-2 text-right tabular-nums ${
                        i === 1 ? "font-semibold text-yellow-300" : ""
                      }`}
                      title={`Fuel ${usd(b.fuel)} + Maint ${usd(
                        b.maintenance
                      )} + Labor ${usd(b.labor)}`}
                    >
                      {usd(b.total)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No models match the selected brands.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Hover a total to see the fuel / maintenance / labor split. Medium
          scenario highlighted. Models marked “est” inherit costs from their
          equivalence class.
        </p>
      </section>
    </div>
  );
}
