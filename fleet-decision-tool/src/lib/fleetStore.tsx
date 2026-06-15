"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FleetUnit } from "./types";
import { api } from "./config";

export const BASE_YEAR = 2026;
export const CAPEX_HORIZON = 6;

export const SEED_UNITS: FleetUnit[] = [
  // ===== Tepeaca =====
  { id: "ld01", unitNo: "LD-01", classId: "pl-992", modelId: "cat-992k", year: 2018, currentHours: 33000, annualHours: 4500, availability: 0.88, quarryId: "q-tepeaca", status: "active" },
  { id: "ld02", unitNo: "LD-02", classId: "pl-992", modelId: "km-wa800", year: 2021, currentHours: 16500, annualHours: 4500, availability: 0.9, quarryId: "q-tepeaca", status: "active" },
  { id: "ld31", unitNo: "LD-31", classId: "pl-988", modelId: "cat-988k", year: 2020, currentHours: 18000, annualHours: 3800, availability: 0.88, quarryId: "q-tepeaca", status: "active" },
  { id: "ex21", unitNo: "EX-21", classId: "ex-390", modelId: "cat-390", year: 2019, currentHours: 22000, annualHours: 4200, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "ld21", unitNo: "LD-21", classId: "wl-980", modelId: "cat-980m", year: 2020, currentHours: 19000, annualHours: 3600, availability: 0.88, quarryId: "q-tepeaca", status: "active" },
  { id: "dr41", unitNo: "DR-41", classId: "dz-d9", modelId: "cat-d9t", year: 2018, currentHours: 26000, annualHours: 2400, availability: 0.8, quarryId: "q-tepeaca", status: "active" },
  { id: "gr51", unitNo: "GR-51", classId: "mg-16", modelId: "cat-16", year: 2019, currentHours: 14000, annualHours: 1800, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "ht01", unitNo: "HT-01", classId: "ht-777", modelId: "cat-777g", year: 2017, currentHours: 41000, annualHours: 5000, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "ht02", unitNo: "HT-02", classId: "ht-777", modelId: "cat-777g", year: 2017, currentHours: 39500, annualHours: 5000, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "ht03", unitNo: "HT-03", classId: "ht-777", modelId: "cat-777g", year: 2016, currentHours: 46000, annualHours: 5000, availability: 0.82, quarryId: "q-tepeaca", status: "standby" },
  { id: "ht04", unitNo: "HT-04", classId: "ht-777", modelId: "km-hd785", year: 2022, currentHours: 11000, annualHours: 5000, availability: 0.8, quarryId: "q-tepeaca", status: "active" },
  { id: "ht05", unitNo: "HT-05", classId: "ht-777", modelId: "km-hd785", year: 2022, currentHours: 10500, annualHours: 5000, availability: 0.8, quarryId: "q-tepeaca", status: "standby" },
  { id: "ht06", unitNo: "HT-06", classId: "ht-773", modelId: "cat-773g", year: 2018, currentHours: 33000, annualHours: 4500, availability: 0.86, quarryId: "q-tepeaca", status: "active" },
  { id: "ht07", unitNo: "HT-07", classId: "ht-773", modelId: "cat-773g", year: 2018, currentHours: 34000, annualHours: 4500, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "ht08", unitNo: "HT-08", classId: "ht-773", modelId: "cat-773g", year: 2019, currentHours: 28000, annualHours: 4500, availability: 0.87, quarryId: "q-tepeaca", status: "active" },
  { id: "ht09", unitNo: "HT-09", classId: "ht-773", modelId: "cat-773g", year: 2016, currentHours: 47000, annualHours: 4200, availability: 0.83, quarryId: "q-tepeaca", status: "active" },
  { id: "ht10", unitNo: "HT-10", classId: "ht-773", modelId: "cat-773g", year: 2017, currentHours: 42000, annualHours: 4200, availability: 0.84, quarryId: "q-tepeaca", status: "active" },
  { id: "at11", unitNo: "AT-11", classId: "at-740", modelId: "vo-a40", year: 2019, currentHours: 21000, annualHours: 4000, availability: 0.82, quarryId: "q-tepeaca", status: "active" },
  { id: "at12", unitNo: "AT-12", classId: "at-740", modelId: "cat-740gc", year: 2018, currentHours: 24000, annualHours: 3800, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "at13", unitNo: "AT-13", classId: "at-740", modelId: "cat-740gc", year: 2018, currentHours: 25000, annualHours: 3800, availability: 0.85, quarryId: "q-tepeaca", status: "active" },
  { id: "at14", unitNo: "AT-14", classId: "at-740", modelId: "cat-740gc", year: 2019, currentHours: 19000, annualHours: 3800, availability: 0.86, quarryId: "q-tepeaca", status: "active" },
  // ===== Atotonilco =====
  { id: "a-ld1", unitNo: "ALD-01", classId: "pl-988", modelId: "cat-988k", year: 2019, currentHours: 24000, annualHours: 4000, availability: 0.87, quarryId: "q-atotonilco", status: "active" },
  { id: "a-ld2", unitNo: "ALD-02", classId: "wl-980", modelId: "km-wa500", year: 2020, currentHours: 18000, annualHours: 3400, availability: 0.85, quarryId: "q-atotonilco", status: "active" },
  { id: "a-ht1", unitNo: "AHT-01", classId: "ht-773", modelId: "cat-773g", year: 2018, currentHours: 31000, annualHours: 4400, availability: 0.85, quarryId: "q-atotonilco", status: "active" },
  { id: "a-ht2", unitNo: "AHT-02", classId: "ht-773", modelId: "cat-773g", year: 2018, currentHours: 32000, annualHours: 4400, availability: 0.85, quarryId: "q-atotonilco", status: "active" },
  { id: "a-ht3", unitNo: "AHT-03", classId: "ht-773", modelId: "km-hd465", year: 2021, currentHours: 14000, annualHours: 4400, availability: 0.83, quarryId: "q-atotonilco", status: "active" },
  { id: "a-ht4", unitNo: "AHT-04", classId: "ht-773", modelId: "cat-773g", year: 2017, currentHours: 38000, annualHours: 4000, availability: 0.84, quarryId: "q-atotonilco", status: "active" },
  { id: "a-at1", unitNo: "AAT-01", classId: "at-740", modelId: "cat-740gc", year: 2019, currentHours: 20000, annualHours: 3600, availability: 0.85, quarryId: "q-atotonilco", status: "active" },
  // ===== Monterrey =====
  { id: "m-ld1", unitNo: "MLD-01", classId: "wl-980", modelId: "cat-980m", year: 2017, currentHours: 32000, annualHours: 3600, availability: 0.86, quarryId: "q-monterrey", status: "active" },
  { id: "m-ld2", unitNo: "MLD-02", classId: "wl-966", modelId: "cat-966m", year: 2019, currentHours: 21000, annualHours: 3200, availability: 0.84, quarryId: "q-monterrey", status: "active" },
  { id: "m-ht1", unitNo: "MHT-01", classId: "ht-773", modelId: "cat-773g", year: 2016, currentHours: 45000, annualHours: 4200, availability: 0.82, quarryId: "q-monterrey", status: "active" },
  { id: "m-ht2", unitNo: "MHT-02", classId: "ht-773", modelId: "cat-773g", year: 2017, currentHours: 40000, annualHours: 4200, availability: 0.83, quarryId: "q-monterrey", status: "active" },
  { id: "m-ht3", unitNo: "MHT-03", classId: "ht-773", modelId: "vo-a40", year: 2018, currentHours: 30000, annualHours: 4000, availability: 0.82, quarryId: "q-monterrey", status: "active" },
  { id: "m-at1", unitNo: "MAT-01", classId: "at-740", modelId: "cat-740gc", year: 2018, currentHours: 26000, annualHours: 3600, availability: 0.84, quarryId: "q-monterrey", status: "active" },
];

interface FleetStore {
  units: FleetUnit[];
  /** Additive sync state (pages may ignore these). */
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  addUnit: (u: FleetUnit) => void;
  updateUnit: (id: string, patch: Partial<FleetUnit>) => void;
  removeUnit: (id: string) => void;
  replaceUnits: (units: FleetUnit[]) => void;
  resetAll: () => void;
}

const FleetContext = createContext<FleetStore | null>(null);

const JSON_HEADERS = { "Content-Type": "application/json" };

export function FleetProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isSyncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unitsRef = useRef<FleetUnit[]>([]);
  unitsRef.current = units;

  // Load the shared dataset from the API (scoped server-side by the user's role).
  useEffect(() => {
    let active = true;
    fetch(api("/api/fleet"))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: FleetUnit[]) => active && setUnits(data))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const store = useMemo<FleetStore>(() => {
    // Optimistic update: apply locally, fire the request, roll back on failure.
    const mutate = (optimistic: FleetUnit[], req: () => Promise<Response>) => {
      const prev = unitsRef.current;
      setUnits(optimistic);
      setSyncing(true);
      setError(null);
      void req()
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
        .catch((e) => {
          setUnits(prev);
          setError(e instanceof Error ? e.message : "Sync failed");
        })
        .finally(() => setSyncing(false));
    };
    return {
      units,
      isLoading,
      isSyncing,
      error,
      addUnit: (u) =>
        mutate([...units, u], () => fetch(api("/api/fleet"), { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(u) })),
      updateUnit: (id, patch) =>
        mutate(units.map((u) => (u.id === id ? { ...u, ...patch } : u)), () =>
          fetch(api(`/api/fleet/${id}`), { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(patch) })
        ),
      removeUnit: (id) => mutate(units.filter((u) => u.id !== id), () => fetch(api(`/api/fleet/${id}`), { method: "DELETE" })),
      replaceUnits: (next) =>
        mutate(next, () => fetch(api("/api/fleet"), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(next) })),
      resetAll: () =>
        mutate(SEED_UNITS, () => fetch(api("/api/fleet"), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(SEED_UNITS) })),
    };
  }, [units, isLoading, isSyncing, error]);

  return <FleetContext.Provider value={store}>{children}</FleetContext.Provider>;
}

export function useFleet(): FleetStore {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used inside FleetProvider");
  return ctx;
}
