// ── Materia Prima ──────────────────────────────────────────────────────────
export type UnidadMedida = "kg" | "litro" | "pieza" | "bolsa" | "ton";

export interface Insumo {
  id: string;
  nombre: string;
  unidad: UnidadMedida;
  stockActual: number;
  stockMinimo: number;
  costoUnitario: number;
  ivaAcreditable: boolean; // true = IVA 16% al comprarlo (bolsas, gas, cal)
}

export interface CompraInsumo {
  id: string;
  insumoId: string;
  fecha: string; // ISO date
  cantidad: number;
  costoUnitario: number;
  costoSinIva: number;
  ivaAcreditado: number;
  proveedor: string;
  tieneCFDI: boolean;
}

// ── Producción ─────────────────────────────────────────────────────────────
export type Turno = "mañana" | "tarde";

export interface ConsumoInsumo {
  insumoId: string;
  cantidad: number;
}

export interface LoteProduccion {
  id: string;
  fecha: string;
  turno: Turno;
  kgMasaInicial: number;
  kgTortillasProducidas: number;
  rendimiento: number; // producidas / masaInicial
  consumoInsumos: ConsumoInsumo[];
  observaciones?: string;
}

// ── Clientes ───────────────────────────────────────────────────────────────
export type TipoCliente = "menudeo" | "mayoreo";

export interface Cliente {
  id: string;
  nombre: string;
  tipo: TipoCliente;
  rfc: string; // XAXX010101000 for general public
  regimenFiscal?: string;
  telefono?: string;
  saldoPendiente: number;
  activo: boolean;
}

// ── Ventas ─────────────────────────────────────────────────────────────────
export type FormaPagoSAT = "01" | "03" | "04" | "28" | "99";
// 01=efectivo, 03=transferencia SPEI, 04=tarjeta crédito, 28=tarjeta débito, 99=crédito

export interface VentaLinea {
  kgVendidos: number;
  precioKg: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  fecha: string;
  clienteId: string;
  lineas: VentaLinea[];
  total: number;
  formaPago: FormaPagoSAT;
  cfdiEmitido: boolean;
  folioCFDI?: string;
  nota?: string;
}

// ── Nómina ─────────────────────────────────────────────────────────────────
export type PeriodoNomina = "semanal" | "quincenal" | "mensual";
export type TipoPago = "salario_fijo" | "por_hora";

export interface Empleado {
  id: string;
  nombre: string;
  puesto: string;
  tipoPago: TipoPago;
  salarioBase: number; // $/semana (o /hora si por_hora)
  periodoNomina: PeriodoNomina;
  fechaInicio: string;
  fechaBaja?: string;
  activo: boolean;
}

export type FormaPagoNomina = "01" | "03" | "28"; // efectivo, SPEI, débito

export interface PagoNomina {
  id: string;
  empleadoId: string;
  periodoInicio: string;
  periodoFin: string;
  horasTrabajadas?: number;
  montoBase: number;
  deducciones: number;
  montoNeto: number;
  formaPago: FormaPagoNomina;
  tieneCFDI: boolean;
  nota?: string;
}

// ── Gastos Operativos (no-nómina) ──────────────────────────────────────────
export type CategoriaGasto = "gas" | "electricidad" | "renta" | "mantenimiento" | "empaque" | "otros";

export interface Gasto {
  id: string;
  fecha: string;
  categoría: CategoriaGasto;
  descripción: string;
  monto: number;
  tieneCFDI: boolean;
  ivaAcreditado: number;
  formaPago: FormaPagoSAT;
}

// ── Parámetros Globales ────────────────────────────────────────────────────
export interface Params {
  rfc: string;
  nombreNegocio: string;
  precioMenudeo: number;
  precioMayoreo: number;
}

// ── Ajustes de Inventario ──────────────────────────────────────────────────
export interface AjusteInventario {
  id: string;
  fecha: string;
  insumoId: string | "tortillas";
  cantidad: number; // positive = add, negative = remove
  motivo: string;
}

// ── Results ────────────────────────────────────────────────────────────────
export interface AlertaStock {
  insumoId: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  faltante: number;
  unidad: UnidadMedida;
}

export interface CostoDesglose {
  mpPorKg: number;
  manoObraPorKg: number;
  gastosOpPorKg: number;
  totalPorKg: number;
}

export interface PyLResult {
  ingresos: number;
  costoMP: number;
  costoLaboral: number;
  otrosGastos: number;
  utilidadBruta: number;
  utilidadNeta: number;
  margenBruto: number;
  margenNeto: number;
}

export interface ISRBimestralResult {
  ingresosBrutos: number;
  gastosDeducibles: number;
  nominaDeducible: number;
  ingresoNeto: number;
  tasaAplicada: number;
  isrACargo: number;
  bimestre: string;
}

export interface IVAMensualResult {
  ivaTrasladado: number;
  ivaAcreditable: number;
  ivaAFavor: number;
  mes: string;
}

export interface ResumenFormaPago {
  efectivo: number;
  transferencia: number;
  tarjetaCredito: number;
  tarjetaDebito: number;
  credito: number;
  totalDigital: number;
}
