"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import { useCatalog } from "@/lib/catalogStore";
import type { Category } from "@/lib/types";
import { IconPlus, IconTrash } from "@/components/Icons";
import { ModuleIntro } from "@/components/ModuleIntro";
import {
  Button,
  Card,
  NumberField,
  PageHeader,
  SectionTitle,
  Select,
  TextInput,
} from "@/components/ui";

const LOADER_CATS: Category[] = ["wheel-loader", "pit-loader", "excavator"];
const TRUCK_CATS: Category[] = ["rigid-truck", "articulated-truck"];

export default function QuarriesPage() {
  const { quarries, addQuarry, updateQuarry, removeQuarry, setActiveQuarry } = useQuarry();
  const { units } = useFleet();
  const { classes } = useCatalog();

  const loaderOptions = useMemo(() => classes.filter((c) => LOADER_CATS.includes(c.category)).map((c) => ({ value: c.id, label: c.name })), [classes]);
  const truckOptions = useMemo(() => classes.filter((c) => TRUCK_CATS.includes(c.category)).map((c) => ({ value: c.id, label: c.name })), [classes]);
  const unitCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of units) m.set(u.quarryId, (m.get(u.quarryId) ?? 0) + 1);
    return m;
  }, [units]);

  // Group by region
  const byRegion = useMemo(() => {
    const m = new Map<string, typeof quarries>();
    for (const q of quarries) {
      const list = m.get(q.region) ?? [];
      list.push(q);
      m.set(q.region, list);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [quarries]);

  return (
    <div>
      <PageHeader
        title="Manage Quarries"
        subtitle="The portfolio of quarries (sites), grouped by region. Create, rename, re-region and set the sizing inputs here."
        actions={<Button onClick={addQuarry}><IconPlus width={16} height={16} /> Add quarry</Button>}
      />

      <ModuleIntro
        id="quarries"
        purpose="The registry of every quarry/site in the operation, with its region and the coarse sizing inputs used by Sites & Production and the rollups."
        edit="Name, region, annual production target, representative haul distance, and representative loader/truck class. The detailed fronts/crusher model is edited in Quarry Performance."
        output="A clean two-level hierarchy (Región → Cantera) that feeds the active-quarry selector, the Executive Dashboard and Compare Quarries."
        connects="Each quarry owns its fleet (My Fleet quarryId), its shift log, and its detailed model. Region drives the dashboard subtotals."
      />

      <div className="space-y-6">
        {byRegion.map(([region, list]) => (
          <div key={region}>
            <SectionTitle className="mb-2">{region} <span className="text-sm font-sans not-italic text-inkfaint">· {list.length} quarr{list.length === 1 ? "y" : "ies"}</span></SectionTitle>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm"><span className="text-inksoft">Name</span>
                      <TextInput value={q.name} onChange={(v) => updateQuarry(q.id, { name: v })} className="w-full" /></label>
                    <label className="space-y-1 text-sm"><span className="text-inksoft">Region</span>
                      <TextInput value={q.region} onChange={(v) => updateQuarry(q.id, { region: v })} className="w-full" /></label>
                  </div>
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    <NumberField label="Production" suffix="t/yr" step={50000} value={q.productionTons} onChange={(v) => updateQuarry(q.id, { productionTons: v })} />
                    <NumberField label="Haul one-way" suffix="km" step={0.1} value={q.haulKm} onChange={(v) => updateQuarry(q.id, { haulKm: v })} />
                    <label className="flex items-center justify-between gap-2 text-sm"><span className="text-inksoft">Loader class</span>
                      <Select value={q.loaderClassId} onChange={(v) => updateQuarry(q.id, { loaderClassId: v })} options={loaderOptions} /></label>
                    <label className="flex items-center justify-between gap-2 text-sm"><span className="text-inksoft">Truck class</span>
                      <Select value={q.truckClassId} onChange={(v) => updateQuarry(q.id, { truckClassId: v })} options={truckOptions} /></label>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-inksoft">
                    <span>{q.config.fronts.length} front(s) · {unitCount.get(q.id) ?? 0} unit(s)</span>
                    <div className="flex items-center gap-3">
                      <Link href="/quarry" onClick={() => setActiveQuarry(q.id)} className="text-accent hover:underline">Edit model →</Link>
                      {quarries.length > 1 && (
                        <button onClick={() => removeQuarry(q.id)} className="inline-flex items-center gap-1 text-inkfaint hover:text-danger" title="Remove quarry">
                          <IconTrash width={14} height={14} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-inkfaint">
        Removing a quarry does not delete its fleet units — reassign them in My
        Fleet first. The detailed fronts, crusher and products are edited per
        quarry in Quarry Performance (pick the quarry in the top bar).
      </p>
    </div>
  );
}
