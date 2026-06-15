"use client";

import {
  HISTORY_MONTHS,
  PRESET_OPTIONS,
  periodLabel,
  usePeriod,
  type Preset,
} from "@/lib/periodStore";
import { Popover } from "./Popover";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Global time filter: relative presets plus an explicit month/year grid. */
export function PeriodPicker() {
  const { period, setPreset, setMonths, toggleMonth } = usePeriod();

  const years = [...new Set(HISTORY_MONTHS.map((m) => m.slice(0, 4)))].sort();
  const selected = new Set(period.mode === "custom" ? period.months : []);

  const yearMonths = (y: string) => HISTORY_MONTHS.filter((m) => m.startsWith(y));
  const yearAllSelected = (y: string) => yearMonths(y).every((m) => selected.has(m));
  const toggleYear = (y: string) => {
    const ms = yearMonths(y);
    if (ms.every((m) => selected.has(m))) {
      setMonths([...selected].filter((m) => !ms.includes(m)));
    } else {
      setMonths([...new Set([...selected, ...ms])]);
    }
  };

  return (
    <Popover
      align="right"
      panelClassName="w-72"
      trigger={<span className="font-medium">{periodLabel(period)}</span>}
    >
      {() => (
        <div>
          <div className="mb-2 flex flex-wrap gap-1 border-b border-line pb-2">
            {PRESET_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value as Preset)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  period.mode === "preset" && period.preset === p.value
                    ? "bg-accent font-medium text-card"
                    : "border border-line text-inksoft hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mb-1 px-0.5 text-[10px] uppercase tracking-[0.1em] text-inkfaint">Or pick months / years</p>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {years.map((y) => (
              <div key={y}>
                <button
                  type="button"
                  onClick={() => toggleYear(y)}
                  className={`mb-1 w-full rounded-md px-1.5 py-0.5 text-left text-xs font-semibold transition-colors hover:bg-panel ${
                    yearAllSelected(y) ? "text-accent" : "text-ink"
                  }`}
                >
                  {y} {yearAllSelected(y) ? "· all" : ""}
                </button>
                <div className="grid grid-cols-4 gap-1">
                  {yearMonths(y).map((m) => {
                    const on = selected.has(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonth(m)}
                        className={`rounded-md px-1 py-1 text-xs transition-colors ${
                          on
                            ? "bg-accent font-medium text-card"
                            : "border border-line text-inksoft hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        {MONTH_ABBR[Number(m.slice(5)) - 1]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
