"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Gasto } from "./types";
import { SEED_GASTOS } from "@/data/seed";

const STORAGE_KEY = "tort-gastos-v1";

interface GastoStore {
  gastos: Gasto[];
  addGasto: (g: Gasto) => void;
  updateGasto: (id: string, patch: Partial<Gasto>) => void;
  removeGasto: (id: string) => void;
}

const GastoContext = createContext<GastoStore | null>(null);

export function GastoProvider({ children }: { children: ReactNode }) {
  const [gastos, setGastos] = useState<Gasto[]>(SEED_GASTOS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setGastos(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<GastoStore>(() => {
    const save = (next: Gasto[]) => {
      setGastos(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      gastos,
      addGasto: (g) => save([g, ...gastos]),
      updateGasto: (id, patch) => save(gastos.map((g) => (g.id === id ? { ...g, ...patch } : g))),
      removeGasto: (id) => save(gastos.filter((g) => g.id !== id)),
    };
  }, [gastos]);

  return <GastoContext.Provider value={store}>{children}</GastoContext.Provider>;
}

export function useGasto(): GastoStore {
  const ctx = useContext(GastoContext);
  if (!ctx) throw new Error("useGasto must be inside GastoProvider");
  return ctx;
}
