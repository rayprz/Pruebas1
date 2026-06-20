import type { SVGProps } from "react";

type P = { size?: number } & SVGProps<SVGSVGElement>;

function base({ size = 20, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconDashboard = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconProduccion = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 20h20" />
    <path d="M4 20V9l5 3V9l5 3V6l6 4v10" />
  </svg>
);

export const IconVentas = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const IconPOS = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="13" rx="1" />
    <path d="M8 7h8" />
    <path d="M8 11h5" />
    <path d="M3 20h18" />
    <path d="M7 16v4" />
    <path d="M17 16v4" />
  </svg>
);

export const IconClientes = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
  </svg>
);

export const IconInventario = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 8 12 3 3 8l9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
);

export const IconMateriaPrima = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v20" />
    <path d="M12 8c-3 0-5-2-5-5 3 0 5 2 5 5z" />
    <path d="M12 8c3 0 5-2 5-5-3 0-5 2-5 5z" />
    <path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5z" />
    <path d="M12 14c3 0 5-2 5-5-3 0-5 2-5 5z" />
  </svg>
);

export const IconNomina = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-1a5 5 0 0 1 9-3" />
    <circle cx="17" cy="14" r="3" />
    <path d="M17 11v6M15 14h4" />
  </svg>
);

export const IconGastos = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1z" />
    <path d="M9 7h6M9 11h6M9 15h4" />
  </svg>
);

export const IconCostos = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2" />
  </svg>
);

export const IconPyL = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-4 4 3 5-7" />
  </svg>
);

export const IconImpuestos = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 2h9l5 5v15H6z" />
    <path d="M15 2v5h5" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M12 16v3" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 9v5M12 17h.01" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconEdit = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);

export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
