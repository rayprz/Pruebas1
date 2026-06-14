"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABELS, MODELS, PASS_MATCH } from "@/data/catalog";
import { usdCompact } from "@/lib/engine";
import { useCatalog } from "@/lib/catalogStore";
import type { Category, EquivalenceClass } from "@/lib/types";
import { BrandBadge } from "@/components/BrandBadge";
import { ModuleIntro } from "@/components/ModuleIntro";
import { Button, Card, NumberField, PageHeader, SectionTitle } from "@/components/ui";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function CatalogPage() {
  const { classes, updateClass, resetClass, resetAll, isOverridden } = useCatalog();
  const [expanded, setExpanded] = useState<string | null>(null);

  const membersByClass = useMemo(() => {
    const map = new Map<string, typeof MODELS>();
    for (const mod of MODELS) {
      const list = map.get(mod.classId) ?? [];
      list.push(mod);
      map.set(mod.classId, list);
    }
    return map;
  }, []);

  const overriddenCount = classes.filter((c) => isOverridden(c.id)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catalog & Equivalences"
        subtitle="The editable source of truth for every machine. Change a value here and every module recalculates."
        actions={
          overriddenCount > 0 ? (
            <Button variant="ghost" onClick={resetAll}>
              Reset all ({overriddenCount})
            </Button>
          ) : undefined
        }
      />

      <ModuleIntro
        id="catalog"
        purpose="The master list of machine classes (multi-brand), with the cost and capital data behind every calculation."
        edit="Click any class to edit fuel burn, maintenance $/hr, new price, life hours, overhaul interval/cost and salvage value."
        output="A single, consistent data set. The 2022 OEM figures are the starting point; your edits override them and persist."
        connects="Feeds Cost Calculator, Compare, My Fleet, CAPEX and Sites — everything reads these numbers."
      />

      {CATEGORIES.map((cat) => {
        const list = classes.filter((c) => c.category === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <SectionTitle>{CATEGORY_LABELS[cat]}</SectionTitle>
            <div className="space-y-2">
              {list.map((cls) => {
                const members = membersByClass.get(cls.id) ?? [];
                const open = expanded === cls.id;
                return (
                  <Card key={cls.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpanded(open ? null : cls.id)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-panel/50"
                    >
                      <span className="flex-1">
                        <span className="font-medium text-ink">{cls.name}</span>
                        {isOverridden(cls.id) && (
                          <span className="ml-2 rounded-full bg-accentsoft px-1.5 py-0.5 text-[10px] font-medium text-accentink">
                            edited
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap gap-1">
                          {members.slice(0, 6).map((m) => (
                            <span key={m.id} className="inline-flex items-center gap-1">
                              <BrandBadge brand={m.brand} />
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="hidden text-right text-sm text-inksoft sm:block">
                        <span className="tabular">{cls.acquisitionUsd ? usdCompact(cls.acquisitionUsd) : "—"}</span>
                        <span className="block text-xs text-inkfaint">
                          fuel {cls.fuelGalPerHr.moderate}–{cls.fuelGalPerHr.severe} gal/hr
                        </span>
                      </span>
                      <span className="text-inkfaint">{open ? "−" : "+"}</span>
                    </button>

                    {open && (
                      <ClassEditor
                        cls={cls}
                        onChange={(patch) => updateClass(cls.id, patch)}
                        onReset={() => resetClass(cls.id)}
                        overridden={isOverridden(cls.id)}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="space-y-3">
        <SectionTitle>Loader ↔ Truck Pass Match</SectionTitle>
        <p className="text-sm text-inksoft">
          Reference for fleet sizing — passes to fill each truck. Class numbers
          apply to any brand equivalent.
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          {PASS_MATCH.map((table) => (
            <Card key={table.title} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                      <th className="px-4 py-3 font-semibold">{table.title}</th>
                      {table.loaders.map((l) => (
                        <th key={l} className="px-3 py-3 text-center font-semibold">{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.truck} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-2 font-medium text-inksoft">{row.truck}</td>
                        {row.passes.map((p, i) => (
                          <td key={i} className={`px-3 py-2 text-center tabular ${p ? "text-accent" : "text-line-strong"}`}>
                            {p ?? "·"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note && (
                <p className="border-t border-line px-4 py-2 text-xs text-inkfaint">{table.note}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassEditor({
  cls,
  onChange,
  onReset,
  overridden,
}: {
  cls: EquivalenceClass;
  onChange: (patch: Partial<EquivalenceClass>) => void;
  onReset: () => void;
  overridden: boolean;
}) {
  return (
    <div className="border-t border-line bg-panel/30 p-4">
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">Fuel — gal/hr</p>
          <NumberField label="Moderate" step={0.1} value={cls.fuelGalPerHr.moderate} onChange={(v) => onChange({ fuelGalPerHr: { ...cls.fuelGalPerHr, moderate: v } })} />
          <NumberField label="Average" step={0.1} value={cls.fuelGalPerHr.average} onChange={(v) => onChange({ fuelGalPerHr: { ...cls.fuelGalPerHr, average: v } })} />
          <NumberField label="Severe" step={0.1} value={cls.fuelGalPerHr.severe} onChange={(v) => onChange({ fuelGalPerHr: { ...cls.fuelGalPerHr, severe: v } })} />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">Maintenance — $/hr (500-hr)</p>
          <NumberField label="Moderate" suffix="$/hr" step={0.5} value={cls.maint500.moderate} onChange={(v) => onChange({ maint500: { ...cls.maint500, moderate: v } })} />
          <NumberField label="Average" suffix="$/hr" step={0.5} value={cls.maint500.average} onChange={(v) => onChange({ maint500: { ...cls.maint500, average: v } })} />
          <NumberField label="Severe" suffix="$/hr" step={0.5} value={cls.maint500.severe} onChange={(v) => onChange({ maint500: { ...cls.maint500, severe: v } })} />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">Capital & life</p>
          <NumberField label="New price" suffix="USD" step={10000} value={cls.acquisitionUsd ?? 0} onChange={(v) => onChange({ acquisitionUsd: v })} />
          <NumberField label="Life" suffix="hrs" step={1000} value={cls.lifeHours ?? 0} onChange={(v) => onChange({ lifeHours: v })} />
          <NumberField label="Overhaul at" suffix="hrs" step={1000} value={cls.overhaulHours ?? 0} onChange={(v) => onChange({ overhaulHours: v })} />
          <NumberField label="Overhaul cost" suffix="× new" step={0.01} value={cls.overhaulCostPct ?? 0} onChange={(v) => onChange({ overhaulCostPct: v })} />
          <NumberField label="Salvage" suffix="× new" step={0.01} value={cls.salvagePct ?? 0} onChange={(v) => onChange({ salvagePct: v })} />
        </div>
      </div>
      {overridden && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onReset}>Reset to 2022 baseline</Button>
        </div>
      )}
    </div>
  );
}
