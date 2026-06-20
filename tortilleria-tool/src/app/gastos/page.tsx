"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  PageHeader,
  StatCard,
  Card,
  SectionTitle,
  Button,
  Modal,
  NumberField,
  Select,
  TextInput,
  Pill,
  Badge,
  EmptyState,
} from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { IconPlus, IconTrash } from "@/components/Icons";
import { useGasto } from "@/lib/gastoStore";
import { mxn, inPeriod } from "@/lib/engine";
import type { Gasto, CategoriaGasto, FormaPagoSAT } from "@/lib/types";

const CATS: { value: CategoriaGasto; label: string }[] = [
  { value: "gas", label: "Gas" },
  { value: "electricidad", label: "Electricidad" },
  { value: "renta", label: "Renta" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "empaque", label: "Empaque" },
  { value: "otros", label: "Otros" },
];
const COLORS = ["#f5c842", "#c0533a", "#2d7a3a", "#d97706", "#5b7c8a", "#9a7a10"];
const MESES = [
  { value: "todos", label: "Todos" },
  { value: "2026-04", label: "Abril" },
  { value: "2026-05", label: "Mayo" },
];

const ivaOf = (m: number) => +(m - m / 1.16).toFixed(2);

export default function GastosPage() {
  const { gastos, addGasto, removeGasto } = useGasto();

  const [catFilter, setCatFilter] = useState<string>("todas");
  const [mes, setMes] = useState("todos");
  const [open, setOpen] = useState(false);

  const [fecha, setFecha] = useState("2026-06-01");
  const [categoria, setCategoria] = useState<CategoriaGasto>("otros");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState(0);
  const [tieneCFDI, setTieneCFDI] = useState(true);
  const [formaPago, setFormaPago] = useState<FormaPagoSAT>("03");

  const filtered = useMemo(() => {
    return gastos
      .filter((g) => (catFilter === "todas" ? true : g.categoría === catFilter))
      .filter((g) => (mes === "todos" ? true : inPeriod(g.fecha, `${mes}-01`, `${mes}-31`)))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [gastos, catFilter, mes]);

  const total = filtered.reduce((a, g) => a + g.monto, 0);
  const deducible = filtered.filter((g) => g.tieneCFDI).reduce((a, g) => a + g.monto, 0);
  const ivaTotal = filtered.filter((g) => g.tieneCFDI).reduce((a, g) => a + g.ivaAcreditado, 0);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of filtered) map.set(g.categoría, (map.get(g.categoría) ?? 0) + g.monto);
    return [...map.entries()].map(([name, value]) => ({ name, value: +value.toFixed(0) }));
  }, [filtered]);

  function guardar() {
    if (monto <= 0) return;
    const g: Gasto = {
      id: `g-${Date.now()}`,
      fecha,
      categoría: categoria,
      descripción: descripcion || "—",
      monto,
      tieneCFDI,
      ivaAcreditado: tieneCFDI ? ivaOf(monto) : 0,
      formaPago,
    };
    addGasto(g);
    setOpen(false);
    setDescripcion("");
    setMonto(0);
  }

  return (
    <div>
      <PageHeader
        title="Gastos Operativos"
        subtitle="Gastos del negocio (excluye nómina)"
        actions={
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Nuevo Gasto
          </Button>
        }
      />

      <ModuleIntro
        id="gastos"
        title="Cómo funciona este módulo"
        description="Registra renta, electricidad, gas, mantenimiento y otros gastos. Sólo los gastos con CFDI son deducibles de ISR y permiten acreditar IVA. Se reflejan en costos por kg y en el estado de resultados."
        connections={["Alimenta: Costos", "Alimenta: P&L", "Alimenta: Impuestos"]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill label="Todas las categorías" active={catFilter === "todas"} onClick={() => setCatFilter("todas")} />
        {CATS.map((c) => (
          <Pill key={c.value} label={c.label} active={catFilter === c.value} onClick={() => setCatFilter(c.value)} />
        ))}
        <span className="mx-2" style={{ color: "var(--line)" }}>
          |
        </span>
        {MESES.map((m) => (
          <Pill key={m.value} label={m.label} active={mes === m.value} onClick={() => setMes(m.value)} />
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total gastos" value={mxn(total)} tone="accent" />
        <StatCard label="Deducible (con CFDI)" value={mxn(deducible)} tone="success" />
        <StatCard label="IVA acreditable" value={mxn(ivaTotal, 2)} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle className="mb-3">Por categoría</SectionTitle>
          {pieData.length === 0 ? (
            <EmptyState message="Sin datos." />
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => mxn(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold">Categoría</th>
                <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                <th className="px-3 py-2 text-right font-semibold">Monto</th>
                <th className="px-3 py-2 text-left font-semibold">CFDI</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center" style={{ color: "var(--ink-muted)" }}>
                    Sin gastos.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">{g.fecha}</td>
                    <td className="px-3 py-2">
                      <Badge tone="accent">{g.categoría}</Badge>
                    </td>
                    <td className="px-3 py-2">{g.descripción}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{mxn(g.monto)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={g.tieneCFDI ? "success" : "danger"}>{g.tieneCFDI ? "Sí" : "No"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeGasto(g.id)} style={{ color: "var(--terracota)" }} title="Eliminar">
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo Gasto">
        <div className="grid gap-3">
          <TextInput label="Fecha" value={fecha} onChange={setFecha} />
          <Select
            label="Categoría"
            value={categoria}
            onChange={(v) => setCategoria(v as CategoriaGasto)}
            options={CATS}
          />
          <TextInput label="Descripción" value={descripcion} onChange={setDescripcion} />
          <NumberField label="Monto" value={monto} onChange={setMonto} suffix="$" />
          <Select
            label="Forma de pago"
            value={formaPago}
            onChange={(v) => setFormaPago(v as FormaPagoSAT)}
            options={[
              { value: "01", label: "Efectivo" },
              { value: "03", label: "Transferencia" },
              { value: "04", label: "T. Crédito" },
              { value: "28", label: "T. Débito" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={tieneCFDI} onChange={(e) => setTieneCFDI(e.target.checked)} />
            Tiene CFDI (deducible / IVA acreditable)
          </label>
          {tieneCFDI && monto > 0 && (
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
              IVA acreditable estimado: {mxn(ivaOf(monto), 2)}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar gasto</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
