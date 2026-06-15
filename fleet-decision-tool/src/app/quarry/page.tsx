"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usd, usdCompact } from "@/lib/engine";
import { computeQuarry, type FrontResult, type LossItem } from "@/lib/quarry";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import type { Category, FleetUnit, QuarryFront } from "@/lib/types";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import { QuarryActuals } from "@/components/QuarryActuals";
import { IconPlus, IconTrash } from "@/components/Icons";
import {
  Button,
  Card,
  NumberField,
  PageHeader,
  SectionTitle,
  Segmented,
  Select,
  StatCard,
  TextInput,
} from "@/components/ui";

const LOADER_CATS: Category[] = ["wheel-loader", "pit-loader", "excavator"];
const TRUCK_CATS: Category[] = ["rigid-truck", "articulated-truck"];
const tph = (n: number) => `${Math.round(n).toLocaleString()}`;
const tons = (n: number) => `${Math.round(n).toLocaleString()} t`;

const FORMULAS = [
  { label: "Loader feed (tph)", expr: "bucket × fill × 3600 ÷ cycle(s) × avail" },
  { label: "Passes per truck", expr: "round(truck payload ÷ (bucket × fill))" },
  { label: "Truck cycle (s)", expr: "spot+dump + passes×loaderCycle\n  + haul/loadedSpd×3600 + haul/emptySpd×3600" },
  { label: "Truck feed (tph)", expr: "payload × 3600 ÷ cycle × availability" },
  { label: "Front delivered", expr: "min( loader feed , Σ truck feed )", note: "the smaller side is that front's bottleneck" },
  { label: "Crusher capacity", expr: "rated tph × availability" },
  { label: "System tph", expr: "min(Σ crusher fronts, crusher cap)\n  + Σ stockpile fronts" },
  { label: "Lost $/yr", expr: "recoverable tph × productive hrs/yr × margin $/t" },
];

export default function QuarryPage() {
  const { params } = useParams();
  const { classById, classes } = useCatalog();
  const { units } = useFleet();
  const q = useQuarry();
  const { config } = q;

  const [tab, setTab] = useState<"model" | "actuals">("model");

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const r = useMemo(
    () => computeQuarry(config, classById, params, unitsById),
    [config, classById, params, unitsById]
  );

  const loaderOptions = classes.filter((c) => LOADER_CATS.includes(c.category)).map((c) => ({ value: c.id, label: c.name }));

  // Haul trucks from My Fleet, and where each is currently assigned
  const truckUnits = useMemo(
    () =>
      units.filter((u) => {
        const c = classById.get(u.classId);
        return c && TRUCK_CATS.includes(c.category);
      }),
    [units, classById]
  );
  const assignedFrontByUnit = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of config.fronts) for (const id of f.truckUnitIds) map.set(id, f.name);
    return map;
  }, [config.fronts]);
  const unassignedTrucks = truckUnits.filter((u) => !assignedFrontByUnit.has(u.id));

  // Loaders from My Fleet
  const loaderUnits = useMemo(
    () =>
      units.filter((u) => {
        const c = classById.get(u.classId);
        return c && LOADER_CATS.includes(c.category);
      }),
    [units, classById]
  );
  const assignedLoaderFrontByUnit = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of config.fronts) if (f.loaderUnitId) map.set(f.loaderUnitId, f.name);
    return map;
  }, [config.fronts]);
  const unassignedLoaders = loaderUnits.filter((u) => !assignedLoaderFrontByUnit.has(u.id));

  return (
    <div>
      <PageHeader
        title="Quarry Performance"
        subtitle="Multi-front load–haul–crush model for the daily ops meeting: see every front's bottleneck and what's costing you efficiency right now."
        actions={
          <button onClick={q.reset} className="text-xs text-inkfaint underline-offset-2 hover:text-ink hover:underline">
            Reset assumptions
          </button>
        }
      />

      <ModuleIntro
        id="quarry"
        purpose="Each loading face (front) is its own load–haul–crush chain with its own trucks — so the quarry can have several bottlenecks at once, plus a shared crusher constraint."
        edit="Per front: the loader, the haul route, and the truck groups (size, count, availability — mix brands/sizes freely). Plus the shared crusher and calendar."
        output="The bottleneck at every front, the crusher load, and a ranked board of what's costing you tph / tons / $ today — built for a stand-up meeting."
        connects="Uses Catalog costs for each loader/truck class. Trucks here mirror the haul fleet you keep in My Fleet."
        formulas={FORMULAS}
      />

      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as "model" | "actuals")}
          options={[
            { value: "model", label: "Daily model" },
            { value: "actuals", label: "Shift actuals" },
          ]}
        />
      </div>

      {tab === "actuals" && <QuarryActuals model={r} config={config} />}

      {tab === "model" && (
        <>
      {/* Headline KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={<>System output <InfoTip title="System output (tph)" formula="min(Σ crusher fronts, crusher cap) + Σ stockpile fronts" /></>}
          value={tph(r.systemTph)}
          sub={`tph · ${(r.planAttainment * 100).toFixed(0)}% of ${tph(r.targetTph)} target`}
          tone={r.planAttainment >= 1 ? "olive" : "accent"}
        />
        <StatCard
          label={<>Plant bottleneck <InfoTip title="Plant bottleneck" formula="Crusher if demand > capacity, else the binding fronts" align="left" /></>}
          value={<span className="text-2xl">{r.systemBottleneck === "Crusher" ? "Crusher" : "Fronts"}</span>}
          sub={r.systemBottleneck === "Crusher" ? `over-fed ${tph(r.crusherQueueTph)} tph` : "see fronts below"}
          tone="danger"
        />
        <StatCard
          label={<>Lost production <InfoTip title="Recoverable production" formula="recoverable tph × productive hrs/yr" align="left" /></>}
          value={tph(r.totalLossTph)}
          sub={`tph · ${tons(r.totalLossTonsYear)}/yr recoverable`}
          tone="danger"
        />
        <StatCard
          label={<>Efficiency $ at stake <InfoTip title="Value of losses" formula="Σ loss tph × productive hrs/yr × margin $/ton" align="left" /></>}
          value={usdCompact(r.totalLossUsdYear)}
          sub="per year if unaddressed"
          tone="gold"
        />
        <StatCard
          label={<>Crusher OEE <InfoTip title="Crusher OEE" formula="availability × utilization × quality" align="right" /></>}
          value={`${(r.oee.oee * 100).toFixed(0)}%`}
          sub={`util ${(r.oee.utilization * 100).toFixed(0)}%`}
        />
        <StatCard
          label={<>Cost / ton <InfoTip title="Cost per ton" formula="(drill&blast + load + haul + crush) ÷ annual tons" align="right" /></>}
          value={usd(r.cost.perTon, 2)}
          sub={`${r.fuelGalPerTon.toFixed(2)} gal/t fuel`}
          tone="accent"
        />
      </div>

      {/* What's costing efficiency today */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <SectionTitle>What&apos;s costing us efficiency today</SectionTitle>
          <InfoTip title="Loss board" formula="ranked by $/yr impact" align="left">
            Each item is a recoverable inefficiency. Hauling shortfalls are capped by spare crusher capacity; over-trucking and queueing waste truck time.
          </InfoTip>
        </div>
        {r.losses.length === 0 ? (
          <p className="text-sm text-olive">Every front is balanced and the crusher is well fed. Nice.</p>
        ) : (
          <div className="space-y-2">
            {r.losses.map((l) => <LossRow key={l.id} loss={l} />)}
          </div>
        )}
      </Card>

      {/* Flow board */}
      <SectionTitle className="mb-2">Operation flow</SectionTitle>
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto_240px]">
        <div className="space-y-3">
          {r.fronts.map((f) => <FrontFlowCard key={f.id} f={f} />)}
        </div>
        <div className="flex items-center justify-center">
          <CrusherNode r={r} />
        </div>
        <StockpileNode products={r.products} stockTph={r.stockpileDeliveredTph} />
      </div>

      {/* Per-front editing */}
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Fronts &amp; fleet</SectionTitle>
        <Button onClick={q.addFront}><IconPlus width={16} height={16} /> Add front</Button>
      </div>
      {(unassignedTrucks.length > 0 || unassignedLoaders.length > 0) && (
        <div className="mb-3 space-y-1 rounded-xl border border-line bg-accentsoft/40 px-4 py-2 text-sm text-inksoft">
          {unassignedTrucks.length > 0 && (
            <p>
              <span className="font-medium text-accentink">{unassignedTrucks.length} truck(s) spare:</span>{" "}
              {unassignedTrucks.map((u) => u.unitNo).join(", ")} — assign them to a front below.
            </p>
          )}
          {unassignedLoaders.length > 0 && (
            <p>
              <span className="font-medium text-accentink">{unassignedLoaders.length} loader(s) spare:</span>{" "}
              {unassignedLoaders.map((u) => u.unitNo).join(", ")}.
            </p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {config.fronts.map((front) => {
          const res = r.fronts.find((x) => x.id === front.id)!;
          return (
            <FrontEditor
              key={front.id}
              front={front}
              res={res}
              loaderOptions={loaderOptions}
              loaderUnits={loaderUnits}
              assignedLoaderFrontByUnit={assignedLoaderFrontByUnit}
              truckUnits={truckUnits}
              assignedFrontByUnit={assignedFrontByUnit}
              q={q}
            />
          );
        })}
      </div>

      {/* Cost by stage + OEE */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <SectionTitle>Cost per ton by stage</SectionTitle>
            <InfoTip title="Cost per ton by stage" formula="stage cost/yr ÷ annual tons" align="left">
              Load &amp; haul = equipment operating $/hr × productive hrs. Crush = (kWh/t × $/kWh) + liners + plant. Drill&amp;blast = $/t input.
            </InfoTip>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[{
                name: "$/ton",
                "Drill & blast": r.cost.drillBlast / r.cost.tons,
                Loading: r.cost.load / r.cost.tons,
                Hauling: r.cost.haul / r.cost.tons,
                Crushing: r.cost.crush / r.cost.tons,
                total: r.cost.perTon,
              }]}
              layout="vertical"
              margin={{ left: 8, right: 52 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfcd" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `$${Number(v).toFixed(1)}`} tick={{ fill: "#a89e8c", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip formatter={(v) => usd(Number(v), 2)} contentStyle={{ background: "#fffdf9", border: "1px solid #e8dfcd", borderRadius: 12 }} />
              <Legend wrapperStyle={{ color: "#6c6356", fontSize: 12 }} />
              <Bar dataKey="Drill & blast" stackId="a" fill="#c08a44" />
              <Bar dataKey="Loading" stackId="a" fill="#6f7548" />
              <Bar dataKey="Hauling" stackId="a" fill="#5b7c8a" />
              <Bar dataKey="Crushing" stackId="a" fill="#b06a3c" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="total" position="right" formatter={(v: unknown) => usd(Number(v), 2)} style={{ fill: "#6c6356", fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center font-display text-xl tabular text-ink">{usd(r.cost.perTon, 2)}<span className="ml-1 text-sm font-sans not-italic text-inkfaint">/ ton</span></p>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <SectionTitle>Crusher OEE</SectionTitle>
            <InfoTip title="OEE" formula="availability × utilization × quality" align="left">
              Utilization = throughput ÷ capacity. Quality = 1 − out-of-spec %.
            </InfoTip>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <OeeBar label="Availability" value={r.oee.availability} />
            <OeeBar label="Utilization" value={r.oee.utilization} />
            <OeeBar label="Quality" value={r.oee.quality} />
            <OeeBar label="OEE" value={r.oee.oee} accent />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
            <Metric label="Crusher fed" value={`${tph(r.crusherThroughputTph)} tph`} />
            <Metric label="Capacity" value={`${tph(r.crusherCapacityTph)} tph`} />
            <Metric label="To stockpile" value={`${tph(r.stockpileDeliveredTph)} tph`} />
          </div>
        </Card>
      </div>

      {/* Products & stockpiles */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <SectionTitle>Products &amp; stockpiles</SectionTitle>
          <InfoTip title="Stockpiles" formula="days cover = stockpile ÷ (demand ÷ 365)" align="left">
            Production = annual tons × mix %. Balance = production − demand. Flags: &lt;7 days = stockout risk, &gt;60 = overstock.
          </InfoTip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 text-right font-semibold">Mix %</th>
                <th className="px-4 py-3 text-right font-semibold">Production <InfoTip title="Production" formula="annual tons × mix %" align="right" /></th>
                <th className="px-4 py-3 text-right font-semibold">Demand</th>
                <th className="px-4 py-3 text-right font-semibold">Balance <InfoTip title="Balance" formula="production − demand" align="right" /></th>
                <th className="px-4 py-3 text-right font-semibold">Stockpile</th>
                <th className="px-4 py-3 text-right font-semibold">Days cover <InfoTip title="Days cover" formula="stockpile ÷ (demand ÷ 365)" align="right" /></th>
              </tr>
            </thead>
            <tbody>
              {r.products.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-4 py-2 font-medium text-ink">
                    {p.name}
                    {p.flag !== "ok" && (
                      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${p.flag === "stockout" ? "bg-dangersoft text-danger" : "bg-accentsoft text-accentink"}`}>{p.flag}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={Math.round(p.mixPct * 100)} onChange={(e) => q.updateProduct(p.id, { mixPct: Number(e.target.value) / 100 })}
                      className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right tabular text-inksoft">{tons(p.productionTons)}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={10000} value={p.demandTonsYear} onChange={(e) => q.updateProduct(p.id, { demandTonsYear: Number(e.target.value) })}
                      className="w-28 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className={`px-4 py-2 text-right tabular ${p.balance < 0 ? "text-danger" : "text-olive"}`}>{p.balance < 0 ? "−" : "+"}{tons(Math.abs(p.balance))}</td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={1000} value={p.stockpileTons} onChange={(e) => q.updateProduct(p.id, { stockpileTons: Number(e.target.value) })}
                      className="w-24 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className={`px-4 py-2 text-right tabular ${p.flag === "stockout" ? "text-danger" : p.flag === "overstock" ? "text-gold" : "text-inksoft"}`}>{p.daysCover > 365 ? "365+" : Math.round(p.daysCover)} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Global assumptions */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accentink">Calendar &amp; targets</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <NumberField label="Shifts/day" value={config.shiftsPerDay} onChange={(v) => q.update({ shiftsPerDay: v })} />
            <NumberField label="Hrs/shift" value={config.hoursPerShift} onChange={(v) => q.update({ hoursPerShift: v })} />
            <NumberField label="Days/yr" value={config.daysPerYear} onChange={(v) => q.update({ daysPerYear: v })} />
            <NumberField label="Op. eff." suffix="×" step={0.01} value={config.operatingEfficiency} onChange={(v) => q.update({ operatingEfficiency: v })} />
            <NumberField label="Target" suffix="tph" step={50} value={config.targetTph} onChange={(v) => q.update({ targetTph: v })} />
            <NumberField label="Margin" suffix="$/t" step={0.5} value={config.valuePerTon} onChange={(v) => q.update({ valuePerTon: v })} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accentink">Crusher &amp; plant</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <NumberField label="Rated" suffix="tph" step={50} value={config.crusherRatedTph} onChange={(v) => q.update({ crusherRatedTph: v })} />
            <NumberField label="Availability" suffix="×" step={0.01} value={config.crusherAvailability} onChange={(v) => q.update({ crusherAvailability: v })} />
            <NumberField label="Energy" suffix="kWh/t" step={0.1} value={config.kwhPerTon} onChange={(v) => q.update({ kwhPerTon: v })} />
            <NumberField label="Power" suffix="$/kWh" step={0.01} value={config.energyPriceUsdKwh} onChange={(v) => q.update({ energyPriceUsdKwh: v })} />
            <NumberField label="Liners" suffix="$/t" step={0.01} value={config.linerCostPerTon} onChange={(v) => q.update({ linerCostPerTon: v })} />
            <NumberField label="Plant other" suffix="$/t" step={0.05} value={config.plantOtherPerTon} onChange={(v) => q.update({ plantOtherPerTon: v })} />
            <NumberField label="Drill&blast" suffix="$/t" step={0.05} value={config.drillBlastCostPerTon} onChange={(v) => q.update({ drillBlastCostPerTon: v })} />
            <NumberField label="Out of spec" suffix="×" step={0.01} value={config.outOfSpecPct} onChange={(v) => q.update({ outOfSpecPct: v })} />
          </div>
        </Card>
      </div>

      <p className="mt-4 text-xs text-inkfaint">
        Simplified theory-of-constraints model for daily decisions. Every number
        has its formula in the “i” icons and the intro panel. Switch to{" "}
        <span className="font-medium text-ink">Shift actuals</span> to log real
        production and compare it against this model by shift and over time.
      </p>
      </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function severityColor(s: LossItem["severity"]) {
  return s === "high" ? "bg-danger" : s === "medium" ? "bg-gold" : "bg-blue";
}

function LossRow({ loss }: { loss: LossItem }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityColor(loss.severity)}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{loss.title}</p>
        <p className="text-sm text-inksoft">{loss.detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-lg tabular text-danger">{usdCompact(loss.usdPerYear)}<span className="text-xs font-sans not-italic text-inkfaint">/yr</span></p>
        <p className="text-xs text-inkfaint">{Math.round(loss.tonsPerShift).toLocaleString()} t/shift</p>
      </div>
    </div>
  );
}

const DEST_STYLE = { crusher: "bg-accentsoft text-accentink", stockpile: "bg-olivesoft text-olive" } as const;
const BN_STYLE = { Hauling: "text-danger", Loading: "text-gold", Balanced: "text-olive" } as const;

function FrontFlowCard({ f }: { f: FrontResult }) {
  const max = Math.max(f.loaderTph, f.haulTph, 1);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">{f.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DEST_STYLE[f.destination]}`}>→ {f.destination}</span>
        </div>
        <span className={`text-sm font-semibold ${BN_STYLE[f.bottleneck]}`}>{f.bottleneck}</span>
      </div>
      <div className="space-y-1.5">
        <FlowBar label="Loader" value={f.loaderTph} max={max} color="bg-gold" />
        <FlowBar label="Trucks" value={f.haulTph} max={max} color="bg-blue" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {f.groups.map((g) => (
            <span key={g.label} className="rounded-md bg-panel px-1.5 py-0.5 text-[11px] text-inksoft">
              {g.count}× {g.label}
            </span>
          ))}
        </div>
        <span className="font-display text-lg tabular text-ink" title="Delivered = min(loader, trucks)">{tph(f.delivered)} <span className="text-xs font-sans not-italic text-inkfaint">tph</span></span>
      </div>
    </Card>
  );
}

function FlowBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[11px] text-inkfaint">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="w-14 text-right text-xs tabular text-inksoft">{tph(value)}</span>
    </div>
  );
}

function CrusherNode({ r }: { r: ReturnType<typeof computeQuarry> }) {
  const fed = r.crusherCapacityTph > 0 ? Math.min(1, r.crusherThroughputTph / r.crusherCapacityTph) : 0;
  const over = r.crusherQueueTph > 0;
  return (
    <Card className={`w-44 p-4 text-center ${over ? "border-danger" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">Crusher</p>
      <p className="font-display text-3xl tabular text-ink">{tph(r.crusherThroughputTph)}</p>
      <p className="text-xs text-inkfaint">of {tph(r.crusherCapacityTph)} tph cap</p>
      <div className="mx-auto mt-3 h-2.5 overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-accent"}`} style={{ width: `${fed * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-inksoft">{(r.crusherUtilization * 100).toFixed(0)}% utilized</p>
      {over && <p className="mt-2 rounded-lg bg-dangersoft px-2 py-1 text-[11px] font-medium text-danger">trucks queue +{tph(r.crusherQueueTph)} tph</p>}
    </Card>
  );
}

function StockpileNode({ products, stockTph }: { products: ReturnType<typeof computeQuarry>["products"]; stockTph: number }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">Stockpiles</p>
      <p className="mb-2 text-xs text-inkfaint">+{tph(stockTph)} tph direct</p>
      <div className="space-y-2">
        {products.slice(0, 5).map((p) => (
          <div key={p.id}>
            <div className="flex justify-between text-[11px]">
              <span className="truncate text-inksoft">{p.name}</span>
              <span className={`tabular ${p.flag === "stockout" ? "text-danger" : p.flag === "overstock" ? "text-gold" : "text-inksoft"}`}>
                {p.daysCover > 365 ? "365+" : Math.round(p.daysCover)}d
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel">
              <div className={`h-full rounded-full ${p.flag === "stockout" ? "bg-danger" : p.flag === "overstock" ? "bg-gold" : "bg-olive"}`}
                style={{ width: `${Math.min(100, (p.daysCover / 60) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-inkfaint">{label}</p>
      <p className="tabular font-semibold text-ink">{value}</p>
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

function FrontEditor({
  front,
  res,
  loaderOptions,
  loaderUnits,
  assignedLoaderFrontByUnit,
  truckUnits,
  assignedFrontByUnit,
  q,
}: {
  front: QuarryFront;
  res: FrontResult;
  loaderOptions: { value: string; label: string }[];
  loaderUnits: FleetUnit[];
  assignedLoaderFrontByUnit: Map<string, string>;
  truckUnits: FleetUnit[];
  assignedFrontByUnit: Map<string, string>;
  q: ReturnType<typeof useQuarry>;
}) {
  const [open, setOpen] = useState(false);
  const assignable = truckUnits.filter((u) => !front.truckUnitIds.includes(u.id));
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-panel/50">
        <span className="flex-1">
          <span className="font-medium text-ink">{front.name}</span>
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${DEST_STYLE[front.destination]}`}>→ {front.destination}</span>
          <span className="ml-2 text-xs text-inkfaint">{res.truckCount} trucks · MF {res.matchFactor.toFixed(2)}</span>
        </span>
        <span className="hidden text-right text-sm sm:block">
          <span className={`font-semibold ${BN_STYLE[res.bottleneck]}`}>{res.bottleneck}</span>
          <span className="block text-xs text-inkfaint">{tph(res.delivered)} tph delivered</span>
        </span>
        <span className="text-inkfaint">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-line bg-panel/30 p-4">
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">Front</p>
              <label className="space-y-1 text-sm"><span className="text-inksoft">Name</span>
                <TextInput value={front.name} onChange={(v) => q.updateFront(front.id, { name: v })} className="w-full" /></label>
              <label className="space-y-1 text-sm"><span className="text-inksoft">Material</span>
                <TextInput value={front.material} onChange={(v) => q.updateFront(front.id, { material: v })} className="w-full" /></label>
              <label className="space-y-1 text-sm"><span className="text-inksoft">Delivers to</span>
                <Select value={front.destination} onChange={(v) => q.updateFront(front.id, { destination: v as QuarryFront["destination"] })}
                  options={[{ value: "crusher", label: "Crusher" }, { value: "stockpile", label: "Stockpile" }]} className="w-full" /></label>
            </div>
            <div className="space-y-2">
              <p className="flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">
                Loader <InfoTip title="Loader feed (tph)" formula="bucket × fill × 3600 ÷ cycle × avail" align="left">Assign a fleet loader — class, brand and availability come from the unit. Bucket / cycle / fill are tunable per face.</InfoTip>
              </p>
              <label className="space-y-1 text-sm"><span className="text-inksoft">Loader unit (My Fleet)</span>
                <select
                  value={front.loaderUnitId ?? ""}
                  onChange={(e) => (e.target.value ? q.assignLoader(front.id, e.target.value) : q.unassignLoader(front.id))}
                  className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">— Config (no fleet unit)</option>
                  {loaderUnits.map((u) => {
                    const at = assignedLoaderFrontByUnit.get(u.id);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.unitNo}{at && at !== front.name ? ` (move from ${at})` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
              {front.loaderUnitId ? (
                <p className="text-xs text-inksoft">
                  {res.loaderLabel}
                  {!res.loaderActive && <span className="text-danger"> · down → front stops</span>}
                </p>
              ) : (
                <label className="space-y-1 text-sm"><span className="text-inksoft">Class (fallback)</span>
                  <Select value={front.loaderClassId} onChange={(v) => q.updateFront(front.id, { loaderClassId: v })} options={loaderOptions} className="w-full" /></label>
              )}
              <NumberField label="Bucket" suffix="t" value={front.loaderBucketTons} onChange={(v) => q.updateFront(front.id, { loaderBucketTons: v })} />
              <NumberField label="Cycle" suffix="sec" value={front.loaderCycleSec} onChange={(v) => q.updateFront(front.id, { loaderCycleSec: v })} />
              <NumberField label="Fill" suffix="×" step={0.05} value={front.bucketFillFactor} onChange={(v) => q.updateFront(front.id, { bucketFillFactor: v })} />
              {!front.loaderUnitId && (
                <NumberField label="Availability" suffix="×" step={0.01} value={front.loaderAvailability} onChange={(v) => q.updateFront(front.id, { loaderAvailability: v })} />
              )}
              <p className="text-xs text-inkfaint">Loader feed: <span className="tabular text-ink">{tph(res.loaderTph)} tph</span></p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">Haul route <InfoTip title="Truck cycle (s)" formula="spot+dump + passes×loaderCycle + haul/loadedSpd×3600 + haul/emptySpd×3600" align="left" /></p>
              <NumberField label="Haul one-way" suffix="km" step={0.1} value={front.haulKm} onChange={(v) => q.updateFront(front.id, { haulKm: v })} />
              <NumberField label="Loaded speed" suffix="km/h" value={front.loadedSpeedKmh} onChange={(v) => q.updateFront(front.id, { loadedSpeedKmh: v })} />
              <NumberField label="Empty speed" suffix="km/h" value={front.emptySpeedKmh} onChange={(v) => q.updateFront(front.id, { emptySpeedKmh: v })} />
              <NumberField label="Spot + dump" suffix="sec" value={front.spotDumpSec} onChange={(v) => q.updateFront(front.id, { spotDumpSec: v })} />
              <p className="text-xs text-inkfaint">Truck feed: <span className="tabular text-ink">{tph(res.haulTph)} tph</span></p>
            </div>
          </div>

          {/* Trucks from My Fleet */}
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-accentink">
                Trucks from My Fleet <InfoTip title="Truck feed (tph)" formula="payload × 3600÷cycle × availability, per assigned unit" align="left">Assign real units from My Fleet. Payload, brand and availability come from the unit; only “active” units produce.</InfoTip>
              </p>
              {assignable.length > 0 && (
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) q.assignTruck(front.id, e.target.value); }}
                  className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">+ Assign truck…</option>
                  {assignable.map((u) => {
                    const at = assignedFrontByUnit.get(u.id);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.unitNo}{at ? ` (move from ${at})` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            {res.units.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-inkfaint">No trucks assigned. Use “Assign truck…” to put fleet units on this front.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                      <th className="py-1 pr-2 font-semibold">Unit</th>
                      <th className="py-1 pr-2 font-semibold">Model</th>
                      <th className="py-1 pr-2 text-right font-semibold">Payload</th>
                      <th className="py-1 pr-2 text-right font-semibold">Passes</th>
                      <th className="py-1 pr-2 text-right font-semibold">tph</th>
                      <th className="py-1 pr-2 font-semibold">Status</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {res.units.map((u) => (
                      <tr key={u.unitId} className="border-t border-line/60">
                        <td className="py-1.5 pr-2 font-medium text-ink">{u.unitNo}</td>
                        <td className="py-1.5 pr-2 text-inksoft">{u.label}</td>
                        <td className="py-1.5 pr-2 text-right tabular text-inkfaint">{u.payload} t</td>
                        <td className="py-1.5 pr-2 text-right tabular text-inkfaint">{u.passes}</td>
                        <td className={`py-1.5 pr-2 text-right tabular font-medium ${u.active ? "text-ink" : "text-inkfaint"}`}>{u.active ? tph(u.tphPerTruck) : "—"}</td>
                        <td className="py-1.5 pr-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${u.status === "active" ? "bg-olivesoft text-olive" : u.status === "standby" ? "bg-accentsoft text-accentink" : "bg-dangersoft text-danger"}`}>{u.status}</span>
                        </td>
                        <td className="py-1.5 text-right">
                          <button onClick={() => q.unassignTruck(front.id, u.unitId)} className="text-inkfaint hover:text-danger" title="Unassign"><IconTrash width={14} height={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <p className="text-sm">
              <span className={`font-semibold ${BN_STYLE[res.bottleneck]}`}>{res.bottleneck}</span>
              <span className="text-inksoft"> · delivers {tph(res.delivered)} tph · match factor {res.matchFactor.toFixed(2)}</span>
              {res.bottleneck === "Hauling" && res.trucksToBalance > 0 && (
                <span className="text-danger"> · add {res.trucksToBalance} truck(s) to balance the loader</span>
              )}
            </p>
            <Button variant="danger" onClick={() => q.removeFront(front.id)}><IconTrash width={14} height={14} /> Remove front</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
