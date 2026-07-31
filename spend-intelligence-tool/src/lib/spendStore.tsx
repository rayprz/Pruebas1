"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { vendorKey } from "./classifier";
import type { Classification, LearnedMap, Transaction } from "./types";

const STORAGE_KEY = "spend-data-v1";

interface Persisted {
  transactions: Transaction[];
  learned: LearnedMap;
}

interface SpendStore {
  transactions: Transaction[];
  learned: LearnedMap;
  /** Replace the whole transaction list (e.g. after an import + classify). */
  setTransactions: (txs: Transaction[]) => void;
  /** Merge new classifications by transaction id (e.g. AI results). */
  applyClassifications: (updates: Record<string, Classification>) => void;
  /** Manual override for one row; also records a learned vendor mapping. */
  correct: (txId: string, categoryId: string, subcategoryId: string | null) => void;
  clear: () => void;
}

const SpendContext = createContext<SpendStore | null>(null);

export function SpendProvider({ children }: { children: ReactNode }) {
  const [transactions, setTxState] = useState<Transaction[]>([]);
  const [learned, setLearned] = useState<LearnedMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Persisted>;
        // One-time hydration from localStorage on mount — intentional setState.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(saved.transactions)) setTxState(saved.transactions);
        if (saved.learned && typeof saved.learned === "object") setLearned(saved.learned);
      }
    } catch {
      // corrupted storage → empty
    }
  }, []);

  const store = useMemo<SpendStore>(() => {
    const persist = (txs: Transaction[], lm: LearnedMap) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions: txs, learned: lm }));
      } catch {
        // storage unavailable → in-memory only
      }
    };

    return {
      transactions,
      learned,
      setTransactions: (txs) => {
        setTxState(txs);
        persist(txs, learned);
      },
      applyClassifications: (updates) => {
        const next = transactions.map((t) =>
          updates[t.id] ? { ...t, classification: updates[t.id] } : t
        );
        setTxState(next);
        persist(next, learned);
      },
      correct: (txId, categoryId, subcategoryId) => {
        const target = transactions.find((t) => t.id === txId);
        const nextTx = transactions.map((t) =>
          t.id === txId
            ? {
                ...t,
                classification: {
                  categoryId,
                  subcategoryId,
                  confidence: 1,
                  source: "manual" as const,
                },
              }
            : t
        );
        const nextLearned = target
          ? { ...learned, [vendorKey(target.vendor)]: { categoryId, subcategoryId } }
          : learned;
        setTxState(nextTx);
        setLearned(nextLearned);
        persist(nextTx, nextLearned);
      },
      clear: () => {
        setTxState([]);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions: [], learned }));
        } catch {}
      },
    };
  }, [transactions, learned]);

  return <SpendContext.Provider value={store}>{children}</SpendContext.Provider>;
}

export function useSpend(): SpendStore {
  const ctx = useContext(SpendContext);
  if (!ctx) throw new Error("useSpend must be used inside SpendProvider");
  return ctx;
}
