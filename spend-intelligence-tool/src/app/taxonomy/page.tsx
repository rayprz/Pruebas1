"use client";

import { Button, Card, PageHeader, SectionTitle } from "@/components/ui";
import { useTaxonomy } from "@/lib/taxonomyStore";
import { downloadTemplate } from "@/lib/xlsx";
import type { Category, SpendType, Taxonomy } from "@/lib/types";

export default function TaxonomyPage() {
  const { taxonomy, threshold, setTaxonomy, setThreshold, reset } = useTaxonomy();

  const update = (fn: (draft: Taxonomy) => Taxonomy) => setTaxonomy(fn(structuredClone(taxonomy)));

  function addCategory() {
    const id = `cat-${Date.now()}`;
    update((d) => [...d, { id, name: "New category", type: "indirect", subcategories: [] }]);
  }

  function downloadImportTemplate() {
    downloadTemplate(
      "spend-import-template.xlsx",
      ["date", "vendor", "description", "amount", "currency", "glAccount", "costCenter"],
      [
        ["2026-01-04", "Amazon Web Services", "Monthly cloud hosting", 4210.55, "USD", "6200", "Engineering"],
        ["2026-01-08", "Acme Steel Co", "Cold rolled steel coils", 18450, "USD", "5100", "Production"],
      ],
      [
        { column: "date", note: "Optional. Any date format." },
        { column: "vendor", note: "Required. Supplier / merchant name." },
        { column: "description", note: "Recommended. Free-text memo — drives classification." },
        { column: "amount", note: "Required. Numeric; currency symbols and commas are stripped." },
        { column: "currency", note: "Optional. e.g. USD, EUR." },
        { column: "glAccount", note: "Optional. GL account code." },
        { column: "costCenter", note: "Optional. Department / cost center." },
      ]
    );
  }

  return (
    <div>
      <PageHeader
        title="Taxonomy & Rules"
        subtitle="Edit the curated procurement taxonomy and the keywords the local engine matches on."
        actions={
          <>
            <Button variant="ghost" onClick={downloadImportTemplate}>
              Import template
            </Button>
            <Button variant="ghost" onClick={addCategory}>
              + Category
            </Button>
            <Button variant="danger" onClick={reset}>
              Reset to defaults
            </Button>
          </>
        }
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle>Confidence threshold</SectionTitle>
            <p className="mt-1 text-sm text-inksoft">
              Rows scoring below this are flagged as low-confidence and sent to the AI when you click
              &ldquo;Classify with AI&rdquo;.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-48 accent-[#b06a3c]"
            />
            <span className="w-12 text-right font-display text-xl tabular text-accent">
              {Math.round(threshold * 100)}%
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {taxonomy.map((cat) => (
          <CategoryEditor key={cat.id} cat={cat} onChange={update} />
        ))}
      </div>
    </div>
  );
}

function CategoryEditor({
  cat,
  onChange,
}: {
  cat: Category;
  onChange: (fn: (draft: Taxonomy) => Taxonomy) => void;
}) {
  const patchCat = (patch: Partial<Category>) =>
    onChange((d) => d.map((c) => (c.id === cat.id ? { ...c, ...patch } : c)));

  const removeCat = () => onChange((d) => d.filter((c) => c.id !== cat.id));

  const addSub = () =>
    patchCat({
      subcategories: [
        ...cat.subcategories,
        { id: `sub-${Date.now()}`, name: "New subcategory", keywords: [] },
      ],
    });

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={cat.name}
          onChange={(e) => patchCat({ name: e.target.value })}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 font-display text-lg text-ink focus:border-accent focus:outline-none"
        />
        <select
          value={cat.type}
          onChange={(e) => patchCat({ type: e.target.value as SpendType })}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="direct">Direct</option>
          <option value="indirect">Indirect</option>
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={addSub}>
            + Subcategory
          </Button>
          <Button variant="danger" onClick={removeCat}>
            Remove
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {cat.subcategories.map((sub) => (
          <div
            key={sub.id}
            className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-panel/40 p-2.5 sm:grid-cols-[200px_1fr_auto]"
          >
            <input
              value={sub.name}
              onChange={(e) =>
                patchCat({
                  subcategories: cat.subcategories.map((s) =>
                    s.id === sub.id ? { ...s, name: e.target.value } : s
                  ),
                })
              }
              className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
            />
            <input
              value={sub.keywords.join(", ")}
              placeholder="keywords, comma separated"
              onChange={(e) =>
                patchCat({
                  subcategories: cat.subcategories.map((s) =>
                    s.id === sub.id
                      ? { ...s, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) }
                      : s
                  ),
                })
              }
              className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-inksoft focus:border-accent focus:outline-none"
            />
            <Button
              variant="danger"
              onClick={() =>
                patchCat({ subcategories: cat.subcategories.filter((s) => s.id !== sub.id) })
              }
            >
              ✕
            </Button>
          </div>
        ))}
        {cat.subcategories.length === 0 && (
          <p className="px-1 text-xs text-inkfaint">No subcategories yet — add one.</p>
        )}
      </div>
    </Card>
  );
}
