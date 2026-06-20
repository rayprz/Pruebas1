"use client";

import { useEffect, useState } from "react";

interface ModuleIntroProps {
  id: string;
  title: string;
  description: string;
  connections?: string[];
}

export function ModuleIntro({ id, title, description, connections }: ModuleIntroProps) {
  const key = `tort-intro-${id}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === "closed") setOpen(false);
    } catch {}
  }, [key]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key, next ? "open" : "closed");
    } catch {}
  };

  return (
    <div
      className="mb-5 rounded-2xl p-4"
      style={{ background: "var(--maiz-light)", border: "1px solid var(--maiz)" }}
    >
      <button onClick={toggle} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: "#9a7a10" }}>
          <span
            className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold"
            style={{ background: "var(--maiz)", color: "var(--ink)" }}
          >
            i
          </span>
          {title}
        </span>
        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {open ? "Ocultar" : "Mostrar"}
        </span>
      </button>
      {open && (
        <div className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
          <p>{description}</p>
          {connections && connections.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {connections.map((c) => (
                <li
                  key={c}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)" }}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
