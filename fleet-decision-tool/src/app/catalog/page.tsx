"use client";

import { useMemo } from "react";
import {
  BRANDS,
  CATEGORY_LABELS,
  EQUIVALENCE_CLASSES,
  MODELS,
  PASS_MATCH,
} from "@/data/catalog";
import type { Category } from "@/lib/types";
import { BrandBadge } from "@/components/BrandBadge";

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
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Catalog &amp; Brand Equivalences</h1>
          <p className="text-sm text-slate-400">
            Each row is a size/duty class. The Caterpillar reference model
            carries the 2022 OEM cost baseline; other brands are interchangeable
            equivalents for costing and fleet matching.
          </p>
        </div>

        {CATEGORIES.map((cat) => {
          const classes = EQUIVALENCE_CLASSES.filter((c) => c.category === cat);
          if (classes.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-300">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/70 text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Class</th>
                      {BRANDS.map((b) => (
                        <th key={b} className="px-3 py-2">
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
                          className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40"
                        >
                          <td className="px-3 py-2 font-medium text-slate-200">
                            {cls.name}
                            {cls.payloadTons ? (
                              <span className="ml-1 text-xs text-slate-500">
                                {cls.payloadTons} T
                              </span>
                            ) : null}
                          </td>
                          {BRANDS.map((b) => {
                            const found = members.filter((m) => m.brand === b);
                            return (
                              <td key={b} className="px-3 py-2">
                                {found.length > 0 ? (
                                  <span
                                    className={
                                      found.some((f) => f.source === "oem")
                                        ? "font-semibold text-yellow-200"
                                        : "text-slate-300"
                                    }
                                  >
                                    {found.map((f) => f.model).join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-slate-700">—</span>
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
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-yellow-200">Bold yellow</span> =
          reference model with OEM cost data. Brand legend:
          {BRANDS.map((b) => (
            <BrandBadge key={b} brand={b} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Loader ↔ Truck Pass Match</h2>
          <p className="text-sm text-slate-400">
            Passes required to load each truck — the basis for fleet sizing
            (Sites &amp; Production phase). Class numbers apply to any brand
            equivalent.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {PASS_MATCH.map((table) => (
            <div
              key={table.title}
              className="overflow-x-auto rounded-xl border border-slate-800"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/70 text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">{table.title}</th>
                    {table.loaders.map((l) => (
                      <th key={l} className="px-3 py-2 text-center">
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr
                      key={row.truck}
                      className="border-b border-slate-800/60 last:border-0"
                    >
                      <td className="px-3 py-1.5 font-medium text-slate-300">
                        {row.truck}
                      </td>
                      {row.passes.map((p, i) => (
                        <td
                          key={i}
                          className={`px-3 py-1.5 text-center tabular-nums ${
                            p ? "text-yellow-200" : "text-slate-800"
                          }`}
                        >
                          {p ?? "·"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.note && (
                <p className="border-t border-slate-800 px-3 py-1.5 text-xs text-slate-500">
                  {table.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
