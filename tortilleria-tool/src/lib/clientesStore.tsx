"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Cliente } from "./types";
import { SEED_CLIENTES } from "@/data/seed";

const STORAGE_KEY = "tort-clientes-v1";

interface ClientesStore {
  clientes: Cliente[];
  addCliente: (c: Cliente) => void;
  updateCliente: (id: string, patch: Partial<Cliente>) => void;
  darDeBaja: (id: string) => void;
  updateSaldo: (id: string, delta: number) => void;
}

const ClientesContext = createContext<ClientesStore | null>(null);

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>(SEED_CLIENTES);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setClientes(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<ClientesStore>(() => {
    const save = (next: Cliente[]) => {
      setClientes(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      clientes,
      addCliente: (c) => save([...clientes, c]),
      updateCliente: (id, patch) => save(clientes.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      darDeBaja: (id) => save(clientes.map((c) => (c.id === id ? { ...c, activo: false } : c))),
      updateSaldo: (id, delta) =>
        save(clientes.map((c) => (c.id === id ? { ...c, saldoPendiente: Math.max(0, c.saldoPendiente + delta) } : c))),
    };
  }, [clientes]);

  return <ClientesContext.Provider value={store}>{children}</ClientesContext.Provider>;
}

export function useClientes(): ClientesStore {
  const ctx = useContext(ClientesContext);
  if (!ctx) throw new Error("useClientes must be inside ClientesProvider");
  return ctx;
}
