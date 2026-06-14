"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FleetUnit, Site } from "./types";

const UNITS_KEY = "fleet-tool-units-v1";
const SITES_KEY = "fleet-tool-sites-v1";

export const BASE_YEAR = 2026;
export const CAPEX_HORIZON = 6;

// Sample fleet (loosely modeled on the Tepeaca quarry example) so the new
// sections are populated on first run. Users edit, add or clear these.
const SEED_SITES: Site[] = [
  {
    id: "site-limestone",
    name: "Limestone Quarry",
    productionTons: 3_880_000,
    haulKm: 2.5,
    loaderClassId: "pl-992",
    truckClassId: "ht-777",
  },
  {
    id: "site-clay",
    name: "Clay / Pozzolan",
    productionTons: 840_000,
    haulKm: 1.8,
    loaderClassId: "ex-390",
    truckClassId: "ht-773",
  },
  {
    id: "site-plant",
    name: "Plant Feed",
    productionTons: 688_000,
    haulKm: 1.2,
    loaderClassId: "pl-988",
    truckClassId: "ht-773",
  },
];

const SEED_UNITS: FleetUnit[] = [
  { id: "u1", unitNo: "LD-01", classId: "pl-992", modelId: "cat-992k", year: 2018, currentHours: 33000, annualHours: 4500, site: "Limestone Quarry", status: "active" },
  { id: "u2", unitNo: "LD-02", classId: "pl-992", modelId: "km-wa800", year: 2021, currentHours: 16500, annualHours: 4500, site: "Limestone Quarry", status: "active" },
  { id: "u3", unitNo: "HT-11", classId: "ht-777", modelId: "cat-777g", year: 2017, currentHours: 41000, annualHours: 5000, site: "Limestone Quarry", status: "active" },
  { id: "u4", unitNo: "HT-12", classId: "ht-777", modelId: "cat-777g", year: 2017, currentHours: 39500, annualHours: 5000, site: "Limestone Quarry", status: "active" },
  { id: "u5", unitNo: "HT-13", classId: "ht-777", modelId: "km-hd785", year: 2022, currentHours: 11000, annualHours: 5000, site: "Limestone Quarry", status: "active" },
  { id: "u6", unitNo: "HT-14", classId: "ht-777", modelId: "km-hd785", year: 2022, currentHours: 10500, annualHours: 5000, site: "Limestone Quarry", status: "standby" },
  { id: "u7", unitNo: "EX-21", classId: "ex-390", modelId: "cat-390", year: 2019, currentHours: 22000, annualHours: 4200, site: "Clay / Pozzolan", status: "active" },
  { id: "u8", unitNo: "HT-22", classId: "ht-773", modelId: "cat-773g", year: 2016, currentHours: 47000, annualHours: 4200, site: "Clay / Pozzolan", status: "active" },
  { id: "u9", unitNo: "LD-31", classId: "pl-988", modelId: "cat-988k", year: 2020, currentHours: 18000, annualHours: 3800, site: "Plant Feed", status: "active" },
  { id: "u10", unitNo: "HT-32", classId: "ht-773", modelId: "vo-l180", year: 2015, currentHours: 52000, annualHours: 3800, site: "Plant Feed", status: "down" },
  { id: "u11", unitNo: "DR-41", classId: "dz-d9", modelId: "cat-d9t", year: 2018, currentHours: 26000, annualHours: 2400, site: "Limestone Quarry", status: "active" },
  { id: "u12", unitNo: "GR-51", classId: "mg-16", modelId: "cat-16", year: 2019, currentHours: 14000, annualHours: 1800, site: "Limestone Quarry", status: "active" },
];

interface FleetStore {
  units: FleetUnit[];
  sites: Site[];
  addUnit: (u: FleetUnit) => void;
  updateUnit: (id: string, patch: Partial<FleetUnit>) => void;
  removeUnit: (id: string) => void;
  replaceUnits: (units: FleetUnit[]) => void;
  addSite: (s: Site) => void;
  updateSite: (id: string, patch: Partial<Site>) => void;
  removeSite: (id: string) => void;
  resetAll: () => void;
}

const FleetContext = createContext<FleetStore | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable → in-memory only
  }
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<FleetUnit[]>(SEED_UNITS);
  const [sites, setSites] = useState<Site[]>(SEED_SITES);

  useEffect(() => {
    setUnits(load(UNITS_KEY, SEED_UNITS));
    setSites(load(SITES_KEY, SEED_SITES));
  }, []);

  const store = useMemo<FleetStore>(() => {
    const persistUnits = (next: FleetUnit[]) => {
      setUnits(next);
      save(UNITS_KEY, next);
    };
    const persistSites = (next: Site[]) => {
      setSites(next);
      save(SITES_KEY, next);
    };
    return {
      units,
      sites,
      addUnit: (u) => persistUnits([...units, u]),
      updateUnit: (id, patch) =>
        persistUnits(units.map((u) => (u.id === id ? { ...u, ...patch } : u))),
      removeUnit: (id) => persistUnits(units.filter((u) => u.id !== id)),
      replaceUnits: (next) => persistUnits(next),
      addSite: (s) => persistSites([...sites, s]),
      updateSite: (id, patch) =>
        persistSites(sites.map((s) => (s.id === id ? { ...s, ...patch } : s))),
      removeSite: (id) => persistSites(sites.filter((s) => s.id !== id)),
      resetAll: () => {
        persistUnits(SEED_UNITS);
        persistSites(SEED_SITES);
      },
    };
  }, [units, sites]);

  return <FleetContext.Provider value={store}>{children}</FleetContext.Provider>;
}

export function useFleet(): FleetStore {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used inside FleetProvider");
  return ctx;
}
