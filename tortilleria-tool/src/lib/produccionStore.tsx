"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LoteProduccion } from "./types";
import { SEED_LOTES } from "@/data/seed";

const STORAGE_KEY = "tort-prod-v1";

interface ProduccionStore {
  lotes: LoteProduccion[];
  addLote: (l: LoteProduccion) => void;
  updateLote: (id: string, patch: Partial<LoteProduccion>) => void;
  removeLote: (id: string) => void;
}

const ProduccionContext = createContext<ProduccionStore | null>(null);

export function ProduccionProvider({ children }: { children: ReactNode }) {
  const [lotes, setLotes] = useState<LoteProduccion[]>(SEED_LOTES);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setLotes(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<ProduccionStore>(() => {
    const save = (next: LoteProduccion[]) => {
      setLotes(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      lotes,
      addLote: (l) => save([l, ...lotes]),
      updateLote: (id, patch) => save(lotes.map((l) => (l.id === id ? { ...l, ...patch } : l))),
      removeLote: (id) => save(lotes.filter((l) => l.id !== id)),
    };
  }, [lotes]);

  return <ProduccionContext.Provider value={store}>{children}</ProduccionContext.Provider>;
}

export function useProduccion(): ProduccionStore {
  const ctx = useContext(ProduccionContext);
  if (!ctx) throw new Error("useProduccion must be inside ProduccionProvider");
  return ctx;
}
