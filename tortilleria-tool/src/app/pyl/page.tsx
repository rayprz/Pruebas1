"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader, Card, SectionTitle, Pill, StatCard } from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { useVentas } from "@/lib/ventasStore";
import { useProduccion } from "@/lib/produccionStore";
import { useMateriaPrima } from "@/lib/materiaPrimaStore";
import { useGasto } from "@/lib/gastoStore";
import { useNomina } from "@/lib/nominaStore";
import { mxn, pct, calcularPyL } from "@/lib/engine";

const PERIODOS = [
  { value: "2026-04", label: "Abril", inicio: "2026-04-01", fin: "2026-04-30" },
  { value: "2026-05", label: "Mayo", inicio: "2026-05-01", fin: "2026-05-31" },
  { value: "bim", label: "Bimestre May-Jun", inicio: "2026-05-01", fin: "2026-06-30" },
  { value: "ytd", label: "Año a la fecha", inicio: "2026-01-01", fin: "2026-12-31" },
];
const COLORS = ["#f5c842", "#c0533a", "#2d7a3a", "#d97706", "#5b7c8a", "#9a7a10"];

export default function PyLPage() {
  const { ventas } = useVentas();
  const { lotes } = useProduccion();
  const { insumos, compras } = useMateriaPrima();
  const { gastos } = useGasto();
  const { pagos } = useNomina();

  const [periodo, setPeriodo] = useState("2026-05");
  const sel = PERIODOS.find((p) => p.value === periodo)!;

  const pyl = useMemo(
    () => calcularPyL(ventas, lotes, compras, insumos, gastos, pagos, sel.inicio, sel.fin),
    [ventas, lotes, compras, insumos, gastos, pagos, sel.inicio, sel.fin]
  );

  // monthly trend Apr-May
  const trend = useMemo(() => {
    return ["2026-04", "2026-05"].map((ym) => {
      const r = calcularPyL(ventas, lotes, compras, insumos, gastos, pagos, `${ym}-01`, `${ym}-31`);
      return {
        mes: ym,
        Ingresos: +r.ingresos.toFixed(0),
        Costos: +(r.costoMP + r.costoLaboral + r.otrosGastos).toFixed(0),
        Utilidad: +r.utilidadNeta.toFixed(0),
      };
    });
  }, [ventas, lotes, compras, insumos, gastos, pagos]);

  const gastosPie = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gastos.filter((g) => g.fecha >= sel.inicio && g.fecha <= sel.fin)) {
      map.set(g.categoría, (map.get(g.categoría) ?? 0) + g.monto);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value: +value.toFixed(0) }));
  }, [gastos, sel.inicio, sel.fin]);

  const Row = ({
    label,
    value,
    margin,
    strong,
    negative,
  }: {
    label: string;
    value: number;
    margin?: number;
    strong?: boolean;
    negative?: boolean;
  }) => (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{
        borderTop: "1px solid var(--line)",
        background: strong ? "var(--maiz-light)" : "transparent",
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span style={{ color: "var(--ink)" }}>{label}</span>
      <span className="flex items-center gap-4">
        <span className="tabular-nums" style={{ color: negative ? "var(--terracota)" : "var(--ink)" }}>
          {negative ? `(${mxn(Math.abs(value))})` : mxn(value)}
        </span>
        {margin !== undefined && (
          <span className="w-14 text-right tabular-nums text-sm" style={{ color: "var(--ink-muted)" }}>
            {pct(margin)}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div>
      <PageHeader title="Estado de Resultados (P&L)" subtitle="Ingresos, costos y utilidad del período" />

      <ModuleIntro
        id="pyl"
        title="Cómo funciona este módulo"
        description="Consolida los ingresos por ventas menos el costo de materia prima (utilidad bruta), menos nómina y gastos operativos (utilidad neta). Es la fotografía financiera del negocio para el período seleccionado."
        connections={["Recibe de: Ventas, Producción, Materia Prima, Nómina, Gastos"]}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Pill key={p.value} label={p.label} active={periodo === p.value} onClick={() => setPeriodo(p.value)} />
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Ingresos" value={mxn(pyl.ingresos)} tone="accent" />
        <StatCard label="Utilidad bruta" value={mxn(pyl.utilidadBruta)} subtitle={`Margen ${pct(pyl.margenBruto)}`} />
        <StatCard
          label="Utilidad neta"
          value={mxn(pyl.utilidadNeta)}
          subtitle={`Margen ${pct(pyl.margenNeto)}`}
          tone={pyl.utilidadNeta >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="mb-5 overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
          <SectionTitle>Estado de resultados · {sel.label}</SectionTitle>
        </div>
        <Row label="INGRESOS" value={pyl.ingresos} strong />
        <Row label="(−) Costo de materia prima" value={-pyl.costoMP} negative />
        <Row label="UTILIDAD BRUTA" value={pyl.utilidadBruta} margin={pyl.margenBruto} strong />
        <Row label="(−) Nómina" value={-pyl.costoLaboral} negative />
        <Row label="(−) Gastos operativos" value={-pyl.otrosGastos} negative />
        <Row label="UTILIDAD NETA" value={pyl.utilidadNeta} margin={pyl.margenNeto} strong />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle className="mb-3">Tendencia mensual</SectionTitle>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => mxn(v)} />
                <Legend />
                <Bar dataKey="Ingresos" fill="#f5c842" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Costos" fill="#c0533a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Utilidad" fill="#2d7a3a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle className="mb-3">Gastos operativos por categoría</SectionTitle>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={gastosPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {gastosPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => mxn(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
