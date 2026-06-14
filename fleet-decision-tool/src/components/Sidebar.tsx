"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalculator,
  IconCapex,
  IconCatalog,
  IconCompare,
  IconSites,
  IconTruck,
} from "./Icons";

const NAV = [
  { href: "/", label: "Cost Calculator", Icon: IconCalculator },
  { href: "/compare", label: "Compare Models", Icon: IconCompare },
  { href: "/fleet", label: "My Fleet", Icon: IconTruck },
  { href: "/capex", label: "CAPEX Planner", Icon: IconCapex },
  { href: "/sites", label: "Sites & Production", Icon: IconSites },
  { href: "/catalog", label: "Catalog", Icon: IconCatalog },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-4">
      <Link
        href="/"
        className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-card"
        title="Fleet Decision Tool"
      >
        F
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`group relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                active
                  ? "bg-accentsoft text-accentink"
                  : "text-inksoft hover:bg-card hover:text-ink"
              }`}
            >
              <Icon />
              <span className="pointer-events-none absolute left-12 z-30 whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-xs text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
