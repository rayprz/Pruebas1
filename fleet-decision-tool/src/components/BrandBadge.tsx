import type { Brand } from "@/lib/types";

const BRAND_STYLES: Record<Brand, string> = {
  Caterpillar: "bg-accentsoft text-accentink",
  Komatsu: "bg-[#dde8ee] text-[#3e6071]",
  "John Deere": "bg-olivesoft text-olive",
  Volvo: "bg-[#e0e0ee] text-[#4a4a78]",
  Hitachi: "bg-[#f3e1d2] text-[#9a5a2a]",
  Terex: "bg-dangersoft text-danger",
  Case: "bg-[#f0dde2] text-[#9a4f63]",
  Kawasaki: "bg-[#d7e8e4] text-[#3c7268]",
};

export function BrandBadge({ brand }: { brand: Brand }) {
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${BRAND_STYLES[brand]}`}
    >
      {brand}
    </span>
  );
}

export function EstimateBadge() {
  return (
    <span
      title="Costs estimated from the class reference model (Caterpillar OEM data)"
      className="inline-block rounded border border-line px-1 py-0.5 text-[10px] uppercase tracking-wide text-inkfaint"
    >
      est
    </span>
  );
}
