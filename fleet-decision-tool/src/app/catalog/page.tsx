"use client";

import { useMemo } from "react";
import {
  BRANDS,
  CATEGORY_LABELS,
  EQUIVALENCE_CLASSES,
  MODELS,
  PASS_MATCH,
} from "@/data/catalog";
import { usdCompact } from "@/lib/engine";
import type { Category } from "@/lib/types";
import { BrandBadge } from "@/components/BrandBadge";
import { Card, PageHeader, SectionTitle } from "@/components/ui";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export default function CatalogPage() {
  const membersByClass = useMemo(() => {
    const map = new Map<string, typeof MODELS>();
    for (const mod of MODELS) {
      const list = map.get(mod.classId) ?? [];
      list.push(mod);
      map.set(mod.classId, list);
    }
    return map;
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catalog & Equivalences"
        subtitle="Each row is a size/duty class. The Caterpillar reference carries the 2022 OEM cost data; other brands are interchangeable equivalents."
      />

      {CATEGORIES.map((cat) => {
        const classes = EQUIVALENCE_CLASSES.filter((c) => c.category === cat);
        if (classes.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <SectionTitle>{CATEGORY_LABELS[cat]}</SectionTitle>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                      <th className="px-4 py-3 font-semibold">Class</th>
                      <th className="px-4 py-3 text-right font-semibold">New ≈</th>
                      {BRANDS.map((b) => (
                        <th key={b} className="px-4 py-3 font-semibold">
                          {b}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => {
                      const members = membersByClass.get(cls.id) ?? [];
                      return (
                        <tr
                          key={cls.id}
                          className="border-b border-line/60 last:border-0 hover:bg-panel/50"
                        >
                          <td className="px-4 py-2.5 font-medium text-ink">
                            {cls.name}
                            {cls.payloadTons ? (
                              <span className="ml-1 text-xs text-inkfaint">
                                {cls.payloadTons} T
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular text-inksoft">
                            {cls.acquisitionUsd ? usdCompact(cls.acquisitionUsd) : "—"}
                          </td>
                          {BRANDS.map((b) => {
                            const found = members.filter((m) => m.brand === b);
                            return (
                              <td key={b} className="px-4 py-2.5">
                                {found.length > 0 ? (
                                  <span
                                    className={
                                      found.some((f) => f.source === "oem")
                                        ? "font-semibold text-accent"
                                        : "text-inksoft"
                                    }
                                  >
                                    {found.map((f) => f.model).join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-line-strong">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 text-xs text-inkfaint">
        <span className="font-semibold text-accent">Accent</span> = reference model
        with OEM cost data. “New ≈” is an editable estimate. Brands:
        {BRANDS.map((b) => (
          <BrandBadge key={b} brand={b} />
        ))}
      </div>

      <div className="space-y-3">
        <SectionTitle>Loader ↔ Truck Pass Match</SectionTitle>
        <p className="text-sm text-inksoft">
          Passes to fill each truck — the basis for fleet sizing. Class numbers
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
                        <th key={l} className="px-3 py-3 text-center font-semibold">
                          {l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.truck} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-2 font-medium text-inksoft">{row.truck}</td>
                        {row.passes.map((p, i) => (
                          <td
                            key={i}
                            className={`px-3 py-2 text-center tabular ${
                              p ? "text-accent" : "text-line-strong"
                            }`}
                          >
                            {p ?? "·"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note && (
                <p className="border-t border-line px-4 py-2 text-xs text-inkfaint">
                  {table.note}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
