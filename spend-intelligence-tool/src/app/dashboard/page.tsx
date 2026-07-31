"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { useTaxonomy } from "@/lib/taxonomyStore";
import { useSpend } from "@/lib/spendStore";
import { categoryName, spendTypeOf, subcategoryName } from "@/lib/classifier";
import { downloadSheets } from "@/lib/xlsx";

const COLORS = ["#b06a3c", "#6f7548", "#5b7c8a", "#c08a44", "#b07a8c", "#93532b", "#8a9a5b", "#7a94a0"];

export default function DashboardPage() {
  const { taxonomy } = useTaxonomy();
  const { transactions } = useSpend();

  const model = useMemo(() => {
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const classifiedTxs = transactions.filter((t) => t.classification.categoryId);
    const autoTxs = transactions.filter(
      (t) => t.classification.source === "rule" || t.classification.source === "ai"
    );

    const byCategory = new Map<string, number>();
    const bySub = new Map<string, { key: string; category: string; sub: string; amount: number }>();
    let direct = 0;
    let indirect = 0;

    for (const t of classifiedTxs) {
      const cid = t.classification.categoryId!;
      byCategory.set(cid, (byCategory.get(cid) ?? 0) + t.amount);
      const subKey = `${cid}::${t.classification.subcategoryId ?? "none"}`;
      const prev = bySub.get(subKey);
      const label = subcategoryName(taxonomy, cid, t.classification.subcategoryId);
      if (prev) prev.amount += t.amount;
      else bySub.set(subKey, { key: subKey, category: categoryName(taxonomy, cid), sub: label, amount: t.amount });

      const type = spendTypeOf(taxonomy, cid);
      if (type === "direct") direct += t.amount;
      else if (type === "indirect") indirect += t.amount;
    }

    const categoryRows = [...byCategory.entries()]
      .map(([id, amount]) => ({ id, name: categoryName(taxonomy, id), amount }))
      .sort((a, b) => b.amount - a.amount);

    const subRows = [...bySub.values()].sort((a, b) => b.amount - a.amount);

    return {
      total,
      classifiedTotal: classifiedTxs.reduce((s, t) => s + t.amount, 0),
      autoPct: transactions.length ? Math.round((autoTxs.length / transactions.length) * 100) : 0,
      categoryRows,
      subRows,
      direct,
      indirect,
    };
  }, [transactions, taxonomy]);

  function exportXlsx() {
    const money = (n: number) => Math.round(n * 100) / 100;
    downloadSheets("spend-by-category.xlsx", [
      {
        name: "By Category",
        rows: [
          ["Category", "Spend"],
          ...model.categoryRows.map((r) => [r.name, money(r.amount)]),
        ],
      },
      {
        name: "By Subcategory",
        rows: [
          ["Category", "Subcategory", "Spend"],
          ...model.subRows.map((r) => [r.category, r.sub, money(r.amount)]),
        ],
      },
      {
        name: "Transactions",
        rows: [
          ["Date", "Vendor", "Description", "Amount", "Category", "Subcategory", "Confidence", "Source"],
          ...transactions.map((t) => [
            t.date,
            t.vendor,
            t.description,
            money(t.amount),
            categoryName(taxonomy, t.classification.categoryId),
            subcategoryName(taxonomy, t.classification.categoryId, t.classification.subcategoryId),
            Math.round(t.classification.confidence * 100) / 100,
            t.classification.source,
          ]),
        ],
      },
    ]);
  }

  if (transactions.length === 0) {
    return (
      <div>
        <PageHeader title="Spend Dashboard" subtitle="Spend segmented by category and subcategory." />
        <Card className="p-10 text-center">
          <p className="font-display text-2xl text-ink">Nothing to show yet</p>
          <p className="mt-2 text-sm text-inksoft">Import and classify expenses first.</p>
        </Card>
      </div>
    );
  }

  const directIndirect = [
    { name: "Direct", value: model.direct },
    { name: "Indirect", value: model.indirect },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Spend Dashboard"
        subtitle="Spend segmented by category and subcategory — the base for your procurement strategy."
        actions={<Button onClick={exportXlsx}>Export XLSX</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total spend" value={money(model.total)} tone="accent" />
        <StatCard label="Classified spend" value={money(model.classifiedTotal)} tone="olive" />
        <StatCard label="Categories" value={model.categoryRows.length} />
        <StatCard label="Auto-classified" value={`${model.autoPct}%`} tone="gold" sub="rule + AI" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle className="mb-3">Spend by category</SectionTitle>
          <ResponsiveContainer width="100%" height={Math.max(220, model.categoryRows.length * 34)}>
            <BarChart data={model.categoryRows} layout="vertical" margin={{ left: 16, right: 24 }}>
              <XAxis type="number" tickFormatter={money} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {model.categoryRows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <SectionTitle className="mb-3">Direct vs Indirect</SectionTitle>
          {directIndirect.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={directIndirect} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {directIndirect.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#b06a3c" : "#6f7548"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1 text-sm">
                <Legend color="#b06a3c" label="Direct" value={money(model.direct)} />
                <Legend color="#6f7548" label="Indirect" value={money(model.indirect)} />
              </div>
            </>
          ) : (
            <p className="text-sm text-inksoft">No classified spend yet.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <SectionTitle>Spend by subcategory</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Subcategory</th>
                <th className="px-4 py-2.5 text-right">Spend</th>
                <th className="px-4 py-2.5 text-right">% of total</th>
              </tr>
            </thead>
            <tbody>
              {model.subRows.map((r) => (
                <tr key={r.key} className="border-b border-line/60">
                  <td className="px-4 py-2 text-inksoft">{r.category}</td>
                  <td className="px-4 py-2 font-medium text-ink">{r.sub}</td>
                  <td className="px-4 py-2 text-right tabular text-ink">{money(r.amount)}</td>
                  <td className="px-4 py-2 text-right tabular text-inkfaint">
                    {model.total ? ((r.amount / model.total) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-inksoft">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular text-ink">{value}</span>
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
