"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Params } from "./types";
import { SEED_PARAMS } from "@/data/seed";

const STORAGE_KEY = "tort-params-v1";

interface ParamsStore {
  params: Params;
  updateParams: (patch: Partial<Params>) => void;
}

const ParamsContext = createContext<ParamsStore | null>(null);

export function ParamsProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState<Params>(SEED_PARAMS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setParams(JSON.parse(saved)); } catch {}
  }, []);

  const store = useMemo<ParamsStore>(() => {
    const save = (next: Params) => {
      setParams(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    return {
      params,
      updateParams: (patch) => save({ ...params, ...patch }),
    };
  }, [params]);

  return <ParamsContext.Provider value={store}>{children}</ParamsContext.Provider>;
}

export function useParams(): ParamsStore {
  const ctx = useContext(ParamsContext);
  if (!ctx) throw new Error("useParams must be inside ParamsProvider");
  return ctx;
}
