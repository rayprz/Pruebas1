"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Venta } from "./types";
import { SEED_VENTAS } from "@/data/seed";

const STORAGE_KEY = "tort-ventas-v1";

interface VentasStore {
  ventas: Venta[];
  addVenta: (v: Venta) => void;
  removeVenta: (id: string) => void;
}

const VentasContext = createContext<VentasStore | null>(null);

export function VentasProvider({ children }: { children: ReactNode }) {
  const [ventas, setVentas] = useState<Venta[]>(SEED_VENTAS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setVentas(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<VentasStore>(() => {
    const save = (next: Venta[]) => {
      setVentas(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      ventas,
      addVenta: (v) => save([v, ...ventas]),
      removeVenta: (id) => save(ventas.filter((v) => v.id !== id)),
    };
  }, [ventas]);

  return <VentasContext.Provider value={store}>{children}</VentasContext.Provider>;
}

export function useVentas(): VentasStore {
  const ctx = useContext(VentasContext);
  if (!ctx) throw new Error("useVentas must be inside VentasProvider");
  return ctx;
}
