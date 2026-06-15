"use client";

import { useState, type ReactNode } from "react";

/** A button that opens a floating panel; clicking the backdrop closes it.
 *  `children` receives a `close` callback. */
export function Popover({
  trigger,
  children,
  align = "right",
  panelClassName = "",
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
      >
        {trigger}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-inkfaint">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 mt-1.5 ${align === "right" ? "right-0" : "left-0"} min-w-[12rem] rounded-xl border border-line bg-card p-2 shadow-[0_8px_30px_rgba(42,38,32,0.12)] ${panelClassName}`}
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
        on ? "border-accent bg-accent text-card" : "border-line bg-card"
      }`}
    >
      {on && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
          <path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** Generic multi-select dropdown with checkboxes, All / None, and optional grouping. */
export function MultiSelect({
  options,
  selected,
  onChange,
  allLabel = "All",
  noun = "items",
  align = "right",
}: {
  options: { value: string; label: string; group?: string; hint?: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  allLabel?: string;
  noun?: string;
  align?: "left" | "right";
}) {
  const all = options.length;
  const n = selected.filter((v) => options.some((o) => o.value === v)).length;
  const summary =
    n === 0
      ? `No ${noun}`
      : n >= all
        ? allLabel
        : n === 1
          ? options.find((o) => o.value === selected.find((s) => options.some((o) => o.value === s)))?.label ?? `1 ${noun}`
          : `${n} ${noun}`;

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  const grouped = groups.some((g) => g !== "");

  return (
    <Popover align={align} trigger={<span className="font-medium">{summary}</span>} panelClassName="w-60">
      {() => (
        <div>
          <div className="mb-1 flex items-center justify-between border-b border-line px-1.5 pb-1.5 text-[11px] uppercase tracking-[0.1em] text-inkfaint">
            <span>{noun}</span>
            <span className="flex gap-2">
              <button type="button" className="hover:text-ink" onClick={() => onChange(options.map((o) => o.value))}>All</button>
              <button type="button" className="hover:text-ink" onClick={() => onChange([])}>None</button>
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {groups.map((g) => (
              <div key={g}>
                {grouped && g !== "" && (
                  <p className="px-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-inkfaint">{g}</p>
                )}
                {options
                  .filter((o) => (o.group ?? "") === g)
                  .map((o) => {
                    const on = selected.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggle(o.value)}
                        className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm hover:bg-panel"
                      >
                        <Check on={on} />
                        <span className="flex-1 text-ink">{o.label}</span>
                        {o.hint && <span className="text-xs text-inkfaint">{o.hint}</span>}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
