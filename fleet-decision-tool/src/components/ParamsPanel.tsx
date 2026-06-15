"use client";

import { useState } from "react";
import { BRANDS } from "@/data/catalog";
import { useParams } from "@/lib/store";
import type { Brand } from "@/lib/types";
import { Card, NumberField, Segmented } from "./ui";

export function ParamsPanel() {
  const { params, update, reset } = useParams();
  const [showBrands, setShowBrands] = useState(false);
  const [showCapital, setShowCapital] = useState(false);

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accentink">
          Parameters
        </h2>
        <button
          onClick={reset}
          className="text-xs text-inkfaint underline-offset-2 hover:text-ink hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2">
        <NumberField label="Diesel price" suffix="$/gal" step={0.05} value={params.fuelPriceUsdGal} onChange={(v) => update({ fuelPriceUsdGal: v })} />
        <NumberField label="Operator rate" suffix="$/hr" step={0.5} value={params.laborRateUsdHr} onChange={(v) => update({ laborRateUsdHr: v })} />
        <NumberField label="Overtime rate" suffix="$/hr" step={0.5} value={params.overtimeRateUsdHr} onChange={(v) => update({ overtimeRateUsdHr: v })} />
        <NumberField label="Benefits load" suffix="× wage" step={0.01} value={params.benefitRate} onChange={(v) => update({ benefitRate: v })} />
        <NumberField label="Maint. escalation" suffix="× '22" step={0.01} value={params.maintenanceEscalation} onChange={(v) => update({ maintenanceEscalation: v })} />
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">
          Service interval
        </p>
        <Segmented
          value={String(params.serviceInterval)}
          onChange={(v) => update({ serviceInterval: Number(v) as 250 | 500 })}
          options={[
            { value: "500", label: "500 hr" },
            { value: "250", label: "250 hr" },
          ]}
          size="sm"
        />
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">
          Utilization (hrs/week)
        </p>
        {(["low", "medium", "high"] as const).map((s) => (
          <NumberField
            key={s}
            label={s === "low" ? "Low" : s === "medium" ? "Medium" : "High"}
            suffix="hr/wk"
            value={params.hoursPerWeek[s]}
            onChange={(v) =>
              update({ hoursPerWeek: { ...params.hoursPerWeek, [s]: v } })
            }
          />
        ))}
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">
          Maintenance source
        </p>
        <Segmented
          value={params.useActualMaint ? "actual" : "modeled"}
          onChange={(v) => update({ useActualMaint: v === "actual" })}
          options={[
            { value: "modeled", label: "Modeled" },
            { value: "actual", label: "Actual" },
          ]}
          size="sm"
        />
        <p className="text-xs text-inkfaint">
          “Actual” uses logged maintenance $/hr (from the Maintenance module)
          where available, across Fleet, Quarry and the Dashboard.
        </p>
        <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">
          Availability source
        </p>
        <Segmented
          value={params.useActualAvailability ? "observed" : "assumed"}
          onChange={(v) => update({ useActualAvailability: v === "observed" })}
          options={[
            { value: "assumed", label: "Assumed" },
            { value: "observed", label: "Observed" },
          ]}
          size="sm"
        />
        <p className="text-xs text-inkfaint">
          “Observed” feeds each unit’s maintenance-derived availability (from
          corrective downtime) into the Quarry model, so bottlenecks reflect
          real reliability.
        </p>
      </div>

      <div className="border-t border-line pt-3">
        <button
          onClick={() => setShowCapital((s) => !s)}
          className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint hover:text-ink"
        >
          Capital cost
          <span>{showCapital ? "−" : "+"}</span>
        </button>
        {showCapital && (
          <div className="mt-2 space-y-2">
            <NumberField label="Cost of capital" suffix="/yr" step={0.005} value={params.interestRate} onChange={(v) => update({ interestRate: v })} />
            <NumberField label="Insurance" suffix="× acq" step={0.005} value={params.insuranceRate} onChange={(v) => update({ insuranceRate: v })} />
          </div>
        )}
      </div>

      <div className="border-t border-line pt-3">
        <button
          onClick={() => setShowBrands((s) => !s)}
          className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint hover:text-ink"
        >
          Brand maint. factors
          <span>{showBrands ? "−" : "+"}</span>
        </button>
        {showBrands && (
          <div className="mt-2 space-y-2">
            {BRANDS.map((b: Brand) => (
              <NumberField
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
            <p className="text-xs text-inkfaint">
              Multiplier vs the Caterpillar reference (0.95 = 5% cheaper to
              maintain).
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
