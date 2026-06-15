"use client";

import { useMemo, useRef, useState } from "react";
import { MODELS, CATEGORY_LABELS } from "@/data/catalog";
import {
  SCENARIOS,
  SCENARIO_LABELS,
  ageMaintenanceMultiplier,
  unitAnnualCost,
  usdCompact,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import { useCatalog } from "@/lib/catalogStore";
import { useFleet } from "@/lib/fleetStore";
import { useQuarry } from "@/lib/quarryStore";
import { useMaint } from "@/lib/maintStore";
import { actualMaintPerHrByUnit } from "@/lib/maintLog";
import { useFleetHistory } from "@/lib/fleetHistoryStore";
import { usePeriod, monthsInPeriod } from "@/lib/periodStore";
import { unitAt } from "@/lib/history";
import { csvToUnits, downloadCsv, unitsToCsv } from "@/lib/csv";
import { downloadTemplate, fileToCsv } from "@/lib/xlsx";
import type { FleetMonth, FleetUnit, Scenario } from "@/lib/types";
import { BrandBadge } from "@/components/BrandBadge";
import { MiniTrend } from "@/components/MiniTrend";
import { IconPlus, IconTrash } from "@/components/Icons";
import { ModuleIntro } from "@/components/ModuleIntro";
import { InfoTip } from "@/components/InfoTip";
import {
  Button,
  Card,
  NumberField,
  PageHeader,
  Segmented,
  Select,
  StatCard,
  TextInput,
} from "@/components/ui";

const TPL_HEADERS = ["unitNo", "classId", "modelId", "year", "currentHours", "annualHours", "availability", "quarryId", "status"];
const TPL_SAMPLE = [
  ["HT-101", "ht-777", "cat-777g", 2019, 28000, 5000, 0.85, "q-tepeaca", "active"],
  ["LD-201", "pl-992", "km-wa800", 2021, 16000, 4500, 0.9, "q-tepeaca", "active"],
];
const TPL_NOTES = [
  { column: "classId", note: "Size class id — see the Catalog module (e.g. ht-777, ht-773, pl-992, wl-980)." },
  { column: "modelId", note: "Brand/model id — see Catalog (e.g. cat-777g, km-hd785, vo-a40)." },
  { column: "availability", note: "Mechanical availability, 0 to 1 (e.g. 0.85)." },
  { column: "quarryId", note: "Quarry id — see Manage Quarries (e.g. q-tepeaca, q-atotonilco, q-monterrey)." },
  { column: "status", note: "active, standby or down." },
];

export default function FleetPage() {
  const { params } = useParams();
  const { classById, classes } = useCatalog();
  const { units, addUnit, updateUnit, removeUnit, replaceUnits, resetAll } = useFleet();
  const { quarries } = useQuarry();
  const { records: maintRecords } = useMaint();
  const { months: fleetMonths } = useFleetHistory();
  const { period } = usePeriod();
  const [scenario, setScenario] = useState<Scenario>("medium");
  const [quarryFilter, setQuarryFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);
  const quarryName = useMemo(() => new Map(quarries.map((q) => [q.id, q.name])), [quarries]);
  const quarryOptions = quarries.map((q) => ({ value: q.id, label: q.name }));

  const visibleUnits = useMemo(
    () => (quarryFilter === "all" ? units : units.filter((u) => u.quarryId === quarryFilter)),
    [units, quarryFilter]
  );

  const maintOverride = useMemo(
    () => (params.useActualMaint ? actualMaintPerHrByUnit(maintRecords) : undefined),
    [params.useActualMaint, maintRecords]
  );

  const { rows, invalid } = useMemo(() => {
    const rows = [] as {
      u: FleetUnit;
      cls: NonNullable<ReturnType<typeof classById.get>>;
      model: (typeof MODELS)[number];
      cost: ReturnType<typeof unitAnnualCost>;
      lifePct: number;
    }[];
    const invalid: FleetUnit[] = [];
    for (const u of visibleUnits) {
      const cls = classById.get(u.classId);
      if (!cls) {
        invalid.push(u);
        continue;
      }
      const model =
        modelById.get(u.modelId) ?? MODELS.find((m) => m.classId === u.classId)!;
      const cost = unitAnnualCost(cls, model, scenario, u, params, maintOverride?.get(u.id));
      const lifePct = cls.lifeHours ? u.currentHours / cls.lifeHours : 0;
      rows.push({ u, cls, model, cost, lifePct });
    }
    return { rows, invalid };
  }, [visibleUnits, scenario, classById, modelById, params, maintOverride]);

  const totals = useMemo(() => {
    const operating = rows.reduce((s, r) => s + r.cost.operating, 0);
    const owning = rows.reduce((s, r) => s + r.cost.owning, 0);
    const active = visibleUnits.filter((u) => u.status === "active").length;
    const nearEol = rows.filter((r) => r.lifePct >= 0.8).length;
    return { operating, owning, total: operating + owning, active, nearEol };
  }, [rows, visibleUnits]);

  const opexTrend = useMemo(() => {
    const months = monthsInPeriod([...new Set(fleetMonths.map((m) => m.month))], period);
    const fmByKey = new Map<string, FleetMonth>(fleetMonths.map((m) => [`${m.unitId}|${m.month}`, m]));
    return months.map((month) => {
      const value = visibleUnits.reduce((s, u) => {
        const cls = classById.get(u.classId);
        if (!cls) return s;
        const model = modelById.get(u.modelId) ?? MODELS.find((m) => m.classId === u.classId)!;
        const hu = unitAt(u, fmByKey, month);
        return s + unitAnnualCost(cls, model, scenario, hu, params, maintOverride?.get(u.id)).operating;
      }, 0);
      return { month, value };
    });
  }, [fleetMonths, period, visibleUnits, classById, modelById, scenario, params, maintOverride]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await fileToCsv(file);
    const { units: parsed, errors } = csvToUnits(text);
    if (parsed.length) replaceUnits(parsed);
    const unknown = parsed.filter((u) => !classById.get(u.classId)).length;
    setImportMsg(
      [
        parsed.length ? `Imported ${parsed.length} units.` : "No rows imported.",
        unknown ? `${unknown} have an unknown classId (see Catalog for valid ids).` : "",
        errors.slice(0, 2).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <PageHeader
        title="My Fleet"
        subtitle="Your actual machines. Hours and utilization drive age-adjusted cost and the CAPEX schedule."
        actions={
          <>
            <Segmented
              value={scenario}
              onChange={(v) => setScenario(v as Scenario)}
              options={SCENARIOS.map((s) => ({ value: s, label: SCENARIO_LABELS[s] }))}
              size="sm"
            />
            <Button onClick={() => setAdding((a) => !a)}>
              <IconPlus width={16} height={16} /> Add unit
            </Button>
          </>
        }
      />

      <ModuleIntro
        id="fleet"
        purpose="A register of every machine you own or evaluate — the live data feed for the operational modules."
        edit="Add/import units and edit their current hours, yearly hours, site and status. Import a CSV to load your whole fleet at once."
        output="Per-unit annual cost (age-adjusted operating + owning) and flags for machines nearing end of life."
        connects="Feeds CAPEX Planner (overhaul/replacement timing) and Sites & Production (current vs optimal fleet). Costs come from Catalog."
        formulas={[
          { label: "Life %", expr: "current hours ÷ life hours" },
          { label: "Age factor", expr: "1 + 0.6 × (current hrs ÷ life)", note: "capped at 1.8; raises maintenance as a machine ages" },
          { label: "Op $/yr", expr: "(fuel + maint×ageFactor + operator) × hrs/yr" },
          { label: "Owning $/yr", expr: "deprec. + interest + insurance" },
          { label: "Depreciation", expr: "(price×(1−salvage)) ÷ life × hrs/yr" },
          { label: "Total $/yr", expr: "operating + owning" },
        ]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Units" value={visibleUnits.length} sub={`${totals.active} active`} />
        <StatCard label="Fleet OPEX / yr" value={usdCompact(totals.operating)} sub="fuel + maint + operator" tone="accent" />
        <StatCard label="Owning / yr" value={usdCompact(totals.owning)} sub="deprec. + capital + insurance" />
        <StatCard label="Near end-of-life" value={totals.nearEol} sub="≥ 80% of life hours" tone={totals.nearEol > 0 ? "danger" : "olive"} />
      </div>

      <div className="mb-5 grid grid-cols-1 sm:max-w-sm">
        <MiniTrend label="Fleet OPEX / yr" data={opexTrend} fmt={usdCompact} color="#b06a3c" goodWhenUp={false} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-inkfaint">Quarry</span>
        <Select
          value={quarryFilter}
          onChange={setQuarryFilter}
          options={[{ value: "all", label: "All quarries" }, ...quarryOptions]}
        />
        <span className="mx-1 h-5 w-px bg-line" />
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={onFile} className="hidden" />
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>Import</Button>
        <Button variant="ghost" onClick={() => downloadCsv("my-fleet.csv", unitsToCsv(visibleUnits))}>Export CSV</Button>
        <Button variant="ghost" onClick={() => downloadTemplate("fleet-template.xlsx", TPL_HEADERS, TPL_SAMPLE, TPL_NOTES)}>Excel template</Button>
        {importMsg && <span className="text-xs text-inksoft">{importMsg}</span>}
      </div>

      {invalid.length > 0 && (
        <div className="mb-4 rounded-xl border border-dangersoft bg-dangersoft/40 px-4 py-2 text-sm text-danger">
          {invalid.length} unit(s) reference an unknown class and are not costed:{" "}
          {invalid.map((u) => u.unitNo).join(", ")}. Fix the classId in your CSV
          (valid ids are listed in Catalog) and re-import.
        </div>
      )}

      {adding && <AddUnitForm onClose={() => setAdding(false)} onAdd={addUnit} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Quarry</th>
                <th className="px-4 py-3 text-right font-semibold">Hours</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Life <InfoTip title="Life used" formula="current hours ÷ life hours" align="right">Hover a unit's % for the resulting maintenance age factor.</InfoTip>
                </th>
                <th className="px-4 py-3 text-right font-semibold">Hrs/yr</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Avail <InfoTip title="Availability" formula="mechanical availability 0–1; feeds the Quarry model" align="right" />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Op $/yr <InfoTip title="Operating cost / year" formula="(fuel + maint×ageFactor + operator) × hrs/yr" align="right" />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Total $/yr <InfoTip title="Total cost / year" formula="operating + owning (deprec.+interest+insurance)" align="right" />
                </th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ u, cls, model, cost, lifePct }) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-4 py-2 font-medium text-ink">
                    {u.unitNo}
                    <span className="ml-1 text-xs text-inkfaint">&apos;{String(u.year).slice(2)}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <BrandBadge brand={model.brand} />
                      <span className="text-ink">{model.model}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Select value={u.quarryId} onChange={(v) => updateUnit(u.id, { quarryId: v })} options={quarryOptions} className="!py-0.5" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={u.currentHours} onChange={(e) => updateUnit(u.id, { currentHours: Number(e.target.value) })}
                      className="w-20 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`tabular ${lifePct >= 0.8 ? "text-danger" : lifePct >= 0.5 ? "text-gold" : "text-inksoft"}`}
                      title={`Maint × ${ageMaintenanceMultiplier(u.currentHours, cls.lifeHours).toFixed(2)} from ageing`}>
                      {(lifePct * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" value={u.annualHours} onChange={(e) => updateUnit(u.id, { annualHours: Number(e.target.value) })}
                      className="w-16 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" step={0.01} value={u.availability} onChange={(e) => updateUnit(u.id, { availability: Number(e.target.value) })}
                      className="w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none" />
                  </td>
                  <td className="px-4 py-2 text-right tabular text-inksoft">{usdCompact(cost.operating)}</td>
                  <td className="px-4 py-2 text-right tabular font-semibold text-ink">{usdCompact(cost.total)}</td>
                  <td className="px-4 py-2">
                    <Select value={u.status} onChange={(v) => updateUnit(u.id, { status: v as FleetUnit["status"] })}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "standby", label: "Standby" },
                        { value: "down", label: "Down" },
                      ]} className="!py-0.5" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeUnit(u.id)} className="text-inkfaint hover:text-danger" title="Remove unit">
                      <IconTrash width={16} height={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-inkfaint">
                    No units yet. Add one, or import a CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-inkfaint">
        <p>Total $/yr = age-adjusted operating + owning. Edit any field inline; everything recalcs and flows to CAPEX and Sites.</p>
        <button onClick={resetAll} className="underline-offset-2 hover:text-ink hover:underline">Reset sample fleet</button>
      </div>
    </div>
  );
}

function AddUnitForm({ onClose, onAdd }: { onClose: () => void; onAdd: (u: FleetUnit) => void }) {
  const { classes } = useCatalog();
  const { quarries } = useQuarry();
  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${CATEGORY_LABELS[c.category]} · ${c.name}`,
  }));
  const quarryOptions = quarries.map((q) => ({ value: q.id, label: q.name }));
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const modelsForClass = MODELS.filter((m) => m.classId === classId);
  const [modelId, setModelId] = useState(modelsForClass[0]?.id ?? "");
  const [unitNo, setUnitNo] = useState("");
  const [year, setYear] = useState(2024);
  const [currentHours, setCurrentHours] = useState(0);
  const [annualHours, setAnnualHours] = useState(4000);
  const [availability, setAvailability] = useState(0.85);
  const [quarryId, setQuarryId] = useState(quarries[0]?.id ?? "");

  const handleClass = (id: string) => {
    setClassId(id);
    setModelId(MODELS.find((m) => m.classId === id)?.id ?? "");
  };

  const submit = () => {
    onAdd({
      id: `u-${Date.now()}`,
      unitNo: unitNo || "NEW-01",
      classId,
      modelId: modelId || modelsForClass[0]?.id || "",
      year,
      currentHours,
      annualHours,
      availability,
      quarryId: quarryId || quarries[0]?.id || "",
      status: "active",
    });
    onClose();
  };

  return (
    <Card className="mb-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Class</span>
          <Select value={classId} onChange={handleClass} options={classOptions} className="w-full" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Model / brand</span>
          <Select value={modelId} onChange={setModelId} options={modelsForClass.map((m) => ({ value: m.id, label: `${m.brand} ${m.model}` }))} className="w-full" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Unit no.</span>
          <TextInput value={unitNo} onChange={setUnitNo} placeholder="HT-01" className="w-full" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Quarry</span>
          <Select value={quarryId} onChange={setQuarryId} options={quarryOptions} className="w-full" />
        </label>
        <NumberField label="Year" value={year} onChange={setYear} />
        <NumberField label="Current hours" value={currentHours} onChange={setCurrentHours} step={100} />
        <NumberField label="Hours / year" value={annualHours} onChange={setAnnualHours} step={100} />
        <NumberField label="Availability" suffix="×" step={0.01} value={availability} onChange={setAvailability} />
        <div className="flex items-end gap-2">
          <Button onClick={submit}>Add</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
