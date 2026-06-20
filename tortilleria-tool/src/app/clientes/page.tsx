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
  Badge,
  EmptyState,
} from "@/components/ui";
import { ModuleIntro } from "@/components/ModuleIntro";
import { IconPlus } from "@/components/Icons";
import { useClientes } from "@/lib/clientesStore";
import { useVentas } from "@/lib/ventasStore";
import { mxn } from "@/lib/engine";
import type { Cliente, TipoCliente } from "@/lib/types";

export default function ClientesPage() {
  const { clientes, addCliente, darDeBaja, updateSaldo } = useClientes();
  const { ventas } = useVentas();

  const [open, setOpen] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [pagoOpen, setPagoOpen] = useState<string | null>(null);
  const [pagoMonto, setPagoMonto] = useState(0);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCliente>("mayoreo");
  const [rfc, setRfc] = useState("");
  const [tel, setTel] = useState("");

  const totalSaldo = clientes.reduce((a, c) => a + c.saldoPendiente, 0);
  const activos = clientes.filter((c) => c.activo).length;

  const ventasCliente = useMemo(() => {
    if (!detalle) return [];
    return ventas.filter((v) => v.clienteId === detalle).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [detalle, ventas]);

  function guardar() {
    if (!nombre.trim()) return;
    const nuevo: Cliente = {
      id: `cl-${Date.now()}`,
      nombre: nombre.trim(),
      tipo,
      rfc: rfc.trim() || "XAXX010101000",
      telefono: tel.trim() || undefined,
      saldoPendiente: 0,
      activo: true,
    };
    addCliente(nuevo);
    setOpen(false);
    setNombre("");
    setRfc("");
    setTel("");
  }

  function registrarPago() {
    if (pagoOpen && pagoMonto > 0) {
      updateSaldo(pagoOpen, -pagoMonto);
    }
    setPagoOpen(null);
    setPagoMonto(0);
  }

  const detalleCliente = clientes.find((c) => c.id === detalle);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Catálogo de clientes y saldos pendientes"
        actions={
          <Button onClick={() => setOpen(true)}>
            <IconPlus size={16} /> Alta Cliente
          </Button>
        }
      />

      <ModuleIntro
        id="clientes"
        title="Cómo funciona este módulo"
        description="Administra tus clientes de menudeo y mayoreo, su RFC para facturación y el saldo pendiente de ventas a crédito. Registra pagos para reducir el saldo. Da clic en un cliente para ver su historial de ventas."
        connections={["Recibe de: Ventas (saldo)", "Alimenta: Impuestos (RFC)"]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Clientes activos" value={String(activos)} tone="accent" />
        <StatCard label="Saldo total por cobrar" value={mxn(totalSaldo)} tone={totalSaldo > 0 ? "danger" : "success"} />
        <StatCard label="Total clientes" value={String(clientes.length)} />
      </div>

      <SectionTitle className="mb-2">Catálogo</SectionTitle>
      {clientes.length === 0 ? (
        <EmptyState message="No hay clientes registrados." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold">RFC</th>
                  <th className="px-3 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-3 py-2 text-right font-semibold">Saldo</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">
                      <button onClick={() => setDetalle(c.id)} className="font-medium hover:underline" style={{ color: "var(--ink)" }}>
                        {c.nombre}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={c.tipo === "mayoreo" ? "accent" : "default"}>{c.tipo}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{c.rfc}</td>
                    <td className="px-3 py-2">{c.telefono ?? "—"}</td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-semibold"
                      style={{ color: c.saldoPendiente > 0 ? "var(--terracota)" : "var(--ink)" }}
                    >
                      {mxn(c.saldoPendiente)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={c.activo ? "success" : "default"}>{c.activo ? "Activo" : "Baja"}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        {c.saldoPendiente > 0 && (
                          <Button variant="ghost" onClick={() => { setPagoOpen(c.id); setPagoMonto(c.saldoPendiente); }}>
                            Abonar
                          </Button>
                        )}
                        {c.activo && c.id !== "pub-gen" && (
                          <Button variant="danger" onClick={() => darDeBaja(c.id)}>
                            Baja
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Alta cliente */}
      <Modal open={open} onClose={() => setOpen(false)} title="Alta de Cliente">
        <div className="grid gap-3">
          <TextInput label="Nombre" value={nombre} onChange={setNombre} placeholder="Nombre del cliente" />
          <Select
            label="Tipo"
            value={tipo}
            onChange={(v) => setTipo(v as TipoCliente)}
            options={[
              { value: "menudeo", label: "Menudeo" },
              { value: "mayoreo", label: "Mayoreo" },
            ]}
          />
          <TextInput label="RFC" value={rfc} onChange={setRfc} placeholder="XAXX010101000" />
          <TextInput label="Teléfono" value={tel} onChange={setTel} placeholder="Opcional" />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>Guardar cliente</Button>
          </div>
        </div>
      </Modal>

      {/* Registrar pago */}
      <Modal open={pagoOpen !== null} onClose={() => setPagoOpen(null)} title="Registrar abono">
        <div className="grid gap-3">
          <NumberField label="Monto del abono" value={pagoMonto} onChange={setPagoMonto} suffix="$" />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPagoOpen(null)}>
              Cancelar
            </Button>
            <Button onClick={registrarPago}>Registrar</Button>
          </div>
        </div>
      </Modal>

      {/* Detalle / historial */}
      <Modal open={detalle !== null} onClose={() => setDetalle(null)} title={detalleCliente?.nombre ?? "Cliente"}>
        <div>
          <p className="mb-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            RFC {detalleCliente?.rfc} · Saldo {mxn(detalleCliente?.saldoPendiente ?? 0)}
          </p>
          {ventasCliente.length === 0 ? (
            <EmptyState message="Sin ventas registradas." />
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--ink-muted)" }}>
                    <th className="px-2 py-1 text-left">Fecha</th>
                    <th className="px-2 py-1 text-right">Kg</th>
                    <th className="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasCliente.map((v) => (
                    <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="px-2 py-1">{v.fecha}</td>
                      <td className="px-2 py-1 text-right">{v.lineas.reduce((a, l) => a + l.kgVendidos, 0)}</td>
                      <td className="px-2 py-1 text-right">{mxn(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
