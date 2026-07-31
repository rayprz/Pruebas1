"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_TAXONOMY, DEFAULT_THRESHOLD } from "@/data/taxonomy";
import type { Taxonomy } from "./types";

const STORAGE_KEY = "spend-taxonomy-v1";

interface Persisted {
  taxonomy: Taxonomy;
  threshold: number;
}

interface TaxonomyStore {
  taxonomy: Taxonomy;
  threshold: number;
  setTaxonomy: (t: Taxonomy) => void;
  setThreshold: (n: number) => void;
  reset: () => void;
}

const TaxonomyContext = createContext<TaxonomyStore | null>(null);

export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const [taxonomy, setTaxonomyState] = useState<Taxonomy>(DEFAULT_TAXONOMY);
  const [threshold, setThresholdState] = useState<number>(DEFAULT_THRESHOLD);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Persisted>;
        // One-time hydration from localStorage on mount — intentional setState.
        if (Array.isArray(saved.taxonomy) && saved.taxonomy.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTaxonomyState(saved.taxonomy);
        }
        if (typeof saved.threshold === "number") setThresholdState(saved.threshold);
      }
    } catch {
      // corrupted storage → keep defaults
    }
  }, []);

  const store = useMemo<TaxonomyStore>(() => {
    const persist = (t: Taxonomy, th: number) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ taxonomy: t, threshold: th }));
      } catch {
        // storage unavailable → in-memory only
      }
    };
    return {
      taxonomy,
      threshold,
      setTaxonomy: (t) => {
        setTaxonomyState(t);
        persist(t, threshold);
      },
      setThreshold: (n) => {
        setThresholdState(n);
        persist(taxonomy, n);
      },
      reset: () => {
        setTaxonomyState(DEFAULT_TAXONOMY);
        setThresholdState(DEFAULT_THRESHOLD);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      },
    };
  }, [taxonomy, threshold]);

  return <TaxonomyContext.Provider value={store}>{children}</TaxonomyContext.Provider>;
}

export function useTaxonomy(): TaxonomyStore {
  const ctx = useContext(TaxonomyContext);
  if (!ctx) throw new Error("useTaxonomy must be used inside TaxonomyProvider");
  return ctx;
}
