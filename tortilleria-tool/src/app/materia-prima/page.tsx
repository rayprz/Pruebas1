"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
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
import { useMateriaPrima } from "@/lib/materiaPrimaStore";
import { useProduccion } from "@/lib/produccionStore";
import { useInventario } from "@/lib/inventarioStore";
import { mxn, calcularStockInsumo } from "@/lib/engine";
import type { CompraInsumo } from "@/lib/types";

export default function MateriaPrimaPage() {
  const { insumos, compras, updateInsumo, addCompra, removeCompra } = useMateriaPrima();
  const { lotes } = useProduccion();
  const { ajustes } = useInventario();

  const [editId, setEditId] = useState<string | null>(null);
  const [editCosto, setEditCosto] = useState(0);
  const [editMin, setEditMin] = useState(0);

  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState("2026-06-01");
  const [insumoId, setInsumoId] = useState(insumos[0]?.id ?? "maiz");
  const [cantidad, setCantidad] = useState(100);
  const [costoUnitario, setCostoUnitario] = useState(8.5);
  const [proveedor, setProveedor] = useState("");
  const [tieneCFDI, setTieneCFDI] = useState(true);

  const stockMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of insumos) m[i.id] = calcularStockInsumo(i.id, insumos, compras, lotes, ajustes);
    return m;
  }, [insumos, compras, lotes, ajustes]);

  const insumoSel = insumos.find((i) => i.id === insumoId);

  function startEdit(id: string) {
    const i = insumos.find((x) => x.id === id);
    if (!i) return;
    setEditId(id);
    setEditCosto(i.costoUnitario);
    setEditMin(i.stockMinimo);
  }

  function saveEdit() {
    if (editId) updateInsumo(editId, { costoUnitario: editCosto, stockMinimo: editMin });
    setEditId(null);
  }

  function guardarCompra() {
    const total = cantidad * costoUnitario;
    const ivaAcred = insumoSel?.ivaAcreditable && tieneCFDI ? +(total - total / 1.16).toFixed(2) : 0;
    const c: CompraInsumo = {
      id: `c-${Date.now()}`,
      insumoId,
      fecha,
      cantidad,
      costoUnitario,
      costoSinIva: +(total - ivaAcred).toFixed(2),
      ivaAcreditado: ivaAcred,
      proveedor: proveedor || "—",
      tieneCFDI,
    };
    addCompra(c);
    setOpen(false);
    setProveedor("");
  }

  const sortedCompras = useMemo(
    () => [...compras].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    [compras]
  );

  return (
    <div>
      <PageHeader
        title="Materia Prima"
        subtitle="Catálogo de insumos y registro de compras"
        actions={
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Nueva Compra
          </Button>
        }
      />

      <ModuleIntro
        id="materia-prima"
        title="Cómo funciona este módulo"
        description="Define tus insumos (maíz, cal, sal, bolsas, gas) con su costo y stock mínimo. Cada compra suma al inventario y, si tiene CFDI y es un insumo gravado, calcula el IVA acreditable automáticamente."
        connections={["Alimenta: Inventario", "Alimenta: Costos", "Alimenta: Impuestos (IVA)"]}
      />

      <SectionTitle className="mb-2">Catálogo de insumos</SectionTitle>
      <Card className="mb-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                <th className="px-3 py-2 text-left font-semibold">Insumo</th>
                <th className="px-3 py-2 text-left font-semibold">Unidad</th>
                <th className="px-3 py-2 text-right font-semibold">Costo</th>
                <th className="px-3 py-2 text-right font-semibold">Stock</th>
                <th className="px-3 py-2 text-right font-semibold">Mínimo</th>
                <th className="px-3 py-2 text-left font-semibold">IVA</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-3 py-2 font-medium">{i.nombre}</td>
                  <td className="px-3 py-2">{i.unidad}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{mxn(i.costoUnitario, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(stockMap[i.id] ?? 0).toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.stockMinimo}</td>
                  <td className="px-3 py-2">
                    <Badge tone={i.ivaAcreditable ? "accent" : "default"}>{i.ivaAcreditable ? "16%" : "0%"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" onClick={() => startEdit(i.id)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionTitle className="mb-2">Historial de compras</SectionTitle>
      {sortedCompras.length === 0 ? (
        <EmptyState message="No hay compras registradas." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Insumo</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                  <th className="px-3 py-2 text-right font-semibold">Costo/u</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">IVA</th>
                  <th className="px-3 py-2 text-left font-semibold">Proveedor</th>
                  <th className="px-3 py-2 text-left font-semibold">CFDI</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedCompras.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">{c.fecha}</td>
                    <td className="px-3 py-2">{insumos.find((i) => i.id === c.insumoId)?.nombre ?? c.insumoId}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.cantidad}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{mxn(c.costoUnitario, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{mxn(c.cantidad * c.costoUnitario)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{mxn(c.ivaAcreditado, 2)}</td>
                    <td className="px-3 py-2">{c.proveedor}</td>
                    <td className="px-3 py-2">
                      <Badge tone={c.tieneCFDI ? "success" : "default"}>{c.tieneCFDI ? "Sí" : "No"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeCompra(c.id)} style={{ color: "var(--terracota)" }} title="Eliminar">
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

      {/* Editar insumo */}
      <Modal open={editId !== null} onClose={() => setEditId(null)} title={`Editar ${insumos.find((i) => i.id === editId)?.nombre ?? ""}`}>
        <div className="grid gap-3">
          <NumberField label="Costo unitario" value={editCosto} onChange={setEditCosto} step={0.1} suffix="$" />
          <NumberField label="Stock mínimo" value={editMin} onChange={setEditMin} />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditId(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Nueva compra */}
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva Compra">
        <div className="grid gap-3">
          <TextInput label="Fecha" value={fecha} onChange={setFecha} />
          <Select
            label="Insumo"
            value={insumoId}
            onChange={setInsumoId}
            options={insumos.map((i) => ({ value: i.id, label: i.nombre }))}
          />
          <NumberField label="Cantidad" value={cantidad} onChange={setCantidad} />
          <NumberField label="Costo unitario" value={costoUnitario} onChange={setCostoUnitario} step={0.1} suffix="$" />
          <TextInput label="Proveedor" value={proveedor} onChange={setProveedor} placeholder="Nombre del proveedor" />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={tieneCFDI} onChange={(e) => setTieneCFDI(e.target.checked)} />
            Tiene CFDI (factura)
          </label>
          <div className="rounded-lg p-3 text-xs" style={{ background: "var(--maiz-light)", color: "var(--ink-muted)" }}>
            Total {mxn(cantidad * costoUnitario)}
            {insumoSel?.ivaAcreditable && tieneCFDI
              ? ` · IVA acreditable ${mxn((cantidad * costoUnitario) - (cantidad * costoUnitario) / 1.16, 2)}`
              : " · sin IVA acreditable"}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCompra}>Guardar compra</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
