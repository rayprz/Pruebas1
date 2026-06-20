"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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
  Badge,
  EmptyState,
} from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { IconPlus, IconTrash } from "@/components/Icons";
import { useProduccion } from "@/lib/produccionStore";
import { pct, rendimientoPromedio, kgProducidosEnPeriodo, monthRange } from "@/lib/engine";
import type { LoteProduccion, Turno } from "@/lib/types";

const REF_MONTH = "2026-05";

export default function ProduccionPage() {
  const { lotes, addLote, removeLote } = useProduccion();
  const [open, setOpen] = useState(false);

  const [fecha, setFecha] = useState("2026-06-01");
  const [turno, setTurno] = useState<Turno>("mañana");
  const [kgMasa, setKgMasa] = useState(175);
  const [kgTort, setKgTort] = useState(160);
  const [obs, setObs] = useState("");

  const sorted = useMemo(
    () => [...lotes].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 40),
    [lotes]
  );

  const { inicio, fin } = monthRange(REF_MONTH);
  const rendProm = rendimientoPromedio(lotes) * 100;
  const kgMes = kgProducidosEnPeriodo(lotes, inicio, fin);
  const lotesMes = lotes.filter((l) => l.fecha >= inicio && l.fecha <= fin).length;

  // monthly trend (kg per month)
  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lotes) {
      const ym = l.fecha.slice(0, 7);
      map.set(ym, (map.get(ym) ?? 0) + l.kgTortillasProducidas);
    }
    return [...map.entries()].sort().map(([ym, kg]) => ({ mes: ym, kg: +kg.toFixed(0) }));
  }, [lotes]);

  function guardar() {
    const consumo = [
      { insumoId: "maiz", cantidad: +(kgMasa / 1.05).toFixed(1) },
      { insumoId: "cal", cantidad: +(kgMasa * 0.01).toFixed(2) },
      { insumoId: "sal", cantidad: +(kgMasa * 0.002).toFixed(2) },
    ];
    const nuevo: LoteProduccion = {
      id: `l-${Date.now()}`,
      fecha,
      turno,
      kgMasaInicial: kgMasa,
      kgTortillasProducidas: kgTort,
      rendimiento: kgMasa > 0 ? +(kgTort / kgMasa).toFixed(4) : 0,
      consumoInsumos: consumo,
      observaciones: obs || undefined,
    };
    addLote(nuevo);
    setOpen(false);
    setObs("");
  }

  return (
    <div>
      <PageHeader
        title="Producción"
        subtitle="Registro de lotes diarios de masa y tortillas"
        actions={
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Nuevo Lote
          </Button>
        }
      />

      <ModuleIntro
        id="produccion"
        title="Cómo funciona este módulo"
        description="Cada lote registra la masa inicial y los kg de tortilla producidos. El consumo de maíz, cal y sal se calcula automáticamente y descuenta del inventario. El rendimiento mide la eficiencia (tortillas / masa)."
        connections={["Alimenta: Inventario", "Alimenta: Costos", "Alimenta: P&L"]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Rendimiento promedio" value={pct(rendProm)} tone="success" />
        <StatCard label={`Kg producidos (${REF_MONTH})`} value={`${kgMes.toLocaleString("es-MX")} kg`} tone="accent" />
        <StatCard label="Lotes en el mes" value={String(lotesMes)} />
      </div>

      <Card className="mb-5 p-4">
        <SectionTitle className="mb-3">Producción mensual (kg)</SectionTitle>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v} kg`} />
              <Line type="monotone" dataKey="kg" stroke="var(--terracota)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle className="mb-2">Lotes recientes</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState message="No hay lotes registrados." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Turno</th>
                  <th className="px-3 py-2 text-right font-semibold">Kg masa</th>
                  <th className="px-3 py-2 text-right font-semibold">Kg tortillas</th>
                  <th className="px-3 py-2 text-right font-semibold">Rendimiento</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">{l.fecha}</td>
                    <td className="px-3 py-2 capitalize">{l.turno}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.kgMasaInicial}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.kgTortillasProducidas}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={l.rendimiento >= 0.9 ? "success" : "warning"}>
                        {pct(l.rendimiento * 100)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeLote(l.id)} style={{ color: "var(--terracota)" }} title="Eliminar">
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo Lote de Producción">
        <div className="grid gap-3">
          <TextInput label="Fecha" value={fecha} onChange={setFecha} placeholder="2026-06-01" />
          <Select
            label="Turno"
            value={turno}
            onChange={(v) => setTurno(v as Turno)}
            options={[
              { value: "mañana", label: "Mañana" },
              { value: "tarde", label: "Tarde" },
            ]}
          />
          <NumberField label="Kg masa inicial" value={kgMasa} onChange={setKgMasa} suffix="kg" />
          <NumberField label="Kg tortillas producidas" value={kgTort} onChange={setKgTort} suffix="kg" />
          <div className="rounded-lg p-3 text-xs" style={{ background: "var(--maiz-light)", color: "var(--ink-muted)" }}>
            Consumo estimado: maíz {(kgMasa / 1.05).toFixed(1)} kg · cal {(kgMasa * 0.01).toFixed(2)} kg · sal{" "}
            {(kgMasa * 0.002).toFixed(2)} kg · rendimiento{" "}
            {kgMasa > 0 ? pct((kgTort / kgMasa) * 100) : "—"}
          </div>
          <TextInput label="Observaciones" value={obs} onChange={setObs} placeholder="Opcional" />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar lote</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
