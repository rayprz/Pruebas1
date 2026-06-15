"use client";

import { useQuarry } from "@/lib/quarryStore";
import { usePeriod, PERIOD_OPTIONS } from "@/lib/periodStore";
import { Select } from "./ui";

export function Topbar() {
  const { quarries, activeQuarryId, setActiveQuarry } = useQuarry();
  const { period, setPeriod } = usePeriod();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-6 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-base font-semibold text-ink">
          Fleet Decision Tool
        </span>
        <span className="hidden text-xs text-inkfaint sm:inline">
          Multi-brand owning &amp; operating cost
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-inkfaint">
        <Select value={period} onChange={(v) => setPeriod(v)} options={PERIOD_OPTIONS} />
        <span className="hidden sm:inline">·</span>
        <Select
          value={activeQuarryId}
          onChange={setActiveQuarry}
          options={quarries.map((q) => ({ value: q.id, label: `${q.name} · ${q.region}` }))}
        />
      </div>
    </header>
  );
}
