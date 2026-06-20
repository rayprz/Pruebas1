import type {
  LoteProduccion,
  CompraInsumo,
  Insumo,
  Gasto,
  Venta,
  PagoNomina,
  Empleado,
  AlertaStock,
  CostoDesglose,
  PyLResult,
  ISRBimestralResult,
  IVAMensualResult,
  ResumenFormaPago,
  AjusteInventario,
} from "./types";

// ── Date utilities ─────────────────────────────────────────────────────────
export function inPeriod(fecha: string, inicio: string, fin: string): boolean {
  return fecha >= inicio && fecha <= fin;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate(); // month1 is 1-based; day 0 of next = last day
}

export function monthRange(ym: string): { inicio: string; fin: string } {
  const [y, m] = ym.split("-").map(Number);
  return { inicio: `${y}-${pad(m)}-01`, fin: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}` };
}

export function bimestreRanges(
  year: number
): { inicio: string; fin: string; label: string; vencimiento: string }[] {
  const defs: [number, number, string][] = [
    [1, 2, "Ene-Feb"],
    [3, 4, "Mar-Abr"],
    [5, 6, "May-Jun"],
    [7, 8, "Jul-Ago"],
    [9, 10, "Sep-Oct"],
    [11, 12, "Nov-Dic"],
  ];
  return defs.map(([m1, m2, label]) => {
    // due day 17 of month after the bimestre ends
    let venY = year;
    let venM = m2 + 1;
    if (venM > 12) {
      venM = 1;
      venY += 1;
    }
    return {
      inicio: `${year}-${pad(m1)}-01`,
      fin: `${year}-${pad(m2)}-${pad(lastDayOfMonth(year, m2))}`,
      label: `${label} ${year}`,
      vencimiento: `${venY}-${pad(venM)}-17`,
    };
  });
}

export function currentBimestre(): { inicio: string; fin: string; label: string } {
  const d = new Date();
  const ranges = bimestreRanges(d.getFullYear());
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const found = ranges.find((r) => inPeriod(today, r.inicio, r.fin)) ?? ranges[0];
  return { inicio: found.inicio, fin: found.fin, label: found.label };
}

export function monthsOfYear(year: number): { ym: string; label: string; vencimiento: string }[] {
  const labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return labels.map((lab, i) => {
    const m = i + 1;
    let venY = year;
    let venM = m + 1;
    if (venM > 12) {
      venM = 1;
      venY += 1;
    }
    return { ym: `${year}-${pad(m)}`, label: `${lab} ${year}`, vencimiento: `${venY}-${pad(venM)}-17` };
  });
}

// ── Formatting ───────────────────────────────────────────────────────────
export const mxn = (n: number, digits = 0): string =>
  `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const pct = (n: number): string => `${(n || 0).toFixed(1)}%`;

// ── Production ───────────────────────────────────────────────────────────
export function rendimientoPromedio(lotes: LoteProduccion[]): number {
  if (lotes.length === 0) return 0;
  const sum = lotes.reduce((a, l) => a + l.rendimiento, 0);
  return sum / lotes.length;
}

export function kgProducidosEnPeriodo(lotes: LoteProduccion[], inicio: string, fin: string): number {
  return lotes
    .filter((l) => inPeriod(l.fecha, inicio, fin))
    .reduce((a, l) => a + l.kgTortillasProducidas, 0);
}

function kgVendidosEnPeriodo(ventas: Venta[], inicio: string, fin: string): number {
  return ventas
    .filter((v) => inPeriod(v.fecha, inicio, fin))
    .reduce((a, v) => a + v.lineas.reduce((s, ln) => s + ln.kgVendidos, 0), 0);
}

// ── Costs ────────────────────────────────────────────────────────────────
// Average purchase cost per unit for an insumo (falls back to catalog cost).
function costoUnitPromedio(insumoId: string, compras: CompraInsumo[], insumos: Insumo[]): number {
  const cs = compras.filter((c) => c.insumoId === insumoId);
  if (cs.length > 0) {
    const tot = cs.reduce((a, c) => a + c.cantidad * c.costoUnitario, 0);
    const qty = cs.reduce((a, c) => a + c.cantidad, 0);
    if (qty > 0) return tot / qty;
  }
  return insumos.find((i) => i.id === insumoId)?.costoUnitario ?? 0;
}

// Materia prima cost per kg produced in a period.
export function costoMPPorKg(
  lotes: LoteProduccion[],
  compras: CompraInsumo[],
  insumos: Insumo[],
  inicio: string,
  fin: string
): number {
  const inP = lotes.filter((l) => inPeriod(l.fecha, inicio, fin));
  const kg = inP.reduce((a, l) => a + l.kgTortillasProducidas, 0);
  if (kg === 0) return 0;
  let costoMP = 0;
  for (const l of inP) {
    for (const cons of l.consumoInsumos) {
      costoMP += cons.cantidad * costoUnitPromedio(cons.insumoId, compras, insumos);
    }
  }
  return costoMP / kg;
}

export function costoTotalPorKg(
  lotes: LoteProduccion[],
  compras: CompraInsumo[],
  insumos: Insumo[],
  gastos: Gasto[],
  pagosNomina: PagoNomina[],
  inicio: string,
  fin: string
): CostoDesglose {
  const kg = kgProducidosEnPeriodo(lotes, inicio, fin);
  const mpPorKg = costoMPPorKg(lotes, compras, insumos, inicio, fin);
  const laboral = pagosNomina
    .filter((p) => inPeriod(p.periodoFin, inicio, fin))
    .reduce((a, p) => a + p.montoNeto, 0);
  const gastosOp = gastos.filter((g) => inPeriod(g.fecha, inicio, fin)).reduce((a, g) => a + g.monto, 0);
  const manoObraPorKg = kg > 0 ? laboral / kg : 0;
  const gastosOpPorKg = kg > 0 ? gastosOp / kg : 0;
  return {
    mpPorKg,
    manoObraPorKg,
    gastosOpPorKg,
    totalPorKg: mpPorKg + manoObraPorKg + gastosOpPorKg,
  };
}

// ── P&L ──────────────────────────────────────────────────────────────────
export function calcularPyL(
  ventas: Venta[],
  lotes: LoteProduccion[],
  compras: CompraInsumo[],
  insumos: Insumo[],
  gastos: Gasto[],
  pagosNomina: PagoNomina[],
  inicio: string,
  fin: string
): PyLResult {
  const ingresos = ventas.filter((v) => inPeriod(v.fecha, inicio, fin)).reduce((a, v) => a + v.total, 0);
  const kgVend = kgVendidosEnPeriodo(ventas, inicio, fin);
  const mpPorKg = costoMPPorKg(lotes, compras, insumos, inicio, fin);
  const costoMP = mpPorKg * kgVend;
  const costoLaboral = pagosNomina
    .filter((p) => inPeriod(p.periodoFin, inicio, fin))
    .reduce((a, p) => a + p.montoNeto, 0);
  const otrosGastos = gastos.filter((g) => inPeriod(g.fecha, inicio, fin)).reduce((a, g) => a + g.monto, 0);
  const utilidadBruta = ingresos - costoMP;
  const utilidadNeta = utilidadBruta - costoLaboral - otrosGastos;
  return {
    ingresos,
    costoMP,
    costoLaboral,
    otrosGastos,
    utilidadBruta,
    utilidadNeta,
    margenBruto: ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0,
    margenNeto: ingresos > 0 ? (utilidadNeta / ingresos) * 100 : 0,
  };
}

// ── ISR RESICO ───────────────────────────────────────────────────────────
export function tasaISR(ingresoNetoMensual: number): number {
  if (ingresoNetoMensual <= 25000) return 0.01;
  if (ingresoNetoMensual <= 50000) return 0.011;
  if (ingresoNetoMensual <= 83333) return 0.015;
  if (ingresoNetoMensual <= 208333) return 0.02;
  return 0.025;
}

export function calcularISRBimestral(
  ventas: Venta[],
  gastos: Gasto[],
  compras: CompraInsumo[],
  pagosNomina: PagoNomina[],
  inicio: string,
  fin: string,
  label: string
): ISRBimestralResult {
  const ingresosBrutos = ventas.filter((v) => inPeriod(v.fecha, inicio, fin)).reduce((a, v) => a + v.total, 0);
  const gastosDeducibles =
    gastos.filter((g) => inPeriod(g.fecha, inicio, fin) && g.tieneCFDI).reduce((a, g) => a + g.monto, 0) +
    compras.filter((c) => inPeriod(c.fecha, inicio, fin) && c.tieneCFDI).reduce((a, c) => a + c.cantidad * c.costoUnitario, 0);
  const nominaDeducible = pagosNomina
    .filter((p) => inPeriod(p.periodoFin, inicio, fin) && p.tieneCFDI)
    .reduce((a, p) => a + p.montoNeto, 0);
  const ingresoNeto = Math.max(0, ingresosBrutos - gastosDeducibles - nominaDeducible);
  // RESICO ISR uses gross income; we apply rate to monthly-equivalent income then x2
  const ingresoMensual = ingresosBrutos / 2;
  const tasa = tasaISR(ingresoMensual);
  const isrACargo = ingresoMensual * tasa * 2;
  return {
    ingresosBrutos,
    gastosDeducibles,
    nominaDeducible,
    ingresoNeto,
    tasaAplicada: tasa,
    isrACargo,
    bimestre: label,
  };
}

// ── IVA ──────────────────────────────────────────────────────────────────
export function calcularIVAMensual(
  compras: CompraInsumo[],
  gastos: Gasto[],
  inicio: string,
  fin: string,
  label: string
): IVAMensualResult {
  const ivaTrasladado = 0; // tortillas 0%
  const ivaAcreditable =
    compras.filter((c) => inPeriod(c.fecha, inicio, fin) && c.tieneCFDI).reduce((a, c) => a + c.ivaAcreditado, 0) +
    gastos.filter((g) => inPeriod(g.fecha, inicio, fin) && g.tieneCFDI).reduce((a, g) => a + g.ivaAcreditado, 0);
  return {
    ivaTrasladado,
    ivaAcreditable,
    ivaAFavor: ivaAcreditable - ivaTrasladado,
    mes: label,
  };
}

// ── Payment summary ──────────────────────────────────────────────────────
export function resumenFormaPago(ventas: Venta[], inicio: string, fin: string): ResumenFormaPago {
  const r: ResumenFormaPago = {
    efectivo: 0,
    transferencia: 0,
    tarjetaCredito: 0,
    tarjetaDebito: 0,
    credito: 0,
    totalDigital: 0,
  };
  for (const v of ventas.filter((v) => inPeriod(v.fecha, inicio, fin))) {
    switch (v.formaPago) {
      case "01":
        r.efectivo += v.total;
        break;
      case "03":
        r.transferencia += v.total;
        break;
      case "04":
        r.tarjetaCredito += v.total;
        break;
      case "28":
        r.tarjetaDebito += v.total;
        break;
      case "99":
        r.credito += v.total;
        break;
    }
  }
  r.totalDigital = r.transferencia + r.tarjetaCredito + r.tarjetaDebito;
  return r;
}

// ── Stock ────────────────────────────────────────────────────────────────
export function calcularStockInsumo(
  insumoId: string,
  insumos: Insumo[],
  compras: CompraInsumo[],
  lotes: LoteProduccion[],
  ajustes: AjusteInventario[]
): number {
  const base = insumos.find((i) => i.id === insumoId)?.stockActual ?? 0;
  const comprado = compras.filter((c) => c.insumoId === insumoId).reduce((a, c) => a + c.cantidad, 0);
  const consumido = lotes.reduce(
    (a, l) => a + l.consumoInsumos.filter((c) => c.insumoId === insumoId).reduce((s, c) => s + c.cantidad, 0),
    0
  );
  const ajustado = ajustes.filter((a) => a.insumoId === insumoId).reduce((s, a) => s + a.cantidad, 0);
  return base + comprado - consumido + ajustado;
}

export function calcularStockTortillas(
  ventas: Venta[],
  lotes: LoteProduccion[],
  ajustes: AjusteInventario[]
): number {
  const producido = lotes.reduce((a, l) => a + l.kgTortillasProducidas, 0);
  const vendido = ventas.reduce((a, v) => a + v.lineas.reduce((s, ln) => s + ln.kgVendidos, 0), 0);
  const ajustado = ajustes.filter((a) => a.insumoId === "tortillas").reduce((s, a) => s + a.cantidad, 0);
  return producido - vendido + ajustado;
}

export function alertasStock(
  insumos: Insumo[],
  compras: CompraInsumo[],
  lotes: LoteProduccion[],
  ajustes: AjusteInventario[]
): AlertaStock[] {
  return insumos
    .map((i) => {
      const stock = calcularStockInsumo(i.id, insumos, compras, lotes, ajustes);
      return {
        insumoId: i.id,
        nombre: i.nombre,
        stockActual: stock,
        stockMinimo: i.stockMinimo,
        faltante: Math.max(0, i.stockMinimo - stock),
        unidad: i.unidad,
      };
    })
    .filter((a) => a.stockActual <= a.stockMinimo);
}

// ── Nómina ───────────────────────────────────────────────────────────────
export function calcularPagoEmpleado(empleado: Empleado, horasTrabajadas?: number): number {
  if (empleado.tipoPago === "por_hora") {
    return empleado.salarioBase * (horasTrabajadas ?? 0);
  }
  return empleado.salarioBase;
}
