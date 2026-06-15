"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usd, usdCompact } from "@/lib/engine";
import { computeQuarry } from "@/lib/quarry";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useQuarry } from "@/lib/quarryStore";
import type { Category } from "@/lib/types";
import { ModuleIntro } from "@/components/ModuleIntro";
import {
  Card,
  NumberField,
  PageHeader,
  SectionTitle,
  Select,
  StatCard,
} from "@/components/ui";

const LOADER_CATS: Category[] = ["wheel-loader", "pit-loader", "excavator"];
const TRUCK_CATS: Category[] = ["rigid-truck", "articulated-truck"];

const tons = (n: number) => `${Math.round(n).toLocaleString()} t`;

export default function QuarryPage() {
  const { params } = useParams();
  const { classes, classById } = useCatalog();
  const { config, update, updateProduct, reset } = useQuarry();

  const r = useMemo(
    () => computeQuarry(config, classById, params),
    [config, classById, params]
  );

  const loaderOptions = classes
    .filter((c) => LOADER_CATS.includes(c.category))
    .map((c) => ({ value: c.id, label: c.name }));
  const truckOptions = classes
    .filter((c) => TRUCK_CATS.includes(c.category))
    .map((c) => ({ value: c.id, label: c.name }));

  const maxTph = Math.max(r.loadingTph, r.haulTph, r.crusherCapacityTph, 1);

  const costStageData = [
    {
      name: "Current",
      "Drill & blast": r.costCurrent.drillBlast / r.costCurrent.tons,
      Loading: r.costCurrent.load / r.costCurrent.tons,
      Hauling: r.costCurrent.haul / r.costCurrent.tons,
      Crushing: r.costCurrent.crush / r.costCurrent.tons,
    },
    {
      name: "Optimal",
      "Drill & blast": r.costOptimal.drillBlast / r.costOptimal.tons,
      Loading: r.costOptimal.load / r.costOptimal.tons,
      Hauling: r.costOptimal.haul / r.costOptimal.tons,
      Crushing: r.costOptimal.crush / r.costOptimal.tons,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quarry Performance"
        subtitle="Model an aggregates quarry as a load–haul–crush chain, find the bottleneck, and compare real output against the optimum."
        actions={
          <button
            onClick={reset}
            className="text-xs text-inkfaint underline-offset-2 hover:text-ink hover:underline"
          >
            Reset assumptions
          </button>
        }
      />

      <ModuleIntro
        id="quarry"
        purpose="A performance model of one aggregates quarry: loading, hauling and crushing as a chain governed by its slowest stage."
        edit="The assumptions on the left — calendar, loader & truck setup, crusher rating, costs. Later you'll also enter/import real shift data."
        output="The bottleneck stage, match factor, throughput, cost & energy per ton, OEE, and product/stockpile balance — real vs optimal."
        connects="Uses Catalog costs for the chosen loader/truck classes; the same equipment economics behind My Fleet and Sites."
      />

      {/* Headline KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Bottleneck"
          value={<span className="text-2xl">{r.bottleneck}</span>}
          sub={`${Math.round(r.currentTph)} tph system`}
          tone="danger"
        />
        <StatCard label="Crusher capacity" value={`${Math.round(r.crusherCapacityTph)}`} sub="tph (avail-adjusted)" />
        <StatCard label="Match factor" value={r.matchFactor.toFixed(2)} sub={r.matchFactor > 1.05 ? "over-trucked" : r.matchFactor < 0.95 ? "under-trucked" : "balanced"} tone={r.matchFactor > 1.05 || r.matchFactor < 0.95 ? "gold" : "olive"} />
        <StatCard label="Plan attainment" value={`${(r.planAttainment * 100).toFixed(0)}%`} sub={`${usdCompact(r.annualReal).replace("$", "")} vs ${usdCompact(r.annualTarget).replace("$", "")} t`} tone={r.planAttainment >= 1 ? "olive" : "accent"} />
        <StatCard label="Cost / ton" value={usd(r.costCurrent.perTon, 2)} sub={`optimal ${usd(r.costOptimal.perTon, 2)}`} tone="accent" />
        <StatCard label="Crusher OEE" value={`${(r.oee.oee * 100).toFixed(0)}%`} sub={`util ${(r.oee.utilization * 100).toFixed(0)}%`} tone="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <ConfigPanel
          config={config}
          update={update}
          loaderOptions={loaderOptions}
          truckOptions={truckOptions}
        />

        <div className="min-w-0 space-y-6">
          {/* Bottleneck */}
          <Card className="p-5">
            <SectionTitle className="mb-1">Bottleneck &amp; balance</SectionTitle>
            <p className="mb-4 text-sm text-inksoft">
              The chain runs at the speed of its slowest stage. Yours is{" "}
              <span className="font-semibold text-danger">{r.bottleneck}</span> at{" "}
              {Math.round(r.currentTph)} tph
              {r.bottleneck !== "Crushing" && (
                <>
                  {" "}— recommend {r.trucksRecommended} trucks and {r.loadersRecommended}{" "}
                  loader(s) to feed the crusher fully.
                </>
              )}
            </p>
            <div className="space-y-3">
              {r.stageCaps.map((s) => (
                <div key={s.stage}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className={s.bottleneck ? "font-semibold text-danger" : "text-inksoft"}>
                      {s.stage} {s.bottleneck && "· bottleneck"}
                    </span>
                    <span className="tabular text-ink">{Math.round(s.tph)} tph</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                    <div
                      className={`h-full rounded-full ${s.bottleneck ? "bg-danger" : "bg-olive"}`}
                      style={{ width: `${(s.tph / maxTph) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Real vs optimal */}
          <Card className="p-5">
            <SectionTitle className="mb-3">Real vs optimal production</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <BigNum label="Real / modeled" value={tons(r.annualReal)} tone="ink" />
              <BigNum label="Optimal (crusher-fed)" value={tons(r.annualOptimal)} tone="olive" />
              <BigNum label="Lost production" value={tons(r.lostTons)} tone="danger" sub={`${((r.lostTons / (r.annualOptimal || 1)) * 100).toFixed(0)}% of optimal`} />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-inksoft">
                <span>Plan attainment</span>
                <span>{(r.planAttainment * 100).toFixed(0)}% of {tons(r.annualTarget)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                <div
                  className={`h-full rounded-full ${r.planAttainment >= 1 ? "bg-olive" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, r.planAttainment * 100)}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Cost & energy */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>Cost &amp; energy per ton</SectionTitle>
              <div className="flex gap-4 text-sm text-inksoft">
                <span>Fuel <span className="tabular font-medium text-ink">{r.fuelGalPerTon.toFixed(2)} gal/t</span></span>
                <span>Energy <span className="tabular font-medium text-ink">{config.kwhPerTon.toFixed(1)} kWh/t</span></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={costStageData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${Number(v).toFixed(1)}`} tick={{ fill: "#a89e8c", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#6c6356", fontSize: 13 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip
                  cursor={{ fill: "rgba(176,106,60,0.06)" }}
                  formatter={(value) => usd(Number(value), 2)}
                  contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12, color: "#2a2620" }}
                />
                <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
                <Bar dataKey="Drill & blast" stackId="a" fill="#c08a44" />
                <Bar dataKey="Loading" stackId="a" fill="#6f7548" />
                <Bar dataKey="Hauling" stackId="a" fill="#5b7c8a" />
                <Bar dataKey="Crushing" stackId="a" fill="#b06a3c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* OEE */}
          <Card className="p-5">
            <SectionTitle className="mb-3">Crusher OEE</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-4">
              <OeeBar label="Availability" value={r.oee.availability} />
              <OeeBar label="Utilization" value={r.oee.utilization} />
              <OeeBar label="Quality" value={r.oee.quality} />
              <OeeBar label="OEE" value={r.oee.oee} accent />
            </div>
          </Card>

          {/* Products & stockpiles */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <SectionTitle>Products &amp; stockpiles</SectionTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 text-right font-semibold">Mix %</th>
                    <th className="px-4 py-3 text-right font-semibold">Production</th>
                    <th className="px-4 py-3 text-right font-semibold">Demand</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                    <th className="px-4 py-3 text-right font-semibold">Stockpile</th>
                    <th className="px-4 py-3 text-right font-semibold">Days cover</th>
                  </tr>
                </thead>
                <tbody>
                  {r.products.map((p) => (
                    <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                      <td className="px-4 py-2 font-medium text-ink">
                        {p.name}
                        {p.flag !== "ok" && (
                          <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${p.flag === "stockout" ? "bg-dangersoft text-danger" : "bg-accentsoft text-accentink"}`}>
                            {p.flag}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" step={1} value={Math.round(p.mixPct * 100)}
                          onChange={(e) => updateProduct(p.id, { mixPct: Number(e.target.value) / 100 })}
                          className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                      </td>
                      <td className="px-4 py-2 text-right tabular text-inksoft">{tons(p.productionTons)}</td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" step={10000} value={p.demandTonsYear}
                          onChange={(e) => updateProduct(p.id, { demandTonsYear: Number(e.target.value) })}
                          className="w-28 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                      </td>
                      <td className={`px-4 py-2 text-right tabular ${p.balance < 0 ? "text-danger" : "text-olive"}`}>
                        {p.balance < 0 ? "−" : "+"}{tons(Math.abs(p.balance))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" step={1000} value={p.stockpileTons}
                          onChange={(e) => updateProduct(p.id, { stockpileTons: Number(e.target.value) })}
                          className="w-24 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                      </td>
                      <td className={`px-4 py-2 text-right tabular ${p.flag === "stockout" ? "text-danger" : p.flag === "overstock" ? "text-gold" : "text-inksoft"}`}>
                        {p.daysCover > 365 ? "365+" : Math.round(p.daysCover)} d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-inkfaint">
            Simplified theory-of-constraints model. “Optimal” feeds the crusher to
            its availability-adjusted capacity with a balanced truck/loader fleet.
            Phase 2 will let you enter and import real shift data (tons, downtime,
            cycle times) to track actual vs optimal over time and by shift.
          </p>
        </div>
      </div>
    </div>
  );
}

function BigNum({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "ink" | "olive" | "danger" }) {
  const c = tone === "olive" ? "text-olive" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-inkfaint">{label}</p>
      <p className={`font-display text-2xl tabular ${c}`}>{value}</p>
      {sub && <p className="text-xs text-inkfaint">{sub}</p>}
    </div>
  );
}

function OeeBar({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-inksoft">{label}</span>
        <span className="tabular font-medium text-ink">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${accent ? "bg-accent" : "bg-olive"}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}

function ConfigPanel({
  config,
  update,
  loaderOptions,
  truckOptions,
}: {
  config: ReturnType<typeof useQuarry>["config"];
  update: ReturnType<typeof useQuarry>["update"];
  loaderOptions: { value: string; label: string }[];
  truckOptions: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <Group title="Calendar">
        <NumberField label="Shifts / day" value={config.shiftsPerDay} onChange={(v) => update({ shiftsPerDay: v })} />
        <NumberField label="Hours / shift" value={config.hoursPerShift} onChange={(v) => update({ hoursPerShift: v })} />
        <NumberField label="Days / year" value={config.daysPerYear} onChange={(v) => update({ daysPerYear: v })} />
        <NumberField label="Op. efficiency" suffix="×" step={0.01} value={config.operatingEfficiency} onChange={(v) => update({ operatingEfficiency: v })} />
      </Group>

      <Group title="Loading">
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Loader class</span>
          <Select value={config.loaderClassId} onChange={(v) => update({ loaderClassId: v })} options={loaderOptions} className="w-full" />
        </label>
        <NumberField label="# loaders" value={config.nLoaders} onChange={(v) => update({ nLoaders: v })} />
        <NumberField label="Cycle" suffix="sec" value={config.loaderCycleSec} onChange={(v) => update({ loaderCycleSec: v })} />
        <NumberField label="Passes / truck" value={config.passesPerTruck} onChange={(v) => update({ passesPerTruck: v })} />
        <NumberField label="Fill factor" suffix="×" step={0.05} value={config.bucketFillFactor} onChange={(v) => update({ bucketFillFactor: v })} />
      </Group>

      <Group title="Hauling">
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Truck class</span>
          <Select value={config.truckClassId} onChange={(v) => update({ truckClassId: v })} options={truckOptions} className="w-full" />
        </label>
        <NumberField label="# trucks" value={config.nTrucks} onChange={(v) => update({ nTrucks: v })} />
        <NumberField label="Haul one-way" suffix="km" step={0.1} value={config.haulKm} onChange={(v) => update({ haulKm: v })} />
        <NumberField label="Loaded speed" suffix="km/h" value={config.loadedSpeedKmh} onChange={(v) => update({ loadedSpeedKmh: v })} />
        <NumberField label="Empty speed" suffix="km/h" value={config.emptySpeedKmh} onChange={(v) => update({ emptySpeedKmh: v })} />
        <NumberField label="Spot + dump" suffix="sec" value={config.spotDumpSec} onChange={(v) => update({ spotDumpSec: v })} />
        <NumberField label="Availability" suffix="×" step={0.01} value={config.truckAvailability} onChange={(v) => update({ truckAvailability: v })} />
      </Group>

      <Group title="Crusher / plant">
        <NumberField label="Rated" suffix="tph" step={10} value={config.crusherRatedTph} onChange={(v) => update({ crusherRatedTph: v })} />
        <NumberField label="Availability" suffix="×" step={0.01} value={config.crusherAvailability} onChange={(v) => update({ crusherAvailability: v })} />
        <NumberField label="Energy" suffix="kWh/t" step={0.1} value={config.kwhPerTon} onChange={(v) => update({ kwhPerTon: v })} />
        <NumberField label="Power price" suffix="$/kWh" step={0.01} value={config.energyPriceUsdKwh} onChange={(v) => update({ energyPriceUsdKwh: v })} />
        <NumberField label="Liners" suffix="$/t" step={0.01} value={config.linerCostPerTon} onChange={(v) => update({ linerCostPerTon: v })} />
        <NumberField label="Plant other" suffix="$/t" step={0.05} value={config.plantOtherPerTon} onChange={(v) => update({ plantOtherPerTon: v })} />
      </Group>

      <Group title="Costs, targets & quality">
        <NumberField label="Drill & blast" suffix="$/t" step={0.05} value={config.drillBlastCostPerTon} onChange={(v) => update({ drillBlastCostPerTon: v })} />
        <NumberField label="Target" suffix="t/yr" step={50000} value={config.targetTonsYear} onChange={(v) => update({ targetTonsYear: v })} />
        <NumberField label="Actual t/yr (0=model)" suffix="t/yr" step={50000} value={config.actualTonsYear ?? 0} onChange={(v) => update({ actualTonsYear: v })} />
        <NumberField label="Out of spec" suffix="×" step={0.01} value={config.outOfSpecPct} onChange={(v) => update({ outOfSpecPct: v })} />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accentink">{title}</p>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}
