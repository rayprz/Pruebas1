"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader, Card, SectionTitle, Segmented, Pill, Badge, StatCard } from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { useVentas } from "@/lib/ventasStore";
import { useGasto } from "@/lib/gastoStore";
import { useMateriaPrima } from "@/lib/materiaPrimaStore";
import { useNomina } from "@/lib/nominaStore";
import {
  mxn,
  pct,
  bimestreRanges,
  monthsOfYear,
  calcularISRBimestral,
  calcularIVAMensual,
  resumenFormaPago,
  currentBimestre,
} from "@/lib/engine";

const YEAR = 2026;

export default function ImpuestosPage() {
  const { ventas } = useVentas();
  const { gastos } = useGasto();
  const { compras } = useMateriaPrima();
  const { pagos } = useNomina();

  const [tab, setTab] = useState("isr");

  const bims = useMemo(() => bimestreRanges(YEAR), []);
  const meses = useMemo(() => monthsOfYear(YEAR), []);
  const activeBim = currentBimestre().label;

  const isrResults = useMemo(
    () =>
      bims.map((b) => ({
        ...b,
        res: calcularISRBimestral(ventas, gastos, compras, pagos, b.inicio, b.fin, b.label),
      })),
    [bims, ventas, gastos, compras, pagos]
  );

  const ivaResults = useMemo(
    () =>
      meses.map((m) => {
        const inicio = `${m.ym}-01`;
        const fin = `${m.ym}-31`;
        return { ...m, res: calcularIVAMensual(compras, gastos, inicio, fin, m.label) };
      }),
    [meses, compras, gastos]
  );

  // Forma de pago tab
  const [fpPeriodo, setFpPeriodo] = useState("2026-05");
  const fpRange = { inicio: `${fpPeriodo}-01`, fin: `${fpPeriodo}-31` };
  const resumen = useMemo(
    () => resumenFormaPago(ventas, fpRange.inicio, fpRange.fin),
    [ventas, fpRange.inicio, fpRange.fin]
  );
  const fpChart = [
    { name: "Efectivo", monto: +resumen.efectivo.toFixed(0) },
    { name: "Transferencia", monto: +resumen.transferencia.toFixed(0) },
    { name: "T. Crédito", monto: +resumen.tarjetaCredito.toFixed(0) },
    { name: "T. Débito", monto: +resumen.tarjetaDebito.toFixed(0) },
    { name: "Crédito", monto: +resumen.credito.toFixed(0) },
  ];

  return (
    <div>
      <PageHeader title="Impuestos (RESICO)" subtitle="Obligaciones fiscales del Régimen Simplificado de Confianza" />

      <ModuleIntro
        id="impuestos"
        title="Cómo funciona este módulo"
        description="Bajo RESICO el ISR se paga bimestralmente sobre ingresos cobrados con tasas del 1% al 2.5%. El IVA es mensual; las tortillas tienen tasa 0% (no se traslada IVA), pero el IVA pagado en insumos con CFDI es acreditable y genera saldo a favor."
        connections={["Recibe de: Ventas, Gastos, Materia Prima, Nómina"]}
      />

      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "isr", label: "ISR Bimestral" },
            { value: "iva", label: "IVA Mensual" },
            { value: "fp", label: "Por Forma de Pago" },
          ]}
        />
      </div>

      {tab === "isr" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isrResults.map(({ label, vencimiento, res }) => {
            const active = label === activeBim;
            const tieneIngresos = res.ingresosBrutos > 0;
            return (
              <Card
                key={label}
                className={active ? "p-4 ring-2" : "p-4"}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold" style={{ color: "var(--ink)" }}>
                    {label}
                  </span>
                  {active ? <Badge tone="accent">Actual</Badge> : <Badge tone={tieneIngresos ? "warning" : "default"}>{tieneIngresos ? "Pendiente" : "Sin actividad"}</Badge>}
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--ink-muted)" }}>Ingresos brutos</dt>
                    <dd className="tabular-nums">{mxn(res.ingresosBrutos)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--ink-muted)" }}>Gastos deducibles</dt>
                    <dd className="tabular-nums">{mxn(res.gastosDeducibles)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--ink-muted)" }}>Nómina deducible</dt>
                    <dd className="tabular-nums">{mxn(res.nominaDeducible)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "var(--ink-muted)" }}>Tasa aplicada</dt>
                    <dd className="tabular-nums">{pct(res.tasaAplicada * 100)}</dd>
                  </div>
                  <div
                    className="mt-1 flex justify-between border-t pt-1 font-bold"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <dt>ISR a cargo</dt>
                    <dd className="tabular-nums" style={{ color: "var(--terracota)" }}>
                      {mxn(res.isrACargo)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: "var(--ink-muted)" }}>
                    <dt>Vence</dt>
                    <dd>{vencimiento}</dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "iva" && (
        <>
          <div
            className="mb-4 rounded-xl p-3 text-sm"
            style={{ background: "var(--success-light)", color: "var(--success)" }}
          >
            Las tortillas de maíz están gravadas a tasa 0% de IVA: no se traslada IVA en las ventas, pero el IVA
            pagado en insumos con CFDI (gas, cal, bolsas) es acreditable y genera saldo a favor.
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ivaResults.map(({ label, vencimiento, res }) => {
              const tiene = res.ivaAcreditable > 0;
              return (
                <Card key={label} className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-bold" style={{ color: "var(--ink)" }}>
                      {label}
                    </span>
                    <Badge tone={tiene ? "success" : "default"}>{tiene ? "A favor" : "Sin actividad"}</Badge>
                  </div>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--ink-muted)" }}>IVA trasladado</dt>
                      <dd className="tabular-nums">{mxn(res.ivaTrasladado, 2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: "var(--ink-muted)" }}>IVA acreditable</dt>
                      <dd className="tabular-nums">{mxn(res.ivaAcreditable, 2)}</dd>
                    </div>
                    <div
                      className="mt-1 flex justify-between border-t pt-1 font-bold"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <dt>IVA a favor</dt>
                      <dd className="tabular-nums" style={{ color: "var(--success)" }}>
                        {mxn(res.ivaAFavor, 2)}
                      </dd>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--ink-muted)" }}>
                      <dt>Vence</dt>
                      <dd>{vencimiento}</dd>
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === "fp" && (
        <>
          <div className="mb-4 flex gap-2">
            {["2026-04", "2026-05"].map((m) => (
              <Pill key={m} label={m} active={fpPeriodo === m} onClick={() => setFpPeriodo(m)} />
            ))}
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="Efectivo" value={mxn(resumen.efectivo)} />
            <StatCard label="Total digital" value={mxn(resumen.totalDigital)} tone="accent" />
            <StatCard label="A crédito" value={mxn(resumen.credito)} tone="warning" />
          </div>
          <Card className="mb-5 p-4">
            <SectionTitle className="mb-3">Distribución por forma de pago</SectionTitle>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={fpChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => mxn(v)} />
                  <Bar dataKey="monto" fill="var(--maiz)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <SectionTitle className="mb-2">Detalle para reporte SAT</SectionTitle>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-left font-semibold">Forma de pago SAT</th>
                  <th className="px-3 py-2 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["01 — Efectivo", resumen.efectivo],
                  ["03 — Transferencia SPEI", resumen.transferencia],
                  ["04 — Tarjeta de crédito", resumen.tarjetaCredito],
                  ["28 — Tarjeta de débito", resumen.tarjetaDebito],
                  ["99 — Por definir (crédito)", resumen.credito],
                ].map(([label, monto]) => (
                  <tr key={label as string} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{mxn(monto as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
