import type { ReactNode } from "react";

/** Small "i" icon that reveals a formula + explanation on hover/focus.
 *  `align` controls which edge the popover anchors to (use "right" inside
 *  right-aligned table headers to avoid clipping). */
export function InfoTip({
  title,
  formula,
  align = "center",
  children,
}: {
  title?: string;
  formula?: string;
  align?: "left" | "center" | "right";
  children?: ReactNode;
}) {
  const pos =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";
  return (
    <span className="group/info relative inline-flex align-middle">
      <button
        type="button"
        aria-label={title ? `${title} — formula` : "Show formula"}
        className="ml-1 grid h-3.5 w-3.5 shrink-0 cursor-help place-items-center rounded-full border border-line-strong text-[9px] font-bold leading-none text-inkfaint transition-colors hover:border-accent hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        i
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-50 mt-1.5 w-64 rounded-xl border border-line bg-card p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-inksoft opacity-0 shadow-[0_8px_24px_rgba(42,38,32,0.14)] transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100 ${pos}`}
      >
        {title && <span className="mb-1 block font-semibold text-ink">{title}</span>}
        {formula && (
          <code className="mb-1.5 block whitespace-pre-wrap rounded-lg bg-panel px-2 py-1.5 font-mono text-[11px] leading-relaxed text-accentink">
            {formula}
          </code>
        )}
        {children && <span className="block">{children}</span>}
      </span>
    </span>
  );
}
