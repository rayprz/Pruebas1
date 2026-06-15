"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

export interface TrendPoint {
  month: string;
  value: number;
}

/** Compact sparkline of a KPI over months, with the latest value and the
 *  period-over-period delta. */
export function MiniTrend({
  label,
  data,
  fmt,
  color = "#b06a3c",
  height = 56,
  goodWhenUp = true,
}: {
  label: string;
  data: TrendPoint[];
  fmt: (n: number) => string;
  color?: string;
  height?: number;
  goodWhenUp?: boolean;
}) {
  if (data.length === 0) return null;
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const delta = first !== 0 ? (last - first) / Math.abs(first) : 0;
  const up = delta > 0.005;
  const down = delta < -0.005;
  const good = (up && goodWhenUp) || (down && !goodWhenUp);
  const deltaClass = !up && !down ? "text-inkfaint" : good ? "text-olive" : "text-danger";

  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.1em] text-inkfaint">{label}</span>
        <span className="font-display text-base tabular text-ink">{fmt(last)}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
          <Tooltip
            formatter={(v) => fmt(Number(v))}
            labelFormatter={(l) => String(l)}
            contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 10, fontSize: 12 }}
          />
          <Line dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-between text-[11px]">
        <span className="text-inkfaint">{data[0].month} → {data[data.length - 1].month}</span>
        <span className={`tabular font-medium ${deltaClass}`}>{delta > 0 ? "+" : ""}{(delta * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
