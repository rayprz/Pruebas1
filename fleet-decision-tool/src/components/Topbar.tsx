"use client";

import { useQuarry } from "@/lib/quarryStore";
import { PeriodPicker } from "./PeriodPicker";
import { MultiSelect } from "./Popover";

export function Topbar() {
  const { quarries, selectedQuarryIds, setSelectedQuarries } = useQuarry();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-6 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-base font-semibold text-ink">
          Fleet Decision Tool
        </span>
        <span className="hidden text-xs text-inkfaint sm:inline">
          Multi-brand owning &amp; operating cost
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-inkfaint">
        <PeriodPicker />
        <span className="hidden sm:inline">·</span>
        <MultiSelect
          options={quarries.map((q) => ({ value: q.id, label: q.name, hint: q.region }))}
          selected={selectedQuarryIds}
          onChange={setSelectedQuarries}
          allLabel="All quarries"
          noun="quarries"
        />
      </div>
    </header>
  );
}
