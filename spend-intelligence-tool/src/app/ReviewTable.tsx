"use client";

import { Card } from "@/components/ui";
import { useTaxonomy } from "@/lib/taxonomyStore";
import { useSpend } from "@/lib/spendStore";
import type { ClassificationSource, Transaction } from "@/lib/types";

const SOURCE_STYLES: Record<ClassificationSource, string> = {
  rule: "bg-olivesoft text-olive",
  ai: "bg-accentsoft text-accentink",
  manual: "bg-[#dfe6ea] text-blue",
  unclassified: "bg-dangersoft text-danger",
};

export function ReviewTable() {
  const { taxonomy, threshold } = useTaxonomy();
  const { transactions, correct } = useSpend();

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Vendor</th>
              <th className="px-3 py-2.5">Description</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Subcategory</th>
              <th className="px-3 py-2.5 text-right">Conf.</th>
              <th className="px-3 py-2.5">Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <Row key={t.id} tx={t} threshold={threshold} taxonomy={taxonomy} onCorrect={correct} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Row({
  tx,
  threshold,
  taxonomy,
  onCorrect,
}: {
  tx: Transaction;
  threshold: number;
  taxonomy: ReturnType<typeof useTaxonomy>["taxonomy"];
  onCorrect: (txId: string, categoryId: string, subcategoryId: string | null) => void;
}) {
  const cls = tx.classification;
  const cat = taxonomy.find((c) => c.id === cls.categoryId);
  const low = cls.source === "unclassified" || cls.confidence < threshold;

  return (
    <tr className={`border-b border-line/60 ${low ? "bg-[#fbf6ec]" : ""}`}>
      <td className="px-3 py-2 text-xs text-inkfaint">{tx.date || "—"}</td>
      <td className="px-3 py-2 font-medium text-ink">{tx.vendor || "—"}</td>
      <td className="max-w-[220px] truncate px-3 py-2 text-inksoft" title={tx.description}>
        {tx.description || "—"}
      </td>
      <td className="px-3 py-2 text-right tabular text-ink">
        {tx.amount.toLocaleString(undefined, { style: "currency", currency: tx.currency || "USD" })}
      </td>
      <td className="px-3 py-2">
        <select
          value={cls.categoryId ?? ""}
          onChange={(e) => {
            const newCat = e.target.value;
            const firstSub = taxonomy.find((c) => c.id === newCat)?.subcategories[0]?.id ?? null;
            onCorrect(tx.id, newCat, firstSub);
          }}
          className="max-w-[150px] rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
        >
          <option value="">— Unclassified —</option>
          {taxonomy.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={cls.subcategoryId ?? ""}
          disabled={!cat}
          onChange={(e) => cls.categoryId && onCorrect(tx.id, cls.categoryId, e.target.value || null)}
          className="max-w-[150px] rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none disabled:opacity-40"
        >
          <option value="">—</option>
          {cat?.subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-right tabular text-xs">
        {cls.source === "unclassified" ? (
          <span className="text-inkfaint">—</span>
        ) : (
          <span className={low ? "text-gold" : "text-olive"}>{Math.round(cls.confidence * 100)}%</span>
        )}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${SOURCE_STYLES[cls.source]}`}
          title={cls.rationale ?? ""}
        >
          {cls.source}
        </span>
      </td>
    </tr>
  );
}
