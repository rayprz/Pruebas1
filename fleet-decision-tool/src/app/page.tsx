"use client";

import { useMemo, useState } from "react";
import { BRANDS, CATEGORY_LABELS, MODELS } from "@/data/catalog";
import {
  SCENARIOS,
  SCENARIO_LABELS,
  costBreakdown,
  laborCostPerHr,
  usd,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import type { Brand, Category } from "@/lib/types";
import { BrandBadge, EstimateBadge } from "@/components/BrandBadge";
import { ParamsPanel } from "@/components/ParamsPanel";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { Card, PageHeader, Pill } from "@/components/ui";

const FORMULAS = [
  { label: "Fuel $/hr", expr: "gal/hr × diesel $/gal" },
  { label: "Maintenance $/hr", expr: "base 2022 × escalation × brand factor" },
  { label: "Operator $/hr", expr: "(base hrs×rate + OT hrs×OT rate)\n  × (1+benefits) ÷ weekly hrs" },
  { label: "Total $/hr", expr: "fuel + maintenance + operator" },
];

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function CalculatorPage() {
  const { params } = useParams();
  const { classById } = useCatalog();
  const [category, setCategory] = useState<Category>("wheel-loader");
  const [activeBrands, setActiveBrands] = useState<Set<Brand>>(new Set(BRANDS));

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
    <div>
      <PageHeader
        title="Cost Calculator"
        subtitle="Hourly operating cost — fuel + maintenance & service + operator — by duty scenario."
      />

      <ModuleIntro
        id="calculator"
        purpose="The hourly operating cost of any machine in the catalog, multi-brand, under three duty scenarios (Low / Medium / High)."
        edit="The Parameters panel on the left: diesel price, operator wages, utilization and brand factors. Cost data per model lives in Catalog."
        output="Cost per hour split into fuel + maintenance + operator, per model — your benchmark for budgeting and bids."
        connects="Uses the editable Catalog data. The same engine powers Compare, My Fleet, CAPEX and Sites."
        formulas={FORMULAS}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ParamsPanel />

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  category === c
                    ? "bg-accent font-semibold text-card"
                    : "border border-line bg-card text-inksoft hover:text-ink"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.12em] text-inkfaint">
              Brands
            </span>
            {BRANDS.map((b) => (
              <Pill key={b} active={activeBrands.has(b)} onClick={() => toggleBrand(b)}>
                {b}
              </Pill>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                    <th className="px-4 py-3 font-semibold">Model</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Fuel gal/hr
                      <InfoTip title="Fuel burn" formula="moderate–severe gal/hr (from Catalog)" align="right" />
                    </th>
                    {SCENARIOS.map((s, i) => (
                      <th key={s} className="px-4 py-3 text-right font-semibold">
                        {SCENARIO_LABELS[s]} $/hr
                        <InfoTip
                          title={`${SCENARIO_LABELS[s]} total $/hr`}
                          formula="fuel + maintenance + operator"
                          align="right"
                        >
                          {i === 1 ? "Average duty at the medium weekly schedule." : i === 0 ? "Moderate duty, low weekly hours." : "Severe duty, high weekly hours."}
                        </InfoTip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ mod, cls, scenarios }) => (
                    <tr
                      key={mod.id}
                      className="border-b border-line/60 last:border-0 hover:bg-panel/50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <BrandBadge brand={mod.brand} />
                          <span className="font-medium text-ink">{mod.model}</span>
                          {mod.source === "equivalence" && <EstimateBadge />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-inksoft">{cls.name}</td>
                      <td className="px-4 py-2.5 text-right tabular text-inksoft">
                        {cls.fuelGalPerHr.moderate}–{cls.fuelGalPerHr.severe}
                      </td>
                      {scenarios.map((b, i) => (
                        <td
                          key={i}
                          className={`px-4 py-2.5 text-right tabular ${
                            i === 1 ? "font-semibold text-accent" : "text-ink"
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
                      <td colSpan={6} className="px-4 py-10 text-center text-inkfaint">
                        No models match the selected brands.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-inkfaint">
            Operator cost: {usd(laborCostPerHr("low", params))}/hr (Low) ·{" "}
            {usd(laborCostPerHr("medium", params))}/hr (Medium) ·{" "}
            {usd(laborCostPerHr("high", params))}/hr (High). Hover a total for the
            fuel / maintenance / labor split. “est” = costs inherited from the
            class reference.
          </p>
        </section>
      </div>
    </div>
  );
}
