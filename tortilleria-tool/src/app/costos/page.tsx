"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { PageHeader, StatCard, Card, SectionTitle, Pill } from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { useProduccion } from "@/lib/produccionStore";
import { useMateriaPrima } from "@/lib/materiaPrimaStore";
import { useGasto } from "@/lib/gastoStore";
import { useNomina } from "@/lib/nominaStore";
import { useParams } from "@/lib/paramsStore";
import { mxn, costoTotalPorKg, monthRange } from "@/lib/engine";

const PERIODOS = [
  { value: "2026-04", label: "Abril 2026" },
  { value: "2026-05", label: "Mayo 2026" },
];

export default function CostosPage() {
  const { lotes } = useProduccion();
  const { insumos, compras } = useMateriaPrima();
  const { gastos } = useGasto();
  const { pagos } = useNomina();
  const { params } = useParams();

  const [periodo, setPeriodo] = useState("2026-05");
  const { inicio, fin } = monthRange(periodo);

  const desglose = useMemo(
    () => costoTotalPorKg(lotes, compras, insumos, gastos, pagos, inicio, fin),
    [lotes, compras, insumos, gastos, pagos, inicio, fin]
  );

  const margenMenudeo = params.precioMenudeo - desglose.totalPorKg;
  const margenMayoreo = params.precioMayoreo - desglose.totalPorKg;

  const chartData = [
    {
      periodo: PERIODOS.find((p) => p.value === periodo)?.label ?? periodo,
      "Materia Prima": +desglose.mpPorKg.toFixed(2),
      "Mano de Obra": +desglose.manoObraPorKg.toFixed(2),
      "Gastos Op.": +desglose.gastosOpPorKg.toFixed(2),
    },
  ];

  return (
    <div>
      <PageHeader title="Costos" subtitle="Costo de producción por kilogramo de tortilla" />

      <ModuleIntro
        id="costos"
        title="Cómo funciona este módulo"
        description="Calcula el costo real por kg combinando materia prima consumida, nómina y gastos operativos del período, dividido entre los kg producidos. Compara contra tus precios de venta para ver el margen por kg."
        connections={["Recibe de: Producción, Materia Prima, Nómina, Gastos"]}
      />

      <div className="mb-4 flex gap-2">
        {PERIODOS.map((p) => (
          <Pill key={p.value} label={p.label} active={periodo === p.value} onClick={() => setPeriodo(p.value)} />
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Materia prima / kg" value={mxn(desglose.mpPorKg, 2)} />
        <StatCard label="Mano de obra / kg" value={mxn(desglose.manoObraPorKg, 2)} />
        <StatCard label="Gastos op. / kg" value={mxn(desglose.gastosOpPorKg, 2)} />
        <StatCard label="Costo total / kg" value={mxn(desglose.totalPorKg, 2)} tone="accent" />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Margen menudeo / kg"
          value={mxn(margenMenudeo, 2)}
          subtitle={`Precio ${mxn(params.precioMenudeo)} − costo ${mxn(desglose.totalPorKg, 2)}`}
          tone={margenMenudeo >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Margen mayoreo / kg"
          value={mxn(margenMayoreo, 2)}
          subtitle={`Precio ${mxn(params.precioMayoreo)} − costo ${mxn(desglose.totalPorKg, 2)}`}
          tone={margenMayoreo >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="mb-5 p-4">
        <SectionTitle className="mb-3">Desglose de costo por kg</SectionTitle>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => mxn(v, 2)} />
              <Legend />
              <Bar dataKey="Materia Prima" stackId="a" fill="#f5c842" />
              <Bar dataKey="Mano de Obra" stackId="a" fill="#c0533a" />
              <Bar dataKey="Gastos Op." stackId="a" fill="#5b7c8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle className="mb-2">Componentes del costo</SectionTitle>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
              <th className="px-3 py-2 text-left font-semibold">Componente</th>
              <th className="px-3 py-2 text-right font-semibold">$/kg</th>
              <th className="px-3 py-2 text-right font-semibold">% del total</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Materia prima", desglose.mpPorKg],
              ["Mano de obra", desglose.manoObraPorKg],
              ["Gastos operativos", desglose.gastosOpPorKg],
            ].map(([label, val]) => (
              <tr key={label as string} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-3 py-2">{label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{mxn(val as number, 2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {desglose.totalPorKg > 0 ? (((val as number) / desglose.totalPorKg) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--line)", background: "var(--maiz-light)" }}>
              <td className="px-3 py-2 font-bold">Total</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{mxn(desglose.totalPorKg, 2)}</td>
              <td className="px-3 py-2 text-right font-bold">100%</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
