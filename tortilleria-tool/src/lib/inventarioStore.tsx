"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AjusteInventario } from "./types";
import { SEED_AJUSTES_INVENTARIO } from "@/data/seed";

const STORAGE_KEY = "tort-inv-v1";

interface InventarioStore {
  ajustes: AjusteInventario[];
  addAjuste: (a: AjusteInventario) => void;
  removeAjuste: (id: string) => void;
}

const InventarioContext = createContext<InventarioStore | null>(null);

export function InventarioProvider({ children }: { children: ReactNode }) {
  const [ajustes, setAjustes] = useState<AjusteInventario[]>(SEED_AJUSTES_INVENTARIO);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setAjustes(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<InventarioStore>(() => {
    const save = (next: AjusteInventario[]) => {
      setAjustes(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      ajustes,
      addAjuste: (a) => save([a, ...ajustes]),
      removeAjuste: (id) => save(ajustes.filter((a) => a.id !== id)),
    };
  }, [ajustes]);

  return <InventarioContext.Provider value={store}>{children}</InventarioContext.Provider>;
}

export function useInventario(): InventarioStore {
  const ctx = useContext(InventarioContext);
  if (!ctx) throw new Error("useInventario must be inside InventarioProvider");
  return ctx;
}
