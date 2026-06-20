"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconPOS,
  IconProduccion,
  IconVentas,
  IconClientes,
  IconInventario,
  IconMateriaPrima,
  IconNomina,
  IconGastos,
  IconCostos,
  IconPyL,
  IconImpuestos,
} from "./Icons";
import type { ComponentType } from "react";

type IconType = ComponentType<{ size?: number }>;

const GROUPS: { heading: string; items: { href: string; label: string; Icon: IconType }[] }[] = [
  {
    heading: "Resumen",
    items: [{ href: "/", label: "Dashboard", Icon: IconDashboard }],
  },
  {
    heading: "Operación Diaria",
    items: [
      { href: "/pos", label: "Punto de Venta", Icon: IconPOS },
      { href: "/produccion", label: "Producción", Icon: IconProduccion },
      { href: "/ventas", label: "Ventas", Icon: IconVentas },
    ],
  },
  {
    heading: "Clientes e Inventario",
    items: [
      { href: "/clientes", label: "Clientes", Icon: IconClientes },
      { href: "/inventario", label: "Inventario", Icon: IconInventario },
    ],
  },
  {
    heading: "Recursos",
    items: [
      { href: "/materia-prima", label: "Materia Prima", Icon: IconMateriaPrima },
      { href: "/nomina", label: "Nómina", Icon: IconNomina },
    ],
  },
  {
    heading: "Finanzas",
    items: [
      { href: "/gastos", label: "Gastos", Icon: IconGastos },
      { href: "/costos", label: "Costos", Icon: IconCostos },
      { href: "/pyl", label: "P&L", Icon: IconPyL },
    ],
  },
  {
    heading: "Fiscal RESICO",
    items: [{ href: "/impuestos", label: "Impuestos", Icon: IconImpuestos }],
  },
];

const REVEAL = "whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="w-16 shrink-0">
      <aside
        className="group fixed left-0 top-0 z-30 flex h-screen w-16 flex-col overflow-hidden transition-[width] duration-200 ease-out hover:w-60 hover:shadow-[6px_0_24px_rgba(42,38,32,0.08)]"
        style={{ background: "#fff", borderRight: "1px solid var(--line)" }}
      >
        <Link href="/" className="flex items-center gap-2.5 px-3 py-4">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg font-bold"
            style={{ background: "var(--maiz)", color: "var(--ink)" }}
          >
            T
          </span>
          <span className={`${REVEAL} flex flex-col leading-tight`}>
            <span className="text-base font-bold" style={{ color: "var(--ink)" }}>
              Tortillería
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-muted)" }}>
              Administración
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 py-2">
          {GROUPS.map((group) => (
            <div key={group.heading}>
              <p
                className={`${REVEAL} mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em]`}
                style={{ color: "var(--ink-muted)" }}
              >
                {group.heading}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ href, label, Icon }) => {
                  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors"
                      style={
                        active
                          ? { background: "var(--maiz-light)", color: "#9a7a10" }
                          : { color: "var(--ink-muted)" }
                      }
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center">
                        <Icon />
                      </span>
                      <span className={`${REVEAL} text-sm font-medium`}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
