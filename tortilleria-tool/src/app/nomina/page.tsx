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
import { useNomina } from "@/lib/nominaStore";
import { mxn, calcularPagoEmpleado, inPeriod } from "@/lib/engine";
import type { Empleado, PagoNomina, TipoPago, PeriodoNomina, FormaPagoNomina } from "@/lib/types";

const FORMA_LABEL: Record<FormaPagoNomina, string> = { "01": "Efectivo", "03": "Transferencia", "28": "T. Débito" };
const MESES = [
  { value: "2026-04", label: "Abril 2026" },
  { value: "2026-05", label: "Mayo 2026" },
  { value: "2026-06", label: "Junio 2026" },
];

export default function NominaPage() {
  const { empleados, pagos, addEmpleado, darDeBajaEmpleado, addPago, removePago } = useNomina();

  const [mes, setMes] = useState("2026-05");
  const [empOpen, setEmpOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);

  // empleado form
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("");
  const [tipoPago, setTipoPago] = useState<TipoPago>("salario_fijo");
  const [salarioBase, setSalarioBase] = useState(2000);
  const [periodoNomina, setPeriodoNomina] = useState<PeriodoNomina>("semanal");

  // pago form
  const [empId, setEmpId] = useState(empleados[0]?.id ?? "");
  const [pIni, setPIni] = useState("2026-06-01");
  const [pFin, setPFin] = useState("2026-06-07");
  const [horas, setHoras] = useState(35);
  const [deducciones, setDeducciones] = useState(0);
  const [formaPago, setFormaPago] = useState<FormaPagoNomina>("01");
  const [cfdi, setCfdi] = useState(false);

  const empSel = empleados.find((e) => e.id === empId);
  const montoBase = empSel ? calcularPagoEmpleado(empSel, horas) : 0;

  const activos = empleados.filter((e) => e.activo);

  const { inicio, fin } = { inicio: `${mes}-01`, fin: `${mes}-31` };
  const pagosMes = useMemo(
    () => pagos.filter((p) => inPeriod(p.periodoFin, inicio, fin)).sort((a, b) => (a.periodoFin < b.periodoFin ? 1 : -1)),
    [pagos, inicio, fin]
  );
  const totalMes = pagosMes.reduce((a, p) => a + p.montoNeto, 0);
  const conCfdi = pagosMes.filter((p) => p.tieneCFDI).reduce((a, p) => a + p.montoNeto, 0);
  const sinCfdi = totalMes - conCfdi;

  function guardarEmpleado() {
    if (!nombre.trim()) return;
    const e: Empleado = {
      id: `emp-${Date.now()}`,
      nombre: nombre.trim(),
      puesto: puesto.trim() || "Empleado",
      tipoPago,
      salarioBase,
      periodoNomina,
      fechaInicio: new Date().toISOString().slice(0, 10),
      activo: true,
    };
    addEmpleado(e);
    setEmpOpen(false);
    setNombre("");
    setPuesto("");
  }

  function guardarPago() {
    if (!empSel) return;
    const neto = montoBase - deducciones;
    const p: PagoNomina = {
      id: `pn-${Date.now()}`,
      empleadoId: empId,
      periodoInicio: pIni,
      periodoFin: pFin,
      horasTrabajadas: empSel.tipoPago === "por_hora" ? horas : undefined,
      montoBase,
      deducciones,
      montoNeto: neto,
      formaPago,
      tieneCFDI: cfdi,
    };
    addPago(p);
    setPagoOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Nómina"
        subtitle="Empleados y pagos de salarios"
        actions={
          <>
            <Button variant="ghost" onClick={() => setEmpOpen(true)}>
              <IconPlus size={16} /> Alta Empleado
            </Button>
            <Button onClick={() => setPagoOpen(true)}>
              <IconPlus size={16} /> Registrar Pago
            </Button>
          </>
        }
      />

      <ModuleIntro
        id="nomina"
        title="Cómo funciona este módulo"
        description="Registra empleados y sus pagos. Los pagos con CFDI de nómina son deducibles de ISR; sin CFDI no lo son. Para empleados por hora, el monto se calcula con las horas trabajadas. Esto impacta directamente el cálculo fiscal."
        connections={["Alimenta: Costos", "Alimenta: P&L", "Alimenta: Impuestos (deducible)"]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <StatCard label="Empleados activos" value={String(activos.length)} tone="accent" />
        <StatCard label={`Nómina del mes`} value={mxn(totalMes)} />
        <StatCard label="Con CFDI (deducible)" value={mxn(conCfdi)} tone="success" />
        <StatCard label="Sin CFDI" value={mxn(sinCfdi)} tone={sinCfdi > 0 ? "warning" : "default"} />
      </div>

      <SectionTitle className="mb-2">Empleados</SectionTitle>
      <Card className="mb-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                <th className="px-3 py-2 text-left font-semibold">Puesto</th>
                <th className="px-3 py-2 text-left font-semibold">Tipo pago</th>
                <th className="px-3 py-2 text-right font-semibold">Salario base</th>
                <th className="px-3 py-2 text-left font-semibold">Periodo</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-3 py-2 font-medium">{e.nombre}</td>
                  <td className="px-3 py-2">{e.puesto}</td>
                  <td className="px-3 py-2">{e.tipoPago === "por_hora" ? "Por hora" : "Salario fijo"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {mxn(e.salarioBase)}
                    {e.tipoPago === "por_hora" ? "/hr" : "/sem"}
                  </td>
                  <td className="px-3 py-2 capitalize">{e.periodoNomina}</td>
                  <td className="px-3 py-2">
                    <Badge tone={e.activo ? "success" : "default"}>{e.activo ? "Activo" : "Baja"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {e.activo && (
                      <Button
                        variant="danger"
                        onClick={() => darDeBajaEmpleado(e.id, new Date().toISOString().slice(0, 10))}
                      >
                        Baja
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-2 flex items-center justify-between">
        <SectionTitle>Historial de pagos</SectionTitle>
        <div className="flex gap-2">
          {MESES.map((m) => (
            <Pill key={m.value} label={m.label} active={mes === m.value} onClick={() => setMes(m.value)} />
          ))}
        </div>
      </div>
      {pagosMes.length === 0 ? (
        <EmptyState message="No hay pagos en este mes." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#faf6ee", color: "var(--ink-muted)" }}>
                  <th className="px-3 py-2 text-left font-semibold">Empleado</th>
                  <th className="px-3 py-2 text-left font-semibold">Periodo</th>
                  <th className="px-3 py-2 text-right font-semibold">Horas</th>
                  <th className="px-3 py-2 text-right font-semibold">Neto</th>
                  <th className="px-3 py-2 text-left font-semibold">Pago</th>
                  <th className="px-3 py-2 text-left font-semibold">CFDI</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pagosMes.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">{empleados.find((e) => e.id === p.empleadoId)?.nombre ?? p.empleadoId}</td>
                    <td className="px-3 py-2 text-xs">
                      {p.periodoInicio} → {p.periodoFin}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.horasTrabajadas ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{mxn(p.montoNeto)}</td>
                    <td className="px-3 py-2">{FORMA_LABEL[p.formaPago]}</td>
                    <td className="px-3 py-2">
                      <Badge tone={p.tieneCFDI ? "success" : "warning"}>{p.tieneCFDI ? "Sí" : "No"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removePago(p.id)} style={{ color: "var(--terracota)" }} title="Eliminar">
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

      {/* Alta empleado */}
      <Modal open={empOpen} onClose={() => setEmpOpen(false)} title="Alta de Empleado">
        <div className="grid gap-3">
          <TextInput label="Nombre" value={nombre} onChange={setNombre} />
          <TextInput label="Puesto" value={puesto} onChange={setPuesto} placeholder="Tortillero, empacadora..." />
          <Select
            label="Tipo de pago"
            value={tipoPago}
            onChange={(v) => setTipoPago(v as TipoPago)}
            options={[
              { value: "salario_fijo", label: "Salario fijo" },
              { value: "por_hora", label: "Por hora" },
            ]}
          />
          <NumberField
            label={tipoPago === "por_hora" ? "Pago por hora" : "Salario base"}
            value={salarioBase}
            onChange={setSalarioBase}
            suffix="$"
          />
          <Select
            label="Periodo de nómina"
            value={periodoNomina}
            onChange={(v) => setPeriodoNomina(v as PeriodoNomina)}
            options={[
              { value: "semanal", label: "Semanal" },
              { value: "quincenal", label: "Quincenal" },
              { value: "mensual", label: "Mensual" },
            ]}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEmpOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarEmpleado}>Guardar empleado</Button>
          </div>
        </div>
      </Modal>

      {/* Registrar pago */}
      <Modal open={pagoOpen} onClose={() => setPagoOpen(false)} title="Registrar Pago de Nómina">
        <div className="grid gap-3">
          <Select
            label="Empleado"
            value={empId}
            onChange={setEmpId}
            options={activos.map((e) => ({ value: e.id, label: e.nombre }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Inicio" value={pIni} onChange={setPIni} />
            <TextInput label="Fin" value={pFin} onChange={setPFin} />
          </div>
          {empSel?.tipoPago === "por_hora" && (
            <NumberField label="Horas trabajadas" value={horas} onChange={setHoras} suffix="hr" />
          )}
          <NumberField label="Deducciones" value={deducciones} onChange={setDeducciones} suffix="$" />
          <Select
            label="Forma de pago"
            value={formaPago}
            onChange={(v) => setFormaPago(v as FormaPagoNomina)}
            options={(Object.keys(FORMA_LABEL) as FormaPagoNomina[]).map((k) => ({ value: k, label: FORMA_LABEL[k] }))}
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)" }}>
            <input type="checkbox" checked={cfdi} onChange={(e) => setCfdi(e.target.checked)} />
            CFDI de nómina emitido (deducible)
          </label>
          <div className="rounded-lg p-3 text-sm font-semibold" style={{ background: "var(--maiz-light)" }}>
            Monto base {mxn(montoBase)} · Neto {mxn(montoBase - deducciones)}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPagoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarPago}>Registrar pago</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
