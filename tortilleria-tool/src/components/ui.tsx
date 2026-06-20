"use client";

import { type ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "accent";

function toneVars(tone: Tone): { color: string; bg: string } {
  switch (tone) {
    case "success":
      return { color: "var(--success)", bg: "var(--success-light)" };
    case "warning":
      return { color: "var(--warning)", bg: "var(--warning-light)" };
    case "danger":
      return { color: "var(--danger)", bg: "var(--danger-light)" };
    case "accent":
      return { color: "#9a7a10", bg: "var(--maiz-light)" };
    default:
      return { color: "var(--ink)", bg: "#f3efe6" };
  }
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "0 1px 2px rgba(42,38,32,0.05)" }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: Tone;
}) {
  const t = toneVars(tone);
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: t.color }}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {subtitle}
        </p>
      )}
    </Card>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-lg font-bold ${className}`} style={{ color: "var(--ink)" }}>
      {children}
    </h2>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--maiz)", color: "var(--ink)", border: "1px solid var(--maiz)" },
    ghost: { background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" },
    danger: { background: "var(--card)", color: "var(--terracota)", border: "1px solid var(--terracota)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium" style={{ color: "var(--ink-muted)" }}>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          min={min}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg px-2.5 py-1.5 text-right tabular-nums focus:outline-none"
          style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
        />
        {suffix && (
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const input = (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
      style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
    />
  );
  if (!label) return input;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium" style={{ color: "var(--ink-muted)" }}>
        {label}
      </span>
      {input}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const select = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
      style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium" style={{ color: "var(--ink-muted)" }}>
        {label}
      </span>
      {select}
    </label>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full p-0.5"
      style={{ border: "1px solid var(--line)", background: "#f3efe6" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
            style={
              active
                ? { background: "var(--maiz)", color: "var(--ink)" }
                : { background: "transparent", color: "var(--ink-muted)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={
        active
          ? { background: "var(--maiz-light)", color: "#9a7a10", border: "1px solid var(--maiz)" }
          : { background: "var(--card)", color: "var(--ink-muted)", border: "1px solid var(--line)" }
      }
    >
      {label}
    </button>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  const t = toneVars(tone);
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: t.bg, color: t.color }}
    >
      {children}
    </span>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        className="grid h-4 w-4 cursor-help place-items-center rounded-full text-[10px] font-bold"
        style={{ background: "var(--maiz)", color: "var(--ink)" }}
      >
        i
      </span>
      <span
        className="pointer-events-none absolute left-1/2 top-6 z-50 w-56 -translate-x-1/2 rounded-lg p-2 text-[11px] opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ background: "var(--ink)", color: "#fff" }}
      >
        {text}
      </span>
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl p-8 text-center text-sm"
      style={{ border: "1px dashed var(--line)", color: "var(--ink-muted)" }}
    >
      {message}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16"
      style={{ background: "rgba(26,26,26,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5"
        style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none"
            style={{ color: "var(--ink-muted)", border: "1px solid var(--line)" }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
