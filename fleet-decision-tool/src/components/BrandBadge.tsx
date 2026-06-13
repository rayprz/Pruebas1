import type { Brand } from "@/lib/types";

const BRAND_STYLES: Record<Brand, string> = {
  Caterpillar: "bg-yellow-400/15 text-yellow-300 border-yellow-400/40",
  Komatsu: "bg-sky-400/15 text-sky-300 border-sky-400/40",
  "John Deere": "bg-green-400/15 text-green-300 border-green-400/40",
  Volvo: "bg-indigo-400/15 text-indigo-300 border-indigo-400/40",
  Hitachi: "bg-orange-400/15 text-orange-300 border-orange-400/40",
  Terex: "bg-red-400/15 text-red-300 border-red-400/40",
  Case: "bg-rose-400/15 text-rose-300 border-rose-400/40",
  Kawasaki: "bg-teal-400/15 text-teal-300 border-teal-400/40",
};

export function BrandBadge({ brand }: { brand: Brand }) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${BRAND_STYLES[brand]}`}
    >
      {brand}
    </span>
  );
}

export function EstimateBadge() {
  return (
    <span
      title="Costs estimated from the class reference model (Caterpillar OEM data)"
      className="inline-block rounded border border-slate-600 px-1 py-0.5 text-[10px] uppercase tracking-wide text-slate-400"
    >
      est
    </span>
  );
}
