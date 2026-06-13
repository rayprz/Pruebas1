"use client";

import { useState } from "react";
import { BRANDS } from "@/data/catalog";
import { useParams } from "@/lib/store";
import type { Brand } from "@/lib/types";

function Field({
  label,
  suffix,
  value,
  step,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          step={step ?? 0.05}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-100 focus:border-yellow-400 focus:outline-none"
        />
        {suffix && <span className="w-14 text-xs text-slate-500">{suffix}</span>}
      </span>
    </label>
  );
}

export function ParamsPanel() {
  const { params, update, reset } = useParams();
  const [showBrands, setShowBrands] = useState(false);

  return (
    <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-300">
          Parameters
        </h2>
        <button
          onClick={reset}
          className="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2">
        <Field
          label="Diesel price"
          suffix="$/gal"
          value={params.fuelPriceUsdGal}
          onChange={(v) => update({ fuelPriceUsdGal: v })}
        />
        <Field
          label="Operator rate"
          suffix="$/hr"
          value={params.laborRateUsdHr}
          onChange={(v) => update({ laborRateUsdHr: v })}
        />
        <Field
          label="Overtime rate"
          suffix="$/hr"
          value={params.overtimeRateUsdHr}
          onChange={(v) => update({ overtimeRateUsdHr: v })}
        />
        <Field
          label="Benefits load"
          suffix="× wages"
          step={0.01}
          value={params.benefitRate}
          onChange={(v) => update({ benefitRate: v })}
        />
        <Field
          label="Maint. escalation vs 2022"
          suffix="×"
          step={0.01}
          value={params.maintenanceEscalation}
          onChange={(v) => update({ maintenanceEscalation: v })}
        />
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Service interval
        </p>
        <div className="flex gap-2">
          {([500, 250] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => update({ serviceInterval: iv })}
              className={`flex-1 rounded-md border px-2 py-1 text-sm ${
                params.serviceInterval === iv
                  ? "border-yellow-400 bg-yellow-400/10 font-semibold text-yellow-300"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {iv} hr
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Utilization (hrs/week)
        </p>
        {(["low", "medium", "high"] as const).map((s) => (
          <Field
            key={s}
            label={s === "low" ? "Low" : s === "medium" ? "Medium" : "High"}
            suffix="hrs/wk"
            step={1}
            value={params.hoursPerWeek[s]}
            onChange={(v) =>
              update({ hoursPerWeek: { ...params.hoursPerWeek, [s]: v } })
            }
          />
        ))}
        <p className="text-xs text-slate-500">
          Low/Medium/High pair weekly hours with moderate/average/severe duty.
        </p>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <button
          onClick={() => setShowBrands((s) => !s)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white"
        >
          Brand maintenance factors
          <span>{showBrands ? "−" : "+"}</span>
        </button>
        {showBrands && (
          <div className="mt-2 space-y-2">
            {BRANDS.map((b: Brand) => (
              <Field
                key={b}
                label={b}
                suffix="×"
                step={0.01}
                value={params.brandFactors[b] ?? 1}
                onChange={(v) =>
                  update({ brandFactors: { ...params.brandFactors, [b]: v } })
                }
              />
            ))}
            <p className="text-xs text-slate-500">
              Multiplier on class maintenance cost vs the Caterpillar reference
              (e.g. 0.95 = 5% cheaper to maintain).
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
