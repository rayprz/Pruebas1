"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_PARAMS } from "@/data/catalog";
import type { GlobalParams } from "./types";
import { api } from "./config";
import { JSON_HEADERS, useSyncedValue } from "./clientSync";

interface ParamsStore {
  params: GlobalParams;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  setParams: (next: GlobalParams) => void;
  update: (patch: Partial<GlobalParams>) => void;
  reset: () => void;
}

const ParamsContext = createContext<ParamsStore | null>(null);

const putParams = (next: GlobalParams) =>
  fetch(api("/api/params"), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(next) });

export function ParamsProvider({ children }: { children: ReactNode }) {
  const { value: params, isLoading, isSyncing, error, mutate } = useSyncedValue<GlobalParams>(
    "/api/params",
    DEFAULT_PARAMS
  );

  const store = useMemo<ParamsStore>(() => {
    const setParams = (next: GlobalParams) => mutate(next, () => putParams(next));
    return {
      params,
      isLoading,
      isSyncing,
      error,
      setParams,
      update: (patch) => setParams({ ...params, ...patch }),
      reset: () => setParams(DEFAULT_PARAMS),
    };
  }, [params, isLoading, isSyncing, error, mutate]);

  return <ParamsContext.Provider value={store}>{children}</ParamsContext.Provider>;
}

export function useParams(): ParamsStore {
  const ctx = useContext(ParamsContext);
  if (!ctx) throw new Error("useParams must be used inside ParamsProvider");
  return ctx;
}
