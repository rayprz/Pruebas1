"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Collapsible "how this module works" panel. State persists per module so
 *  power users can dismiss it and it stays dismissed. */
export function ModuleIntro({
  id,
  purpose,
  edit,
  output,
  connects,
}: {
  id: string;
  purpose: ReactNode;
  edit: ReactNode;
  output: ReactNode;
  connects: ReactNode;
}) {
  const key = `fleet-tool-intro-${id}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === "closed") setOpen(false);
    } catch {
      /* ignore */
    }
  }, [key]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key, next ? "open" : "closed");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-line bg-accentsoft/40 p-4">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-accentink">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-card">
            i
          </span>
          How to use this module
        </span>
        <span className="text-xs text-inksoft">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Block label="What it is" tone="ink">{purpose}</Block>
          <Block label="What you edit" tone="accent">{edit}</Block>
          <Block label="What you get" tone="olive">{output}</Block>
          <Block label="How it connects" tone="blue">{connects}</Block>
        </div>
      )}
    </div>
  );
}

function Block({
  label,
  children,
  tone,
}: {
  label: string;
  children: ReactNode;
  tone: "ink" | "accent" | "olive" | "blue";
}) {
  const dot =
    tone === "accent"
      ? "bg-accent"
      : tone === "olive"
        ? "bg-olive"
        : tone === "blue"
          ? "bg-blue"
          : "bg-ink";
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-inkfaint">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </p>
      <p className="text-inksoft">{children}</p>
    </div>
  );
}
