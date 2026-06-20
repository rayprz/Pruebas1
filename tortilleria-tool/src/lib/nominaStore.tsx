"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Empleado, PagoNomina } from "./types";
import { SEED_EMPLEADOS, SEED_PAGOS_NOMINA } from "@/data/seed";

const STORAGE_KEY = "tort-nomina-v1";

interface NominaData {
  empleados: Empleado[];
  pagos: PagoNomina[];
}

interface NominaStore extends NominaData {
  addEmpleado: (e: Empleado) => void;
  updateEmpleado: (id: string, patch: Partial<Empleado>) => void;
  darDeBajaEmpleado: (id: string, fecha: string) => void;
  addPago: (p: PagoNomina) => void;
  removePago: (id: string) => void;
}

const NominaContext = createContext<NominaStore | null>(null);

const SEED: NominaData = { empleados: SEED_EMPLEADOS, pagos: SEED_PAGOS_NOMINA };

export function NominaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<NominaData>(SEED);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setData(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<NominaStore>(() => {
    const save = (next: NominaData) => {
      setData(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      empleados: data.empleados,
      pagos: data.pagos,
      addEmpleado: (e) => save({ ...data, empleados: [...data.empleados, e] }),
      updateEmpleado: (id, patch) =>
        save({ ...data, empleados: data.empleados.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
      darDeBajaEmpleado: (id, fecha) =>
        save({
          ...data,
          empleados: data.empleados.map((e) => (e.id === id ? { ...e, activo: false, fechaBaja: fecha } : e)),
        }),
      addPago: (p) => save({ ...data, pagos: [p, ...data.pagos] }),
      removePago: (id) => save({ ...data, pagos: data.pagos.filter((p) => p.id !== id) }),
    };
  }, [data]);

  return <NominaContext.Provider value={store}>{children}</NominaContext.Provider>;
}

export function useNomina(): NominaStore {
  const ctx = useContext(NominaContext);
  if (!ctx) throw new Error("useNomina must be inside NominaProvider");
  return ctx;
}
