"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PARAMS } from "@/data/catalog";
import type { GlobalParams } from "./types";

const STORAGE_KEY = "fleet-tool-params-v1";

interface ParamsStore {
  params: GlobalParams;
  setParams: (next: GlobalParams) => void;
  update: (patch: Partial<GlobalParams>) => void;
  reset: () => void;
}

const ParamsContext = createContext<ParamsStore | null>(null);

export function ParamsProvider({ children }: { children: ReactNode }) {
  const [params, setParamsState] = useState<GlobalParams>(DEFAULT_PARAMS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GlobalParams>;
        setParamsState({
          ...DEFAULT_PARAMS,
          ...saved,
          hoursPerWeek: { ...DEFAULT_PARAMS.hoursPerWeek, ...saved.hoursPerWeek },
          brandFactors: { ...DEFAULT_PARAMS.brandFactors, ...saved.brandFactors },
        });
      }
    } catch {
      // corrupted storage → keep defaults
    }
  }, []);

  const store = useMemo<ParamsStore>(() => {
    const setParams = (next: GlobalParams) => {
      setParamsState(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode) → in-memory only
      }
    };
    return {
      params,
      setParams,
      update: (patch) => setParams({ ...params, ...patch }),
      reset: () => {
        setParamsState(DEFAULT_PARAMS);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      },
    };
  }, [params]);

  return <ParamsContext.Provider value={store}>{children}</ParamsContext.Provider>;
}

export function useParams(): ParamsStore {
  const ctx = useContext(ParamsContext);
  if (!ctx) throw new Error("useParams must be used inside ParamsProvider");
  return ctx;
}
