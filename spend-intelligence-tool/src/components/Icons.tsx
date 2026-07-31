// Minimal stroke icons, sized to the sidebar rail (24px box).
type IconProps = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconImport({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function IconDashboard({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

export function IconTaxonomy({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h10" />
      <path d="M4 12h16" />
      <path d="M4 18h12" />
      <circle cx="18" cy="6" r="1.6" />
      <circle cx="20" cy="18" r="1.6" />
    </svg>
  );
}
