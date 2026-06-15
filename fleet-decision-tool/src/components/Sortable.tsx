"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string | null;
  dir: SortDir;
}
export type Accessor<T> = (row: T) => string | number | null | undefined;

/** Click-to-sort table state. Pass an accessor per sortable column key.
 *  Returns the sorted rows plus the current state and a toggle handler.
 *  null/undefined/non-finite values always sort to the bottom. */
export function useSort<T>(
  rows: T[],
  accessors: Record<string, Accessor<T>>,
  initial: SortState = { key: null, dir: "asc" }
) {
  const [state, setState] = useState<SortState>(initial);

  const toggle = (key: string) =>
    setState((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );

  const sorted = useMemo(() => {
    const acc = state.key ? accessors[state.key] : undefined;
    if (!acc) return rows;
    const dir = state.dir === "asc" ? 1 : -1;
    const blank = (v: string | number | null | undefined) =>
      v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
    return [...rows].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      const an = blank(av);
      const bn = blank(bv);
      if (an && bn) return 0;
      if (an) return 1; // blanks last regardless of direction
      if (bn) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [rows, state, accessors]);

  return { sorted, state, toggle };
}

/** A clickable column header. `children` (e.g. an InfoTip) renders outside the
 *  sort button so it doesn't trigger a sort. */
export function SortHeader({
  label,
  sortKey,
  state,
  onSort,
  align = "left",
  className = "",
  children,
}: {
  label: ReactNode;
  sortKey: string;
  state: SortState;
  onSort: (key: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
  children?: ReactNode;
}) {
  const active = state.key === sortKey;
  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <th className={`font-semibold ${textAlign} ${className}`}>
      <span className={`inline-flex items-center gap-1 ${justify}`}>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${active ? "text-ink" : ""}`}
          title="Sort"
        >
          <span>{label}</span>
          <span className={`text-[9px] leading-none ${active ? "text-accent" : "text-inkfaint/60"}`}>
            {active ? (state.dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
        {children}
      </span>
    </th>
  );
}
