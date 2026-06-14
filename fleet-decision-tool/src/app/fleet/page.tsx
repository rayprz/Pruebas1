"use client";

import { useMemo, useState } from "react";
import { EQUIVALENCE_CLASSES, MODELS, CATEGORY_LABELS } from "@/data/catalog";
import {
  SCENARIOS,
  SCENARIO_LABELS,
  ageMaintenanceMultiplier,
  unitAnnualCost,
  usd,
  usdCompact,
} from "@/lib/engine";
import { useParams } from "@/lib/store";
import { useFleet } from "@/lib/fleetStore";
import type { FleetUnit, Scenario } from "@/lib/types";
import { BrandBadge } from "@/components/BrandBadge";
import { IconPlus, IconTrash } from "@/components/Icons";
import {
  Button,
  Card,
  NumberField,
  PageHeader,
  Segmented,
  Select,
  StatCard,
  StatusBadge,
  TextInput,
} from "@/components/ui";

const classOptions = EQUIVALENCE_CLASSES.map((c) => ({
  value: c.id,
  label: `${CATEGORY_LABELS[c.category]} · ${c.name}`,
}));

export default function FleetPage() {
  const { params } = useParams();
  const { units, addUnit, updateUnit, removeUnit, resetAll } = useFleet();
  const [scenario, setScenario] = useState<Scenario>("medium");
  const [adding, setAdding] = useState(false);

  const classById = useMemo(
    () => new Map(EQUIVALENCE_CLASSES.map((c) => [c.id, c])),
    []
  );
  const modelById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), []);

  const rows = useMemo(
    () =>
      units.map((u) => {
        const cls = classById.get(u.classId)!;
        const model =
          modelById.get(u.modelId) ?? MODELS.find((m) => m.classId === u.classId)!;
        const cost = unitAnnualCost(cls, model, scenario, u, params);
        const lifePct = cls.lifeHours ? u.currentHours / cls.lifeHours : 0;
        return { u, cls, model, cost, lifePct };
      }),
    [units, scenario, classById, modelById, params]
  );

  const totals = useMemo(() => {
    const operating = rows.reduce((s, r) => s + r.cost.operating, 0);
    const owning = rows.reduce((s, r) => s + r.cost.owning, 0);
    const active = units.filter((u) => u.status === "active").length;
    const nearEol = rows.filter((r) => r.lifePct >= 0.8).length;
    return { operating, owning, total: operating + owning, active, nearEol };
  }, [rows, units]);

  return (
    <div>
      <PageHeader
        title="My Fleet"
        subtitle="Unit-level registry. Hours and utilization drive age-adjusted operating cost and the CAPEX schedule."
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

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Units" value={units.length} sub={`${totals.active} active`} />
        <StatCard
          label="Fleet OPEX / yr"
          value={usdCompact(totals.operating)}
          sub="fuel + maint + operator"
          tone="accent"
        />
        <StatCard
          label="Owning / yr"
          value={usdCompact(totals.owning)}
          sub="depreciation + capital + insurance"
        />
        <StatCard
          label="Near end-of-life"
          value={totals.nearEol}
          sub="≥ 80% of life hours"
          tone={totals.nearEol > 0 ? "danger" : "olive"}
        />
      </div>

      {adding && <AddUnitForm onClose={() => setAdding(false)} onAdd={addUnit} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-inkfaint">
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Site</th>
                <th className="px-4 py-3 text-right font-semibold">Hours</th>
                <th className="px-4 py-3 text-right font-semibold">Life</th>
                <th className="px-4 py-3 text-right font-semibold">Hrs/yr</th>
                <th className="px-4 py-3 text-right font-semibold">Op $/yr</th>
                <th className="px-4 py-3 text-right font-semibold">Total $/yr</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ u, cls, model, cost, lifePct }) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-panel/50">
                  <td className="px-4 py-2 font-medium text-ink">
                    {u.unitNo}
                    <span className="ml-1 text-xs text-inkfaint">'{String(u.year).slice(2)}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <BrandBadge brand={model.brand} />
                      <span className="text-ink">{model.model}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-inksoft">{u.site}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={u.currentHours}
                      onChange={(e) => updateUnit(u.id, { currentHours: Number(e.target.value) })}
                      className="w-20 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`tabular ${
                        lifePct >= 0.8 ? "text-danger" : lifePct >= 0.5 ? "text-gold" : "text-inksoft"
                      }`}
                      title={`Maint × ${ageMaintenanceMultiplier(u.currentHours, cls.lifeHours).toFixed(2)} from ageing`}
                    >
                      {(lifePct * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      value={u.annualHours}
                      onChange={(e) => updateUnit(u.id, { annualHours: Number(e.target.value) })}
                      className="w-16 rounded-md border border-line bg-card px-1.5 py-0.5 text-right tabular text-ink focus:border-accent focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular text-inksoft">{usdCompact(cost.operating)}</td>
                  <td className="px-4 py-2 text-right tabular font-semibold text-ink">{usdCompact(cost.total)}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={u.status}
                      onChange={(v) => updateUnit(u.id, { status: v as FleetUnit["status"] })}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "standby", label: "Standby" },
                        { value: "down", label: "Down" },
                      ]}
                      className="!py-0.5"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => removeUnit(u.id)}
                      className="text-inkfaint hover:text-danger"
                      title="Remove unit"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-inkfaint">
                    No units yet. Add one to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between text-xs text-inkfaint">
        <p>
          Total $/yr = age-adjusted operating + owning. Edit hours inline; values
          recalc instantly and feed the CAPEX Planner.
        </p>
        <button onClick={resetAll} className="underline-offset-2 hover:text-ink hover:underline">
          Reset sample fleet
        </button>
      </div>
    </div>
  );
}

function AddUnitForm({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (u: FleetUnit) => void;
}) {
  const [classId, setClassId] = useState(EQUIVALENCE_CLASSES[0].id);
  const modelsForClass = MODELS.filter((m) => m.classId === classId);
  const [modelId, setModelId] = useState(modelsForClass[0]?.id ?? "");
  const [unitNo, setUnitNo] = useState("");
  const [year, setYear] = useState(2024);
  const [currentHours, setCurrentHours] = useState(0);
  const [annualHours, setAnnualHours] = useState(4000);
  const [site, setSite] = useState("");

  const handleClass = (id: string) => {
    setClassId(id);
    const first = MODELS.find((m) => m.classId === id);
    setModelId(first?.id ?? "");
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
      site: site || "Unassigned",
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
          <Select
            value={modelId}
            onChange={setModelId}
            options={modelsForClass.map((m) => ({ value: m.id, label: `${m.brand} ${m.model}` }))}
            className="w-full"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Unit no.</span>
          <TextInput value={unitNo} onChange={setUnitNo} placeholder="HT-01" className="w-full" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-inksoft">Site</span>
          <TextInput value={site} onChange={setSite} placeholder="Limestone Quarry" className="w-full" />
        </label>
        <NumberField label="Year" value={year} onChange={setYear} />
        <NumberField label="Current hours" value={currentHours} onChange={setCurrentHours} step={100} />
        <NumberField label="Hours / year" value={annualHours} onChange={setAnnualHours} step={100} />
        <div className="flex items-end gap-2">
          <Button onClick={submit}>Add</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
