"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
  SectionTitle,
  Button,
  Modal,
  NumberField,
  Select,
  Badge,
  EmptyState,
} from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { IconPlus, IconTrash } from "@/components/Icons";
import { useMateriaPrima } from "@/lib/materiaPrimaStore";
import { useProduccion } from "@/lib/produccionStore";
import { useVentas } from "@/lib/ventasStore";
import { useInventario } from "@/lib/inventarioStore";
import { calcularStockInsumo, calcularStockTortillas } from "@/lib/engine";
import type { AjusteInventario } from "@/lib/types";

function statusOf(stock: number, min: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (stock <= min * 0.5) return { label: "CRÍTICO", tone: "danger" };
  if (stock <= min) return { label: "BAJO", tone: "warning" };
  return { label: "OK", tone: "success" };
}

export default function InventarioPage() {
  const { insumos, compras } = useMateriaPrima();
  const { lotes } = useProduccion();
  const { ventas } = useVentas();
  const { ajustes, addAjuste, removeAjuste } = useInventario();

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(insumos[0]?.id ?? "maiz");
  const [cantidad, setCantidad] = useState(0);
  const [motivo, setMotivo] = useState("conteo físico");

  const stockMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of insumos) m[i.id] = calcularStockInsumo(i.id, insumos, compras, lotes, ajustes);
    return m;
  }, [insumos, compras, lotes, ajustes]);

  const stockTortillas = useMemo(
    () => calcularStockTortillas(ventas, lotes, ajustes),
    [ventas, lotes, ajustes]
  );

  function guardar() {
    if (cantidad === 0) return;
    const a: AjusteInventario = {
      id: `aj-${Date.now()}`,
      fecha: new Date().toISOString().slice(0, 10),
      insumoId: target as AjusteInventario["insumoId"],
      cantidad,
      motivo,
    };
    addAjuste(a);
    setOpen(false);
    setCantidad(0);
  }

  const nombreDe = (id: string) => (id === "tortillas" ? "Tortillas" : insumos.find((i) => i.id === id)?.nombre ?? id);

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Existencias derivadas de compras, producción y ventas"
        actions={
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Ajuste de inventario
          </Button>
        }
      />

      <ModuleIntro
        id="inventario"
        title="Cómo funciona este módulo"
        description="El stock se calcula automáticamente: inventario inicial + compras − consumo en producción + ajustes. Las tortillas terminadas = producción − ventas + ajustes. Usa los ajustes para conteos físicos, mermas u otros."
        connections={["Recibe de: Materia Prima", "Recibe de: Producción", "Recibe de: Ventas"]}
      />

      <SectionTitle className="mb-2">Materia Prima</SectionTitle>
      <Card className="mb-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                <th className="px-3 py-2 text-left font-semibold">Insumo</th>
                <th className="px-3 py-2 text-right font-semibold">Stock</th>
                <th className="px-3 py-2 text-right font-semibold">Mínimo</th>
                <th className="px-3 py-2 text-left font-semibold">Unidad</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const stock = stockMap[i.id] ?? 0;
                const st = statusOf(stock, i.stockMinimo);
                return (
                  <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2 font-medium">{i.nombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{stock.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{i.stockMinimo}</td>
                    <td className="px-3 py-2">{i.unidad}</td>
                    <td className="px-3 py-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionTitle className="mb-2">Producto Terminado</SectionTitle>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Tortillas en stock"
          value={`${stockTortillas.toFixed(1)} kg`}
          subtitle="producción − ventas + ajustes"
          tone={stockTortillas < 0 ? "danger" : "accent"}
        />
      </div>

      <SectionTitle className="mb-2">Ajustes recientes</SectionTitle>
      {ajustes.length === 0 ? (
        <EmptyState message="No hay ajustes de inventario registrados." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold">Insumo</th>
                <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                <th className="px-3 py-2 text-left font-semibold">Motivo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ajustes.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-3 py-2">{a.fecha}</td>
                  <td className="px-3 py-2">{nombreDe(a.insumoId)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums"
                    style={{ color: a.cantidad < 0 ? "var(--terracota)" : "var(--success)" }}
                  >
                    {a.cantidad > 0 ? "+" : ""}
                    {a.cantidad}
                  </td>
                  <td className="px-3 py-2">{a.motivo}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeAjuste(a.id)} style={{ color: "var(--terracota)" }} title="Eliminar">
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Ajuste de inventario">
        <div className="grid gap-3">
          <Select
            label="Producto / insumo"
            value={target}
            onChange={setTarget}
            options={[
              ...insumos.map((i) => ({ value: i.id, label: i.nombre })),
              { value: "tortillas", label: "Tortillas (producto terminado)" },
            ]}
          />
          <NumberField label="Cantidad (+/-)" value={cantidad} onChange={setCantidad} />
          <Select
            label="Motivo"
            value={motivo}
            onChange={setMotivo}
            options={[
              { value: "conteo físico", label: "Conteo físico" },
              { value: "merma", label: "Merma" },
              { value: "otro", label: "Otro" },
            ]}
          />
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Usa valores positivos para añadir y negativos para retirar existencias.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Registrar ajuste</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
