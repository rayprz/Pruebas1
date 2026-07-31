"use client";

import { useSpend } from "@/lib/spendStore";

export function Topbar() {
  const { transactions } = useSpend();
  const classified = transactions.filter(
    (t) => t.classification.source !== "unclassified"
  ).length;
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-6 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-base font-semibold text-ink">
          Spend Intelligence
        </span>
        <span className="hidden text-xs text-inkfaint sm:inline">
          Classify &amp; segment company spend for procurement strategy
        </span>
      </div>
      <div className="text-xs text-inkfaint">
        {transactions.length > 0 && (
          <span className="tabular">
            {classified}/{transactions.length} classified
          </span>
        )}
      </div>
    </header>
  );
}
