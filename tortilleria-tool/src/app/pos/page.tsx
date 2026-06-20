"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Modal, Button } from "@/components/ui";
import { useVentas } from "@/lib/ventasStore";
import { useClientes } from "@/lib/clientesStore";
import { useParams } from "@/lib/paramsStore";
import { useProduccion } from "@/lib/produccionStore";
import { useInventario } from "@/lib/inventarioStore";
import { mxn, calcularStockTortillas } from "@/lib/engine";
import type { FormaPagoSAT, Venta, VentaLinea } from "@/lib/types";

const RFC_PUBLICO = "XAXX010101000";

function hoyISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PAGOS: { code: FormaPagoSAT; label: string; emoji: string; digital: boolean }[] = [
  { code: "01", label: "Efectivo", emoji: "💵", digital: false },
  { code: "28", label: "Débito", emoji: "💳", digital: true },
  { code: "04", label: "Crédito", emoji: "💳", digital: true },
  { code: "03", label: "Transferencia", emoji: "📲", digital: true },
  { code: "99", label: "Fiado", emoji: "📒", digital: true },
];

const KG_RAPIDOS = [0.25, 0.5, 1, 2, 3, 5];

interface CartLine {
  id: string;
  kg: number;
  precioKg: number;
}

export default function POSPage() {
  const { ventas, addVenta } = useVentas();
  const { clientes, updateSaldo } = useClientes();
  const { params } = useParams();
  const { lotes } = useProduccion();
  const { ajustes } = useInventario();

  const activos = useMemo(() => clientes.filter((c) => c.activo), [clientes]);
  const [clienteId, setClienteId] = useState<string>(
    activos.find((c) => c.rfc === RFC_PUBLICO)?.id ?? activos[0]?.id ?? ""
  );
  const cliente = clientes.find((c) => c.id === clienteId);
  const precioBase = cliente?.tipo === "mayoreo" ? params.precioMayoreo : params.precioMenudeo;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [kgInput, setKgInput] = useState<string>("");
  const [formaPago, setFormaPago] = useState<FormaPagoSAT>("01");
  const [recibido, setRecibido] = useState<string>("");
  const [cfdi, setCfdi] = useState(false);
  const [ticket, setTicket] = useState<Venta | null>(null);

  const total = useMemo(() => cart.reduce((a, l) => a + l.kg * l.precioKg, 0), [cart]);
  const kgTotal = useMemo(() => cart.reduce((a, l) => a + l.kg, 0), [cart]);

  const stockTortillas = useMemo(
    () => calcularStockTortillas(ventas, lotes, ajustes),
    [ventas, lotes, ajustes]
  );

  // Totales de hoy
  const hoy = hoyISO();
  const ventasHoy = useMemo(() => ventas.filter((v) => v.fecha === hoy), [ventas, hoy]);
  const totalHoy = ventasHoy.reduce((a, v) => a + v.total, 0);
  const kgHoy = ventasHoy.reduce((a, v) => a + v.lineas.reduce((s, l) => s + l.kgVendidos, 0), 0);

  function agregarKg(kg: number) {
    if (kg <= 0) return;
    setCart((c) => [...c, { id: `cl-${Date.now()}-${Math.random()}`, kg, precioKg: precioBase }]);
  }

  function agregarManual() {
    const kg = parseFloat(kgInput.replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0) return;
    agregarKg(Math.round(kg * 1000) / 1000);
    setKgInput("");
  }

  function quitarLinea(id: string) {
    setCart((c) => c.filter((l) => l.id !== id));
  }

  function limpiar() {
    setCart([]);
    setKgInput("");
    setRecibido("");
    setCfdi(false);
    setFormaPago("01");
  }

  const cambio = formaPago === "01" ? (parseFloat(recibido.replace(",", ".")) || 0) - total : 0;

  function cobrar() {
    if (cart.length === 0 || !cliente) return;
    const lineas: VentaLinea[] = cart.map((l) => ({
      kgVendidos: l.kg,
      precioKg: l.precioKg,
      subtotal: Math.round(l.kg * l.precioKg * 100) / 100,
    }));
    const venta: Venta = {
      id: `v-${Date.now()}`,
      fecha: hoy,
      clienteId: cliente.id,
      lineas,
      total: Math.round(total * 100) / 100,
      formaPago,
      cfdiEmitido: cfdi,
      folioCFDI: cfdi ? `POS-${Date.now()}` : undefined,
      nota: "Venta POS",
    };
    addVenta(venta);
    if (formaPago === "99") updateSaldo(cliente.id, venta.total);
    setTicket(venta);
    limpiar();
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado compacto */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Punto de Venta
          </h1>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {params.nombreNegocio} · {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Card className="px-3 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Ventas hoy</p>
            <p className="text-base font-bold tabular-nums" style={{ color: "var(--success)" }}>{mxn(totalHoy)}</p>
          </Card>
          <Card className="px-3 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Tickets</p>
            <p className="text-base font-bold tabular-nums" style={{ color: "var(--ink)" }}>{ventasHoy.length}</p>
          </Card>
          <Card className="px-3 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Kg hoy</p>
            <p className="text-base font-bold tabular-nums" style={{ color: "var(--ink)" }}>{kgHoy.toFixed(1)}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* ── Panel de captura ── */}
        <div className="flex flex-col gap-4">
          {/* Cliente */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
                Cliente
              </span>
              <Badge tone={cliente?.tipo === "mayoreo" ? "accent" : "default"}>
                {cliente?.tipo === "mayoreo" ? "Mayoreo" : "Menudeo"} · {mxn(precioBase)}/kg
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {activos.map((c) => {
                const active = c.id === clienteId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setClienteId(c.id)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                    style={
                      active
                        ? { background: "var(--maiz)", color: "var(--ink)", border: "1px solid var(--maiz)" }
                        : { background: "var(--card)", color: "var(--ink-muted)", border: "1px solid var(--line)" }
                    }
                  >
                    {c.nombre}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Producto: tortilla por kg */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
                Tortilla — agregar kg
              </span>
              <span className="text-xs" style={{ color: stockTortillas < kgTotal ? "var(--danger)" : "var(--ink-muted)" }}>
                Stock: {stockTortillas.toFixed(1)} kg
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {KG_RAPIDOS.map((kg) => (
                <button
                  key={kg}
                  onClick={() => agregarKg(kg)}
                  className="rounded-2xl py-5 text-lg font-bold transition-transform active:scale-95"
                  style={{ background: "var(--maiz-light)", color: "#9a7a10", border: "1px solid var(--maiz)" }}
                >
                  {kg < 1 ? `${kg}` : kg} kg
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={kgInput}
                onChange={(e) => setKgInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarManual()}
                inputMode="decimal"
                placeholder="Kg exactos (ej. 1.75)"
                className="w-full rounded-xl px-3 py-3 text-base focus:outline-none"
                style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
              />
              <Button onClick={agregarManual} className="px-5 py-3 text-base">
                Agregar
              </Button>
            </div>
          </Card>

          {/* Carrito */}
          <Card className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
              Ticket actual
            </span>
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
                Sin productos. Agrega kilos arriba.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {cart.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-lg px-2 py-2"
                    style={{ background: "#faf6ee" }}
                  >
                    <span className="text-sm font-medium tabular-nums" style={{ color: "var(--ink)" }}>
                      {l.kg} kg × {mxn(l.precioKg)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums">{mxn(l.kg * l.precioKg)}</span>
                      <button
                        onClick={() => quitarLinea(l.id)}
                        className="grid h-6 w-6 place-items-center rounded-full text-sm"
                        style={{ color: "var(--terracota)", border: "1px solid var(--terracota)" }}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Panel de cobro ── */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
                Total
              </span>
              <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>
                {mxn(total)}
              </span>
            </div>
            <p className="mt-1 text-right text-xs" style={{ color: "var(--ink-muted)" }}>
              {kgTotal.toFixed(2)} kg
            </p>
          </Card>

          {/* Forma de pago */}
          <Card className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
              Forma de pago (SAT)
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PAGOS.map((p) => {
                const active = p.code === formaPago;
                return (
                  <button
                    key={p.code}
                    onClick={() => setFormaPago(p.code)}
                    className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition-colors"
                    style={
                      active
                        ? { background: "var(--maiz)", color: "var(--ink)", border: "1px solid var(--maiz)" }
                        : { background: "var(--card)", color: "var(--ink-muted)", border: "1px solid var(--line)" }
                    }
                  >
                    <span className="text-lg">{p.emoji}</span>
                    {p.label}
                  </button>
                );
              })}
            </div>

            {formaPago === "01" && (
              <div className="mt-3 grid grid-cols-2 items-center gap-2">
                <input
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                  inputMode="decimal"
                  placeholder="Recibido $"
                  className="rounded-xl px-3 py-2.5 text-base focus:outline-none"
                  style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
                />
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Cambio</p>
                  <p
                    className="text-xl font-bold tabular-nums"
                    style={{ color: cambio < 0 ? "var(--danger)" : "var(--success)" }}
                  >
                    {mxn(Math.max(0, cambio))}
                  </p>
                </div>
              </div>
            )}

            {formaPago === "99" && (
              <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
                Se sumará {mxn(total)} al saldo pendiente de {cliente?.nombre}.
              </p>
            )}

            <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
              <input type="checkbox" checked={cfdi} onChange={(e) => setCfdi(e.target.checked)} />
              Emitir CFDI {cliente?.rfc === RFC_PUBLICO && "(global público en general)"}
            </label>
          </Card>

          <button
            onClick={cobrar}
            disabled={cart.length === 0}
            className="rounded-2xl py-6 text-2xl font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--maiz)", color: "var(--ink)" }}
          >
            Cobrar {total > 0 ? mxn(total) : ""}
          </button>
          {cart.length > 0 && (
            <button
              onClick={limpiar}
              className="rounded-xl py-2 text-sm font-semibold"
              style={{ color: "var(--terracota)", border: "1px solid var(--terracota)", background: "var(--card)" }}
            >
              Cancelar ticket
            </button>
          )}
        </div>
      </div>

      {/* Ticket de confirmación */}
      <Modal open={!!ticket} onClose={() => setTicket(null)} title="✓ Venta registrada">
        {ticket && (
          <div className="text-sm" style={{ color: "var(--ink)" }}>
            <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--line)" }}>
              <span style={{ color: "var(--ink-muted)" }}>{clientes.find((c) => c.id === ticket.clienteId)?.nombre}</span>
              <span>{ticket.fecha}</span>
            </div>
            <ul className="my-2 flex flex-col gap-1">
              {ticket.lineas.map((l, i) => (
                <li key={i} className="flex justify-between tabular-nums">
                  <span>{l.kgVendidos} kg × {mxn(l.precioKg)}</span>
                  <span>{mxn(l.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t pt-2 text-lg font-bold" style={{ borderColor: "var(--line)" }}>
              <span>Total</span>
              <span className="tabular-nums">{mxn(ticket.total)}</span>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              {PAGOS.find((p) => p.code === ticket.formaPago)?.label}
              {ticket.cfdiEmitido ? " · CFDI emitido" : ""}
            </p>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setTicket(null)}>Nueva venta</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
