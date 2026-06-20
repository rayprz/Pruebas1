"use client";

import { useParams } from "@/lib/paramsStore";

export function Topbar() {
  const { params } = useParams();
  const fecha = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <header
      className="fixed left-16 right-0 top-0 z-20 flex h-14 items-center justify-between px-6 backdrop-blur"
      style={{ background: "rgba(253,246,236,0.9)", borderBottom: "1px solid var(--line)" }}
    >
      <span className="text-base font-bold" style={{ color: "var(--ink)" }}>
        {params.nombreNegocio}
      </span>
      <span className="text-xs capitalize" style={{ color: "var(--ink-muted)" }}>
        {fecha}
      </span>
    </header>
  );
}
