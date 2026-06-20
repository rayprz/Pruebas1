"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PageHeader, StatCard, Card, SectionTitle, Badge, EmptyState } from "@/components/ui";
import { IconAlert } from "@/components/Icons";
import { useVentas } from "@/lib/ventasStore";
import { useProduccion } from "@/lib/produccionStore";
import { useNomina } from "@/lib/nominaStore";
import { useMateriaPrima } from "@/lib/materiaPrimaStore";
import { useGasto } from "@/lib/gastoStore";
import { useInventario } from "@/lib/inventarioStore";
import {
  mxn,
  pct,
  rendimientoPromedio,
  alertasStock,
  calcularPyL,
  monthRange,
  bimestreRanges,
  monthsOfYear,
} from "@/lib/engine";

const TODAY = "2026-06-20"; // app "current" date for demo data context

export default function Dashboard() {
  const { ventas } = useVentas();
  const { lotes } = useProduccion();
  const { empleados, pagos } = useNomina();
  const { insumos, compras } = useMateriaPrima();
  const { gastos } = useGasto();
  const { ajustes } = useInventario();

  // The seed data lives in Apr-May 2026, so use latest sale date as "hoy" for relevance
  const latestVentaDate = useMemo(
    () => ventas.reduce((m, v) => (v.fecha > m ? v.fecha : m), "0000-00-00"),
    [ventas]
  );
  const refDay = latestVentaDate > "2000" ? latestVentaDate : TODAY;

  const ventasHoy = useMemo(() => ventas.filter((v) => v.fecha === refDay), [ventas, refDay]);
  const totalHoy = ventasHoy.reduce((a, v) => a + v.total, 0);
  const kgHoy = ventasHoy.reduce((a, v) => a + v.lineas.reduce((s, l) => s + l.kgVendidos, 0), 0);
  const empActivos = empleados.filter((e) => e.activo).length;
  const rendProm = rendimientoPromedio(lotes) * 100;

  const alertas = useMemo(
    () => alertasStock(insumos, compras, lotes, ajustes),
    [insumos, compras, lotes, ajustes]
  );

  // P&L of the month containing refDay
  const monthOfRef = refDay.slice(0, 7);
  const { inicio, fin } = monthRange(monthOfRef);
  const pyl = useMemo(
    () => calcularPyL(ventas, lotes, compras, insumos, gastos, pagos, inicio, fin),
    [ventas, lotes, compras, insumos, gastos, pagos, inicio, fin]
  );

  // chart: last 7 days from refDay
  const chartData = useMemo(() => {
    const days = (() => {
      const out: string[] = [];
      const b = new Date(refDay + "T00:00:00");
      for (let i = 6; i >= 0; i--) {
        const d = new Date(b);
        d.setDate(b.getDate() - i);
        out.push(d.toISOString().slice(0, 10));
      }
      return out;
    })();
    return days.map((d) => ({
      dia: d.slice(5),
      ventas: ventas.filter((v) => v.fecha === d).reduce((a, v) => a + v.total, 0),
    }));
  }, [ventas, refDay]);

  // upcoming fiscal deadlines
  const deadlines = useMemo(() => {
    const today = new Date(TODAY + "T00:00:00");
    const bims = bimestreRanges(2026).map((b) => ({
      tipo: "ISR Bimestral",
      label: b.label,
      vencimiento: b.vencimiento,
    }));
    const meses = monthsOfYear(2026).map((m) => ({
      tipo: "IVA Mensual",
      label: m.label,
      vencimiento: m.vencimiento,
    }));
    return [...bims, ...meses]
      .map((d) => {
        const due = new Date(d.vencimiento + "T00:00:00");
        const dias = Math.round((due.getTime() - today.getTime()) / 86400000);
        return { ...d, dias };
      })
      .filter((d) => d.dias >= -5)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 6);
  }, []);

  const utilTone = pyl.utilidadNeta >= 0 ? "success" : "danger";

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Resumen del negocio · día de referencia ${refDay}`} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ventas del día" value={mxn(totalHoy)} subtitle={refDay} tone="accent" />
        <StatCard label="Kg vendidos del día" value={`${kgHoy.toLocaleString("es-MX")} kg`} />
        <StatCard label="Empleados activos" value={String(empActivos)} />
        <StatCard label="Rendimiento promedio" value={pct(rendProm)} subtitle="tortillas / masa" tone="success" />
      </div>

      {/* Alertas de stock */}
      <div className="mb-5">
        <SectionTitle className="mb-2">Alertas de inventario</SectionTitle>
        {alertas.length === 0 ? (
          <EmptyState message="Todo el inventario está por encima del mínimo." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alertas.map((a) => (
              <Card key={a.insumoId} className="p-4" >
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--terracota)" }}>
                    <IconAlert size={18} />
                  </span>
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>
                    {a.nombre}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                  Stock {a.stockActual.toFixed(1)} {a.unidad} · mínimo {a.stockMinimo} {a.unidad}
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--terracota)" }}>
                  Faltan {a.faltante.toFixed(1)} {a.unidad}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {/* ventas chart */}
        <Card className="p-4">
          <SectionTitle className="mb-3">Ventas últimos 7 días</SectionTitle>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => mxn(v)} />
                <Bar dataKey="ventas" fill="var(--maiz)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* fiscal deadlines */}
        <Card className="p-4">
          <SectionTitle className="mb-3">Próximas declaraciones</SectionTitle>
          <ul className="flex flex-col gap-2">
            {deadlines.map((d) => (
              <li
                key={`${d.tipo}-${d.label}`}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: d.dias <= 30 ? "var(--terracota-light)" : "#faf6ee" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {d.tipo}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {d.label} · vence {d.vencimiento}
                  </p>
                </div>
                <Badge tone={d.dias <= 30 ? "danger" : "default"}>
                  {d.dias < 0 ? "Vencida" : `${d.dias} días`}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* P&L summary */}
      <SectionTitle className="mb-2">Resultado del mes ({monthOfRef})</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Ingresos" value={mxn(pyl.ingresos)} tone="accent" />
        <StatCard
          label="Gastos totales"
          value={mxn(pyl.costoMP + pyl.costoLaboral + pyl.otrosGastos)}
        />
        <StatCard
          label="Utilidad neta"
          value={mxn(pyl.utilidadNeta)}
          subtitle={`Margen ${pct(pyl.margenNeto)}`}
          tone={utilTone}
        />
      </div>
    </div>
  );
}
