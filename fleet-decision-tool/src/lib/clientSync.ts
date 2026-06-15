"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./config";

export const JSON_HEADERS = { "Content-Type": "application/json" };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Sync failed");
const okOrThrow = (res: Response) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
};

/** Optimistic collection synced with a REST resource. The store keeps the same
 *  hook interface; only the persistence (localStorage → fetch) changes. */
export function useSyncedList<T>(loadPath: string) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isSyncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<T[]>([]);
  ref.current = items;

  useEffect(() => {
    let active = true;
    fetch(api(loadPath))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: T[]) => active && setItems(d))
      .catch((e) => active && setError(msg(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadPath]);

  // Apply `optimistic` locally, fire `req`, roll back on failure.
  const mutate = useCallback((optimistic: T[], req: () => Promise<Response>) => {
    const prev = ref.current;
    setItems(optimistic);
    setSyncing(true);
    setError(null);
    void req()
      .then(okOrThrow)
      .catch((e) => {
        setItems(prev);
        setError(msg(e));
      })
      .finally(() => setSyncing(false));
  }, []);

  return { items, setItems, isLoading, isSyncing, error, mutate };
}

/** Optimistic single value (singleton resource: params, catalog overrides). */
export function useSyncedValue<T>(loadPath: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [isLoading, setLoading] = useState(true);
  const [isSyncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<T>(fallback);
  ref.current = value;

  useEffect(() => {
    let active = true;
    fetch(api(loadPath))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: T) => active && setValue(d))
      .catch((e) => active && setError(msg(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loadPath]);

  const mutate = useCallback((next: T, req: () => Promise<Response>) => {
    const prev = ref.current;
    setValue(next);
    setSyncing(true);
    setError(null);
    void req()
      .then(okOrThrow)
      .catch((e) => {
        setValue(prev);
        setError(msg(e));
      })
      .finally(() => setSyncing(false));
  }, []);

  return { value, setValue, isLoading, isSyncing, error, mutate };
}
