import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(42,38,32,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl italic leading-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-inksoft">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ink" | "accent" | "olive" | "danger" | "gold";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "olive"
        ? "text-olive"
        : tone === "danger"
          ? "text-danger"
          : tone === "gold"
            ? "text-gold"
            : "text-ink";
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-inkfaint">
        {label}
      </p>
      <p className={`font-display text-3xl tabular ${toneClass} mt-1`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-inksoft">{sub}</p>}
    </Card>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`font-display text-xl text-ink ${className}`}>{children}</h2>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <div className="inline-flex rounded-full border border-line bg-panel p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full transition-colors ${pad} ${
            value === o.value
              ? "bg-accent font-semibold text-card shadow-sm"
              : "text-inksoft hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-accent bg-accentsoft font-medium text-accentink"
          : "border-line bg-card text-inksoft hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-card hover:bg-accentink"
      : variant === "danger"
        ? "border border-line text-danger hover:bg-dangersoft"
        : "border border-line bg-card text-ink hover:border-line-strong";
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  min?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-inksoft">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-lg border border-line bg-card px-2 py-1 text-right tabular text-ink focus:border-accent focus:outline-none"
        />
        {suffix && <span className="w-12 text-xs text-inkfaint">{suffix}</span>}
      </span>
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink placeholder:text-inkfaint focus:border-accent focus:outline-none ${className}`}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-olivesoft text-olive",
  standby: "bg-accentsoft text-accentink",
  down: "bg-dangersoft text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-panel text-inksoft"
      }`}
    >
      {status}
    </span>
  );
}
