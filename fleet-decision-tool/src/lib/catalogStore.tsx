"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { EQUIVALENCE_CLASSES } from "@/data/catalog";
import type { EquivalenceClass } from "./types";
import { api } from "./config";
import { JSON_HEADERS, useSyncedValue } from "./clientSync";

type Overrides = Record<string, Partial<EquivalenceClass>>;

interface CatalogStore {
  /** Seed classes merged with user overrides — the single source of truth. */
  classes: EquivalenceClass[];
  classById: Map<string, EquivalenceClass>;
  overrides: Overrides;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  updateClass: (id: string, patch: Partial<EquivalenceClass>) => void;
  resetClass: (id: string) => void;
  resetAll: () => void;
  isOverridden: (id: string) => boolean;
}

const CatalogContext = createContext<CatalogStore | null>(null);

const putOverrides = (next: Overrides) =>
  fetch(api("/api/catalog"), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(next) });

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { value: overrides, isLoading, isSyncing, error, mutate } = useSyncedValue<Overrides>(
    "/api/catalog",
    {}
  );

  const store = useMemo<CatalogStore>(() => {
    const save = (next: Overrides) => mutate(next, () => putOverrides(next));
    const classes = EQUIVALENCE_CLASSES.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c));
    const classById = new Map(classes.map((c) => [c.id, c]));
    return {
      classes,
      classById,
      overrides,
      isLoading,
      isSyncing,
      error,
      updateClass: (id, patch) => save({ ...overrides, [id]: { ...overrides[id], ...patch } }),
      resetClass: (id) => {
        const next = { ...overrides };
        delete next[id];
        save(next);
      },
      resetAll: () => save({}),
      isOverridden: (id) => Boolean(overrides[id]),
    };
  }, [overrides, isLoading, isSyncing, error, mutate]);

  return <CatalogContext.Provider value={store}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogStore {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside CatalogProvider");
  return ctx;
}
