"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Cost Calculator" },
  { href: "/compare", label: "Compare Models" },
  { href: "/catalog", label: "Catalog & Equivalences" },
];

const UPCOMING = ["My Fleet", "CAPEX Planner", "Sites & Production"];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-sm font-black text-slate-950">
            FD
          </span>
          <span className="text-sm font-bold tracking-wide">
            Fleet Decision Tool
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                pathname === l.href
                  ? "bg-slate-800 font-semibold text-yellow-300"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {UPCOMING.map((label) => (
            <span
              key={label}
              title="Coming in a later phase"
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-slate-600"
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
