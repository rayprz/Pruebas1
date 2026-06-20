"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Insumo, CompraInsumo } from "./types";
import { SEED_INSUMOS, SEED_COMPRAS_INSUMOS } from "@/data/seed";

const STORAGE_KEY = "tort-mp-v1";

interface MPData {
  insumos: Insumo[];
  compras: CompraInsumo[];
}

interface MPStore extends MPData {
  updateInsumo: (id: string, patch: Partial<Insumo>) => void;
  addInsumo: (i: Insumo) => void;
  addCompra: (c: CompraInsumo) => void;
  removeCompra: (id: string) => void;
}

const MPContext = createContext<MPStore | null>(null);

const SEED: MPData = { insumos: SEED_INSUMOS, compras: SEED_COMPRAS_INSUMOS };

export function MateriaPrimaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MPData>(SEED);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setData(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<MPStore>(() => {
    const save = (next: MPData) => {
      setData(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      insumos: data.insumos,
      compras: data.compras,
      updateInsumo: (id, patch) =>
        save({ ...data, insumos: data.insumos.map((i) => (i.id === id ? { ...i, ...patch } : i)) }),
      addInsumo: (i) => save({ ...data, insumos: [...data.insumos, i] }),
      addCompra: (c) => save({ ...data, compras: [c, ...data.compras] }),
      removeCompra: (id) => save({ ...data, compras: data.compras.filter((c) => c.id !== id) }),
    };
  }, [data]);

  return <MPContext.Provider value={store}>{children}</MPContext.Provider>;
}

export function useMateriaPrima(): MPStore {
  const ctx = useContext(MPContext);
  if (!ctx) throw new Error("useMateriaPrima must be inside MateriaPrimaProvider");
  return ctx;
}
