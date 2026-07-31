"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDashboard, IconImport, IconTaxonomy } from "./Icons";

const ITEMS: { href: string; label: string; Icon: typeof IconImport }[] = [
  { href: "/", label: "Import & Classify", Icon: IconImport },
  { href: "/dashboard", label: "Spend Dashboard", Icon: IconDashboard },
  { href: "/taxonomy", label: "Taxonomy & Rules", Icon: IconTaxonomy },
];

const LABEL_REVEAL =
  "whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100";

export function Sidebar() {
  const pathname = usePathname();
  return (
    // Spacer keeps page layout at rail width; the panel overlays on hover.
    <div className="w-16 shrink-0">
      <aside className="group fixed left-0 top-0 z-30 flex h-screen w-16 flex-col overflow-hidden border-r border-line bg-panel transition-[width] duration-200 ease-out hover:w-60 hover:shadow-[6px_0_24px_rgba(42,38,32,0.08)]">
        <Link href="/" className="flex items-center gap-2.5 px-3 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-card">
            S
          </span>
          <span className={`${LABEL_REVEAL} flex flex-col leading-tight`}>
            <span className="font-display text-base font-semibold text-ink">
              Spend Intel
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-inkfaint">
              Procurement
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
          {ITEMS.map(({ href, label, Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                  active
                    ? "bg-accentsoft text-accentink"
                    : "text-inksoft hover:bg-card hover:text-ink"
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center">
                  <Icon />
                </span>
                <span className={`${LABEL_REVEAL} text-sm font-medium`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-line px-3 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/90 text-sm font-semibold text-card">
            P
          </span>
          <span className={`${LABEL_REVEAL} flex flex-col leading-tight`}>
            <span className="text-sm font-medium text-ink">Procurement</span>
            <span className="text-[11px] text-inkfaint">Hybrid classifier</span>
          </span>
        </div>
      </aside>
    </div>
  );
}
