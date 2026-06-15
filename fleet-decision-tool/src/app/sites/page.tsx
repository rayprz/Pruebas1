"use client";

import { useMemo, useState } from "react";
import { MODELS } from "@/data/catalog";
import {
  sizeSite,
  unitAnnualCost,
  unitOperatingPerHour,
  usdCompact,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import type { Category } from "@/lib/types";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
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

const refModel = (classId: string) =>
  MODELS.find((m) => m.classId === classId && m.source === "oem") ??
  MODELS.find((m) => m.classId === classId)!;

export default function SitesPage() {
  const { params } = useParams();
  const { classes, classById } = useCatalog();
  const { units } = useFleet();
  const { quarries, updateQuarry } = useQuarry();
  const [annualHoursPerUnit, setAnnualHoursPerUnit] = useState(5000);
  const [trucksPerLoader, setTrucksPerLoader] = useState(3);

  const loaderOptions = useMemo(
    () => classes.filter((c) => LOADER_CATS.includes(c.category)).map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );
  const truckOptions = useMemo(
    () => classes.filter((c) => TRUCK_CATS.includes(c.category)).map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );
  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);

  const analysis = useMemo(() => {
    return quarries.map((site) => {
      const truckCls = classById.get(site.truckClassId)!;
      const loaderCls = classById.get(site.loaderClassId)!;
      const sizing = sizeSite(site, truckCls, annualHoursPerUnit, trucksPerLoader);

      // Optimal OPEX: recommended new units at standard utilization
      const truckOpUnit =
        unitOperatingPerHour(truckCls, refModel(truckCls.id), "medium", 0, params).total *
        annualHoursPerUnit;
      const loaderOpUnit =
        unitOperatingPerHour(loaderCls, refModel(loaderCls.id), "medium", 0, params).total *
        annualHoursPerUnit;
      const optimalOpex =
        sizing.trucksNeeded * truckOpUnit + sizing.loadersNeeded * loaderOpUnit;

      // Current fleet assigned to this quarry
      const siteUnits = units.filter((u) => u.quarryId === site.id);
      const currentTrucks = siteUnits.filter((u) => {
        const c = classById.get(u.classId);
        return c && TRUCK_CATS.includes(c.category);
      }).length;
      const currentLoaders = siteUnits.filter((u) => {
        const c = classById.get(u.classId);
        return c && LOADER_CATS.includes(c.category);
      }).length;
      const currentOpex = siteUnits.reduce((s, u) => {
        const c = classById.get(u.classId);
        const m = modelById.get(u.modelId) ?? refModel(u.classId);
        return c ? s + unitAnnualCost(c, m, "medium", u, params).operating : s;
      }, 0);

      return {
        site,
        sizing,
        optimalOpex,
        currentOpex,
        excess: currentOpex - optimalOpex,
        currentTrucks,
        currentLoaders,
      };
    });
  }, [quarries, units, classById, modelById, params, annualHoursPerUnit, trucksPerLoader]);

  const totals = useMemo(() => {
    const production = quarries.reduce((s, x) => s + x.productionTons, 0);
    const excess = analysis.reduce((s, a) => s + a.excess, 0);
    const recTrucks = analysis.reduce((s, a) => s + a.sizing.trucksNeeded, 0);
    const recLoaders = analysis.reduce((s, a) => s + a.sizing.loadersNeeded, 0);
    return { production, excess, recTrucks, recLoaders };
  }, [quarries, analysis]);

  return (
    <div>
      <PageHeader
        title="Sites & Production"
        subtitle="Right-size each work area to its production target, then compare against the fleet you actually run."
      />

      <ModuleIntro
        id="sites"
        purpose="Sizes the fleet each work area needs to hit its production target, and exposes the OPEX you waste running a non-optimal fleet."
        edit="Per site: production tons/yr, haul distance, and the loader/truck classes. Plus the global hrs/yr and trucks-per-loader assumptions."
        output="Recommended trucks & loaders vs. what you actually assign, and the resulting 'excess OPEX' per quarry and overall."
        connects="One row per quarry. Reads the units assigned to each quarry in My Fleet and costs from Catalog."
        formulas={[
          { label: "Truck cycle (min)", expr: "fixed + 2 × haul km ÷ speed × 60" },
          { label: "Tons/truck/yr", expr: "payload × (60÷cycle) × 82% avail × 83% eff × hrs/yr" },
          { label: "Trucks needed", expr: "ceil(production ÷ tons per truck per yr)" },
          { label: "Loaders needed", expr: "ceil(trucks ÷ trucks-per-loader)" },
          { label: "Excess OPEX", expr: "current operating − optimal operating" },
        ]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Required production" value={`${(totals.production / 1e6).toFixed(2)}M`} sub="short tons / year" />
        <StatCard label="Recommended fleet" value={`${totals.recTrucks} + ${totals.recLoaders}`} sub="trucks + loaders" />
        <StatCard
          label={<>Excess OPEX / yr <InfoTip title="Excess OPEX" formula="Σ (current operating − optimal operating) per site" align="left" /></>}
          value={usdCompact(Math.max(0, totals.excess))}
          sub={totals.excess >= 0 ? "vs right-sized fleet" : "running leaner than optimal"}
          tone={totals.excess > 0 ? "danger" : "olive"}
        />
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">Assumptions</p>
          <div className="mt-1 space-y-1">
            <NumberField label="Hrs/yr per unit" value={annualHoursPerUnit} onChange={setAnnualHoursPerUnit} step={250} />
            <NumberField label="Trucks / loader" value={trucksPerLoader} onChange={setTrucksPerLoader} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {analysis.map(({ site, sizing, optimalOpex, currentOpex, excess, currentTrucks, currentLoaders }) => (
          <Card key={site.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionTitle>{site.name} <span className="text-sm font-sans not-italic text-inkfaint">· {site.region}</span></SectionTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-1.5 text-inksoft">
                    Production
                    <input
                      type="number"
                      value={site.productionTons}
                      onChange={(e) => updateQuarry(site.id, { productionTons: Number(e.target.value) })}
                      className="w-28 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none"
                    />
                    <span className="text-inkfaint">t/yr</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-inksoft">
                    Haul
                    <input
                      type="number"
                      step={0.1}
                      value={site.haulKm}
                      onChange={(e) => updateQuarry(site.id, { haulKm: Number(e.target.value) })}
                      className="w-16 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none"
                    />
                    <span className="text-inkfaint">km</span>
                  </label>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.12em] text-inkfaint">Excess OPEX</p>
                <p className={`font-display text-2xl tabular ${excess > 0 ? "text-danger" : "text-olive"}`}>
                  {excess > 0 ? usdCompact(excess) : usdCompact(Math.abs(excess))}
                  <span className="ml-1 text-xs font-sans not-italic text-inkfaint">{excess > 0 ? "over" : "under"}/yr</span>
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.1em] text-inkfaint">Loading</p>
                <Select
                  value={site.loaderClassId}
                  onChange={(v) => updateQuarry(site.id, { loaderClassId: v })}
                  options={loaderOptions}
                  className="w-full"
                />
                <Row label="Recommended loaders" value={`${sizing.loadersNeeded}`} />
                <Row label="Currently assigned" value={`${currentLoaders}`} mismatch={currentLoaders !== sizing.loadersNeeded} />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.1em] text-inkfaint">Hauling</p>
                <Select
                  value={site.truckClassId}
                  onChange={(v) => updateQuarry(site.id, { truckClassId: v })}
                  options={truckOptions}
                  className="w-full"
                />
                <Row label="Recommended trucks" value={`${sizing.trucksNeeded}`} />
                <Row label="Currently assigned" value={`${currentTrucks}`} mismatch={currentTrucks !== sizing.trucksNeeded} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
              <Metric label="Cycle time" value={`${sizing.cycleMin.toFixed(1)} min`} tip={<InfoTip title="Truck cycle" formula="fixed + 2 × haul km ÷ speed × 60" align="left" />} />
              <Metric label="Optimal OPEX/yr" value={usdCompact(optimalOpex)} tip={<InfoTip title="Optimal OPEX" formula="recommended units × new-unit operating $/yr" align="left" />} />
              <Metric label="Current OPEX/yr" value={usdCompact(currentOpex)} tip={<InfoTip title="Current OPEX" formula="Σ operating $/yr of units assigned to this site" align="left" />} />
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs text-inkfaint">
        Simplified productivity model: truck payload × trips/hr (from haul
        distance and cycle time) × availability {82}% × efficiency {83}%.
        “Excess OPEX” compares the operating cost of the fleet you assign to each
        site against a right-sized fleet of new equipment. Tune the assumptions
        above and the class selections per site.
      </p>
    </div>
  );
}

function Row({ label, value, mismatch }: { label: string; value: string; mismatch?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-inksoft">{label}</span>
      <span className={`tabular font-medium ${mismatch ? "text-danger" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function Metric({ label, value, tip }: { label: string; value: string; tip?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-inkfaint">{label}{tip}</p>
      <p className="tabular font-semibold text-ink">{value}</p>
    </div>
  );
}
