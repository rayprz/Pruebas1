import type {
  Params,
  Insumo,
  CompraInsumo,
  Cliente,
  Venta,
  Empleado,
  PagoNomina,
  LoteProduccion,
  Gasto,
  AjusteInventario,
  Turno,
  FormaPagoSAT,
} from "@/lib/types";

// ── Params ───────────────────────────────────────────────────────────────
export const SEED_PARAMS: Params = {
  rfc: "MAGU870312AB3",
  nombreNegocio: "Tortillería La Esperanza",
  precioMenudeo: 22,
  precioMayoreo: 18,
};

// ── Insumos ──────────────────────────────────────────────────────────────
export const SEED_INSUMOS: Insumo[] = [
  { id: "maiz", nombre: "Maíz blanco", unidad: "kg", stockActual: 500, stockMinimo: 100, costoUnitario: 8.5, ivaAcreditable: false },
  { id: "cal", nombre: "Cal viva", unidad: "kg", stockActual: 20, stockMinimo: 5, costoUnitario: 12.0, ivaAcreditable: true },
  { id: "sal", nombre: "Sal", unidad: "kg", stockActual: 10, stockMinimo: 2, costoUnitario: 8.0, ivaAcreditable: false },
  { id: "bolsas", nombre: "Bolsas 1kg", unidad: "pieza", stockActual: 500, stockMinimo: 100, costoUnitario: 0.85, ivaAcreditable: true },
  { id: "gas", nombre: "Gas LP", unidad: "litro", stockActual: 80, stockMinimo: 20, costoUnitario: 18.0, ivaAcreditable: true },
];

// helper for compra IVA computation
function compra(
  id: string,
  insumoId: string,
  fecha: string,
  cantidad: number,
  costoUnitario: number,
  proveedor: string,
  tieneCFDI: boolean,
  ivaAcreditable: boolean
): CompraInsumo {
  const total = cantidad * costoUnitario;
  const ivaAcreditado = ivaAcreditable && tieneCFDI ? +(total - total / 1.16).toFixed(2) : 0;
  const costoSinIva = +(total - ivaAcreditado).toFixed(2);
  return { id, insumoId, fecha, cantidad, costoUnitario, costoSinIva, ivaAcreditado, proveedor, tieneCFDI };
}

// ── Compras de Insumos ───────────────────────────────────────────────────
export const SEED_COMPRAS_INSUMOS: CompraInsumo[] = [
  compra("c1", "maiz", "2026-04-03", 1000, 8.5, "Granos del Bajío", true, false),
  compra("c2", "cal", "2026-04-05", 25, 12.0, "Insumos Químicos SA", true, true),
  compra("c3", "bolsas", "2026-04-08", 2000, 0.85, "Plásticos Puebla", true, true),
  compra("c4", "gas", "2026-04-12", 200, 18.0, "Gas Express", true, true),
  compra("c5", "maiz", "2026-04-22", 1000, 8.7, "Granos del Bajío", true, false),
  compra("c6", "sal", "2026-05-02", 50, 8.0, "Abarrotera Central", false, false),
  compra("c7", "maiz", "2026-05-09", 1000, 8.6, "Granos del Bajío", true, false),
  compra("c8", "gas", "2026-05-15", 200, 18.5, "Gas Express", true, true),
  compra("c9", "bolsas", "2026-05-20", 2000, 0.88, "Plásticos Puebla", true, true),
  compra("c10", "maiz", "2026-05-26", 1000, 8.6, "Granos del Bajío", true, false),
];

// ── Clientes ─────────────────────────────────────────────────────────────
export const SEED_CLIENTES: Cliente[] = [
  { id: "pub-gen", nombre: "Público General", tipo: "menudeo", rfc: "XAXX010101000", saldoPendiente: 0, activo: true },
  { id: "rest-mol", nombre: "Restaurante El Molcajete", tipo: "mayoreo", rfc: "XMOL123456AB1", regimenFiscal: "601", telefono: "222-145-8890", saldoPendiente: 0, activo: true },
  { id: "abar-lupe", nombre: "Abarrotes Doña Lupe", tipo: "mayoreo", rfc: "XLUP987654CD2", regimenFiscal: "626", telefono: "222-330-1122", saldoPendiente: 850, activo: true },
];

// ── Ventas ───────────────────────────────────────────────────────────────
function venta(
  id: string,
  fecha: string,
  clienteId: string,
  kg: number,
  precioKg: number,
  formaPago: FormaPagoSAT,
  cfdi: boolean,
  folio?: string
): Venta {
  const subtotal = +(kg * precioKg).toFixed(2);
  return {
    id,
    fecha,
    clienteId,
    lineas: [{ kgVendidos: kg, precioKg, subtotal }],
    total: subtotal,
    formaPago,
    cfdiEmitido: cfdi,
    folioCFDI: folio,
  };
}

const PUB = "pub-gen";
const MOL = "rest-mol";
const LUPE = "abar-lupe";

export const SEED_VENTAS: Venta[] = [
  // April menudeo (efectivo)
  venta("v1", "2026-04-01", PUB, 8, 22, "01", false),
  venta("v2", "2026-04-02", PUB, 12, 22, "01", false),
  venta("v3", "2026-04-04", PUB, 6, 22, "01", false),
  venta("v4", "2026-04-06", PUB, 15, 22, "01", false),
  venta("v5", "2026-04-09", PUB, 9, 22, "01", false),
  venta("v6", "2026-04-13", PUB, 11, 22, "01", false),
  venta("v7", "2026-04-18", PUB, 7, 22, "01", false),
  venta("v8", "2026-04-23", PUB, 14, 22, "01", false),
  venta("v9", "2026-04-28", PUB, 10, 22, "01", false),
  // April mayoreo
  venta("v10", "2026-04-03", MOL, 120, 18, "03", true, "A-1001"),
  venta("v11", "2026-04-10", MOL, 150, 18, "03", true, "A-1002"),
  venta("v12", "2026-04-17", LUPE, 80, 18, "99", true, "A-1003"),
  venta("v13", "2026-04-24", MOL, 110, 18, "03", true, "A-1004"),
  venta("v14", "2026-04-27", LUPE, 95, 18, "99", true, "A-1005"),
  // May menudeo (efectivo)
  venta("v15", "2026-05-01", PUB, 13, 22, "01", false),
  venta("v16", "2026-05-03", PUB, 8, 22, "01", false),
  venta("v17", "2026-05-05", PUB, 17, 22, "01", false),
  venta("v18", "2026-05-08", PUB, 6, 22, "01", false),
  venta("v19", "2026-05-11", PUB, 20, 22, "01", false),
  venta("v20", "2026-05-14", PUB, 9, 22, "01", false),
  venta("v21", "2026-05-18", PUB, 12, 22, "01", false),
  venta("v22", "2026-05-22", PUB, 7, 22, "01", false),
  venta("v23", "2026-05-27", PUB, 16, 22, "01", false),
  venta("v24", "2026-05-30", PUB, 11, 22, "01", false),
  // May mayoreo
  venta("v25", "2026-05-02", MOL, 130, 18, "03", true, "A-1006"),
  venta("v26", "2026-05-09", LUPE, 100, 18, "99", true, "A-1007"),
  venta("v27", "2026-05-15", MOL, 160, 18, "03", true, "A-1008"),
  venta("v28", "2026-05-21", MOL, 140, 18, "03", true, "A-1009"),
  venta("v29", "2026-05-26", LUPE, 90, 18, "99", true, "A-1010"),
  venta("v30", "2026-05-29", MOL, 200, 18, "03", true, "A-1011"),
];

// ── Empleados ────────────────────────────────────────────────────────────
export const SEED_EMPLEADOS: Empleado[] = [
  { id: "emp-jose", nombre: "José Martínez", puesto: "Tortillero", tipoPago: "salario_fijo", salarioBase: 2000, periodoNomina: "semanal", fechaInicio: "2024-01-15", activo: true },
  { id: "emp-rosa", nombre: "Rosa González", puesto: "Empacadora", tipoPago: "salario_fijo", salarioBase: 1500, periodoNomina: "semanal", fechaInicio: "2024-03-01", activo: true },
  { id: "emp-pedro", nombre: "Pedro Sánchez", puesto: "Ayudante", tipoPago: "por_hora", salarioBase: 80, periodoNomina: "semanal", fechaInicio: "2025-06-10", activo: true },
];

// ── Pagos de Nómina (4 semanas x 3 empleados + extras = 16) ───────────────
const WEEKS: { ini: string; fin: string }[] = [
  { ini: "2026-04-06", fin: "2026-04-12" },
  { ini: "2026-04-13", fin: "2026-04-19" },
  { ini: "2026-04-20", fin: "2026-04-26" },
  { ini: "2026-04-27", fin: "2026-05-03" },
  { ini: "2026-05-04", fin: "2026-05-10" },
  { ini: "2026-05-11", fin: "2026-05-17" },
  { ini: "2026-05-18", fin: "2026-05-24" },
  { ini: "2026-05-25", fin: "2026-05-31" },
];

function pagoFijo(id: string, empleadoId: string, w: { ini: string; fin: string }, monto: number, cfdi: boolean): PagoNomina {
  return { id, empleadoId, periodoInicio: w.ini, periodoFin: w.fin, montoBase: monto, deducciones: 0, montoNeto: monto, formaPago: "01", tieneCFDI: cfdi };
}

export const SEED_PAGOS_NOMINA: PagoNomina[] = (() => {
  const pagos: PagoNomina[] = [];
  let n = 1;
  WEEKS.forEach((w, i) => {
    pagos.push(pagoFijo(`pn${n++}`, "emp-jose", w, 2000, i % 2 === 0));
    pagos.push(pagoFijo(`pn${n++}`, "emp-rosa", w, 1500, i % 3 === 0));
    const horas = 33 + (i % 3) * 2; // 33-37 hrs
    const monto = horas * 80;
    pagos.push({ id: `pn${n++}`, empleadoId: "emp-pedro", periodoInicio: w.ini, periodoFin: w.fin, horasTrabajadas: horas, montoBase: monto, deducciones: 0, montoNeto: monto, formaPago: "01", tieneCFDI: false });
  });
  return pagos;
})();

// ── Lotes de Producción (2/día for April-May) ─────────────────────────────
export const SEED_LOTES: LoteProduccion[] = (() => {
  const lotes: LoteProduccion[] = [];
  const months = [
    { y: 2026, m: 4, days: 30 },
    { y: 2026, m: 5, days: 31 },
  ];
  let n = 1;
  const turnos: Turno[] = ["mañana", "tarde"];
  for (const { y, m, days } of months) {
    // produce every other day to land around ~60 batches total without being noisy
    for (let d = 1; d <= days; d += 1) {
      // skip Sundays-ish (every 7th day) to add realism
      if (d % 7 === 0) continue;
      const fecha = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      for (const turno of turnos) {
        const seed = (n * 37) % 11;
        const kgMasa = 170 + seed; // 170-180
        const rend = 0.9 + (seed % 4) * 0.005; // ~0.90-0.915
        const kgTort = +(kgMasa * rend).toFixed(1);
        const maizCons = +(kgMasa / 1.05).toFixed(1);
        const calCons = +(kgMasa * 0.01).toFixed(2);
        const salCons = +(kgMasa * 0.002).toFixed(2);
        lotes.push({
          id: `l${n++}`,
          fecha,
          turno,
          kgMasaInicial: kgMasa,
          kgTortillasProducidas: kgTort,
          rendimiento: +(kgTort / kgMasa).toFixed(4),
          consumoInsumos: [
            { insumoId: "maiz", cantidad: maizCons },
            { insumoId: "cal", cantidad: calCons },
            { insumoId: "sal", cantidad: salCons },
          ],
        });
      }
    }
  }
  return lotes;
})();

// ── Gastos ───────────────────────────────────────────────────────────────
function gasto(
  id: string,
  fecha: string,
  categoría: Gasto["categoría"],
  descripción: string,
  monto: number,
  tieneCFDI: boolean,
  formaPago: FormaPagoSAT,
  ivaAcred = 0
): Gasto {
  return { id, fecha, categoría, descripción, monto, tieneCFDI, ivaAcreditado: ivaAcred, formaPago };
}

const ivaOf = (m: number) => +(m - m / 1.16).toFixed(2);

export const SEED_GASTOS: Gasto[] = [
  gasto("g1", "2026-04-01", "renta", "Renta local abril", 5500, true, "03", ivaOf(5500)),
  gasto("g2", "2026-05-01", "renta", "Renta local mayo", 5500, true, "03", ivaOf(5500)),
  gasto("g3", "2026-04-10", "gas", "Gas LP uso negocio abril", 3200, true, "03", ivaOf(3200)),
  gasto("g4", "2026-05-10", "gas", "Gas LP uso negocio mayo", 3200, true, "03", ivaOf(3200)),
  gasto("g5", "2026-04-15", "electricidad", "CFE abril", 1400, true, "03", ivaOf(1400)),
  gasto("g6", "2026-05-15", "electricidad", "CFE mayo", 1450, true, "03", ivaOf(1450)),
  gasto("g7", "2026-04-20", "mantenimiento", "Reparación máquina tortilladora", 800, false, "01", 0),
  gasto("g8", "2026-05-18", "mantenimiento", "Cambio de banda", 650, true, "01", ivaOf(650)),
  gasto("g9", "2026-04-25", "empaque", "Etiquetas y cinta", 320, true, "01", ivaOf(320)),
  gasto("g10", "2026-05-22", "empaque", "Cajas de cartón", 480, true, "03", ivaOf(480)),
  gasto("g11", "2026-04-28", "otros", "Limpieza y misceláneos", 250, false, "01", 0),
  gasto("g12", "2026-05-28", "otros", "Papelería administrativa", 180, false, "01", 0),
];

// ── Ajustes de Inventario ─────────────────────────────────────────────────
export const SEED_AJUSTES_INVENTARIO: AjusteInventario[] = [];
