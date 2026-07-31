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
  autoAi: boolean;
}

interface TaxonomyStore {
  taxonomy: Taxonomy;
  threshold: number;
  /** When true, low-confidence rows are escalated to the external AI automatically
   *  after the rules engine runs (the hybrid fallback). */
  autoAi: boolean;
  setTaxonomy: (t: Taxonomy) => void;
  setThreshold: (n: number) => void;
  setAutoAi: (v: boolean) => void;
  reset: () => void;
}

const TaxonomyContext = createContext<TaxonomyStore | null>(null);

export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const [taxonomy, setTaxonomyState] = useState<Taxonomy>(DEFAULT_TAXONOMY);
  const [threshold, setThresholdState] = useState<number>(DEFAULT_THRESHOLD);
  const [autoAi, setAutoAiState] = useState<boolean>(true);

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
        if (typeof saved.autoAi === "boolean") setAutoAiState(saved.autoAi);
      }
    } catch {
      // corrupted storage → keep defaults
    }
  }, []);

  const store = useMemo<TaxonomyStore>(() => {
    const persist = (t: Taxonomy, th: number, ai: boolean) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ taxonomy: t, threshold: th, autoAi: ai })
        );
      } catch {
        // storage unavailable → in-memory only
      }
    };
    return {
      taxonomy,
      threshold,
      autoAi,
      setTaxonomy: (t) => {
        setTaxonomyState(t);
        persist(t, threshold, autoAi);
      },
      setThreshold: (n) => {
        setThresholdState(n);
        persist(taxonomy, n, autoAi);
      },
      setAutoAi: (v) => {
        setAutoAiState(v);
        persist(taxonomy, threshold, v);
      },
      reset: () => {
        setTaxonomyState(DEFAULT_TAXONOMY);
        setThresholdState(DEFAULT_THRESHOLD);
        setAutoAiState(true);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      },
    };
  }, [taxonomy, threshold, autoAi]);

  return <TaxonomyContext.Provider value={store}>{children}</TaxonomyContext.Provider>;
}

export function useTaxonomy(): TaxonomyStore {
  const ctx = useContext(TaxonomyContext);
  if (!ctx) throw new Error("useTaxonomy must be used inside TaxonomyProvider");
  return ctx;
}
