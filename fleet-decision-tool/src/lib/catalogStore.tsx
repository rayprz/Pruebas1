"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EQUIVALENCE_CLASSES } from "@/data/catalog";
import type { EquivalenceClass } from "./types";

const KEY = "fleet-tool-catalog-overrides-v1";

type Overrides = Record<string, Partial<EquivalenceClass>>;

interface CatalogStore {
  /** Seed classes merged with user overrides — the single source of truth. */
  classes: EquivalenceClass[];
  classById: Map<string, EquivalenceClass>;
  overrides: Overrides;
  updateClass: (id: string, patch: Partial<EquivalenceClass>) => void;
  resetClass: (id: string) => void;
  resetAll: () => void;
  isOverridden: (id: string) => boolean;
}

const CatalogContext = createContext<CatalogStore | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOverrides(JSON.parse(raw) as Overrides);
    } catch {
      /* ignore */
    }
  }, []);

  const store = useMemo<CatalogStore>(() => {
    const persist = (next: Overrides) => {
      setOverrides(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    };

    const classes = EQUIVALENCE_CLASSES.map((c) =>
      overrides[c.id] ? { ...c, ...overrides[c.id] } : c
    );
    const classById = new Map(classes.map((c) => [c.id, c]));

    return {
      classes,
      classById,
      overrides,
      updateClass: (id, patch) =>
        persist({ ...overrides, [id]: { ...overrides[id], ...patch } }),
      resetClass: (id) => {
        const next = { ...overrides };
        delete next[id];
        persist(next);
      },
      resetAll: () => persist({}),
      isOverridden: (id) => Boolean(overrides[id]),
    };
  }, [overrides]);

  return <CatalogContext.Provider value={store}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogStore {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside CatalogProvider");
  return ctx;
}
