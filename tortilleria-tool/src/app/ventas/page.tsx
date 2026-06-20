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
  TextInput,
  Pill,
  Badge,
  EmptyState,
} from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { IconPlus, IconTrash } from "@/components/Icons";
import { useVentas } from "@/lib/ventasStore";
import { useClientes } from "@/lib/clientesStore";
import { useParams } from "@/lib/paramsStore";
import { mxn, pct, inPeriod } from "@/lib/engine";
import type { Venta, FormaPagoSAT } from "@/lib/types";

const FORMA_LABEL: Record<FormaPagoSAT, string> = {
  "01": "Efectivo",
  "03": "Transferencia",
  "04": "T. Crédito",
  "28": "T. Débito",
  "99": "Crédito",
};

const REF_DAY = "2026-05-30";

function periodRange(p: string): { inicio: string; fin: string } {
  if (p === "hoy") return { inicio: REF_DAY, fin: REF_DAY };
  if (p === "semana") {
    const d = new Date(REF_DAY + "T00:00:00");
    const start = new Date(d);
    start.setDate(d.getDate() - 6);
    return { inicio: start.toISOString().slice(0, 10), fin: REF_DAY };
  }
  // mes
  return { inicio: REF_DAY.slice(0, 7) + "-01", fin: REF_DAY.slice(0, 7) + "-31" };
}

export default function VentasPage() {
  const { ventas, addVenta, removeVenta } = useVentas();
  const { clientes, updateSaldo } = useClientes();
  const { params } = useParams();

  const [periodo, setPeriodo] = useState("mes");
  const [open, setOpen] = useState(false);

  const [fecha, setFecha] = useState(REF_DAY);
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [kg, setKg] = useState(10);
  const [precioKg, setPrecioKg] = useState(params.precioMenudeo);
  const [formaPago, setFormaPago] = useState<FormaPagoSAT>("01");
  const [cfdi, setCfdi] = useState(false);

  const cliente = clientes.find((c) => c.id === clienteId);

  function onSelectCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) setPrecioKg(c.tipo === "mayoreo" ? params.precioMayoreo : params.precioMenudeo);
  }

  const { inicio, fin } = periodRange(periodo);
  const enPeriodo = useMemo(
    () => ventas.filter((v) => inPeriod(v.fecha, inicio, fin)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
    [ventas, inicio, fin]
  );

  const totalPeriodo = enPeriodo.reduce((a, v) => a + v.total, 0);
  const menudeoTotal = enPeriodo
    .filter((v) => clientes.find((c) => c.id === v.clienteId)?.tipo === "menudeo")
    .reduce((a, v) => a + v.total, 0);
  const mayoreoTotal = totalPeriodo - menudeoTotal;
  const efectivo = enPeriodo.filter((v) => v.formaPago === "01").reduce((a, v) => a + v.total, 0);
  const digital = totalPeriodo - efectivo;
  const pctDigital = totalPeriodo > 0 ? (digital / totalPeriodo) * 100 : 0;

  function guardar() {
    const subtotal = +(kg * precioKg).toFixed(2);
    const nueva: Venta = {
      id: `v-${Date.now()}`,
      fecha,
      clienteId,
      lineas: [{ kgVendidos: kg, precioKg, subtotal }],
      total: subtotal,
      formaPago,
      cfdiEmitido: cfdi,
    };
    addVenta(nueva);
    if (formaPago === "99") updateSaldo(clienteId, subtotal);
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle="Registro de ventas de menudeo y mayoreo"
        actions={
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Nueva Venta
          </Button>
        }
      />

      <ModuleIntro
        id="ventas"
        title="Cómo funciona este módulo"
        description="Cada venta descuenta tortillas del inventario y registra la forma de pago para reportes al SAT. Las ventas a crédito (99) aumentan el saldo pendiente del cliente. El precio se autocompleta según el tipo de cliente."
        connections={["Alimenta: P&L", "Alimenta: Impuestos", "Alimenta: Clientes (saldo)"]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill label="Hoy" active={periodo === "hoy"} onClick={() => setPeriodo("hoy")} />
        <Pill label="Esta semana" active={periodo === "semana"} onClick={() => setPeriodo("semana")} />
        <Pill label="Este mes" active={periodo === "mes"} onClick={() => setPeriodo("mes")} />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total ventas" value={mxn(totalPeriodo)} tone="accent" />
        <StatCard label="Menudeo" value={mxn(menudeoTotal)} />
        <StatCard label="Mayoreo" value={mxn(mayoreoTotal)} />
        <StatCard label="% digital" value={pct(pctDigital)} subtitle={`${mxn(efectivo)} en efectivo`} tone="success" />
      </div>

      <SectionTitle className="mb-2">Ventas del período</SectionTitle>
      {enPeriodo.length === 0 ? (
        <EmptyState message="No hay ventas en este período." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-right font-semibold">Kg</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-left font-semibold">Pago</th>
                  <th className="px-3 py-2 text-left font-semibold">CFDI</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {enPeriodo.map((v) => {
                  const c = clientes.find((x) => x.id === v.clienteId);
                  const totKg = v.lineas.reduce((a, l) => a + l.kgVendidos, 0);
                  return (
                    <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="px-3 py-2">{v.fecha}</td>
                      <td className="px-3 py-2">{c?.nombre ?? v.clienteId}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totKg}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{mxn(v.total)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={v.formaPago === "99" ? "warning" : v.formaPago === "01" ? "default" : "accent"}>
                          {FORMA_LABEL[v.formaPago]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={v.cfdiEmitido ? "success" : "default"}>{v.cfdiEmitido ? "Sí" : "No"}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeVenta(v.id)} style={{ color: "var(--terracota)" }} title="Eliminar">
                          <IconTrash size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva Venta">
        <div className="grid gap-3">
          <TextInput label="Fecha" value={fecha} onChange={setFecha} />
          <Select
            label="Cliente"
            value={clienteId}
            onChange={onSelectCliente}
            options={clientes.filter((c) => c.activo).map((c) => ({ value: c.id, label: `${c.nombre} (${c.tipo})` }))}
          />
          <NumberField label="Kg vendidos" value={kg} onChange={setKg} suffix="kg" />
          <NumberField label="Precio por kg" value={precioKg} onChange={setPrecioKg} suffix="$" />
          <Select
            label="Forma de pago"
            value={formaPago}
            onChange={(v) => setFormaPago(v as FormaPagoSAT)}
            options={(Object.keys(FORMA_LABEL) as FormaPagoSAT[]).map((k) => ({ value: k, label: FORMA_LABEL[k] }))}
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={cfdi} onChange={(e) => setCfdi(e.target.checked)} />
            CFDI emitido (factura)
          </label>
          <div className="rounded-lg p-3 text-sm font-semibold" style={{ background: "var(--maiz-light)" }}>
            Total: {mxn(kg * precioKg)} {cliente ? `· ${cliente.tipo}` : ""}
          </div>
          {formaPago === "99" && (
            <p className="text-xs" style={{ color: "var(--terracota)" }}>
              Esta venta a crédito aumentará el saldo pendiente del cliente.
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar venta</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
