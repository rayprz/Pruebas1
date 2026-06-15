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
  // Loaders & support
  { id: "ld01", unitNo: "LD-01", classId: "pl-992", modelId: "cat-992k", year: 2018, currentHours: 33000, annualHours: 4500, availability: 0.88, site: "Limestone Quarry", status: "active" },
  { id: "ld02", unitNo: "LD-02", classId: "pl-992", modelId: "km-wa800", year: 2021, currentHours: 16500, annualHours: 4500, availability: 0.9, site: "Limestone Quarry", status: "active" },
  { id: "ld31", unitNo: "LD-31", classId: "pl-988", modelId: "cat-988k", year: 2020, currentHours: 18000, annualHours: 3800, availability: 0.88, site: "Limestone Quarry", status: "active" },
  { id: "ex21", unitNo: "EX-21", classId: "ex-390", modelId: "cat-390", year: 2019, currentHours: 22000, annualHours: 4200, availability: 0.85, site: "Clay / Pozzolan", status: "active" },
  { id: "ld21", unitNo: "LD-21", classId: "wl-980", modelId: "cat-980m", year: 2020, currentHours: 19000, annualHours: 3600, availability: 0.88, site: "Plant Feed", status: "active" },
  { id: "dr41", unitNo: "DR-41", classId: "dz-d9", modelId: "cat-d9t", year: 2018, currentHours: 26000, annualHours: 2400, availability: 0.8, site: "Limestone Quarry", status: "active" },
  { id: "gr51", unitNo: "GR-51", classId: "mg-16", modelId: "cat-16", year: 2019, currentHours: 14000, annualHours: 1800, availability: 0.85, site: "Limestone Quarry", status: "active" },
  // Haul trucks — 777 class (100 T)
  { id: "ht01", unitNo: "HT-01", classId: "ht-777", modelId: "cat-777g", year: 2017, currentHours: 41000, annualHours: 5000, availability: 0.85, site: "Limestone Quarry", status: "active" },
  { id: "ht02", unitNo: "HT-02", classId: "ht-777", modelId: "cat-777g", year: 2017, currentHours: 39500, annualHours: 5000, availability: 0.85, site: "Limestone Quarry", status: "active" },
  { id: "ht03", unitNo: "HT-03", classId: "ht-777", modelId: "cat-777g", year: 2016, currentHours: 46000, annualHours: 5000, availability: 0.82, site: "Limestone Quarry", status: "standby" },
  { id: "ht04", unitNo: "HT-04", classId: "ht-777", modelId: "km-hd785", year: 2022, currentHours: 11000, annualHours: 5000, availability: 0.8, site: "Limestone Quarry", status: "active" },
  { id: "ht05", unitNo: "HT-05", classId: "ht-777", modelId: "km-hd785", year: 2022, currentHours: 10500, annualHours: 5000, availability: 0.8, site: "Limestone Quarry", status: "standby" },
  // Haul trucks — 773 class (60 T)
  { id: "ht06", unitNo: "HT-06", classId: "ht-773", modelId: "cat-773g", year: 2018, currentHours: 33000, annualHours: 4500, availability: 0.86, site: "Limestone Quarry", status: "active" },
  { id: "ht07", unitNo: "HT-07", classId: "ht-773", modelId: "cat-773g", year: 2018, currentHours: 34000, annualHours: 4500, availability: 0.85, site: "Limestone Quarry", status: "active" },
  { id: "ht08", unitNo: "HT-08", classId: "ht-773", modelId: "cat-773g", year: 2019, currentHours: 28000, annualHours: 4500, availability: 0.87, site: "Limestone Quarry", status: "active" },
  { id: "ht09", unitNo: "HT-09", classId: "ht-773", modelId: "cat-773g", year: 2016, currentHours: 47000, annualHours: 4200, availability: 0.83, site: "Clay / Pozzolan", status: "active" },
  { id: "ht10", unitNo: "HT-10", classId: "ht-773", modelId: "cat-773g", year: 2017, currentHours: 42000, annualHours: 4200, availability: 0.84, site: "Clay / Pozzolan", status: "active" },
  // Haul trucks — 740 articulated (40 T)
  { id: "at11", unitNo: "AT-11", classId: "at-740", modelId: "vo-a40", year: 2019, currentHours: 21000, annualHours: 4000, availability: 0.82, site: "Clay / Pozzolan", status: "active" },
  { id: "at12", unitNo: "AT-12", classId: "at-740", modelId: "cat-740gc", year: 2018, currentHours: 24000, annualHours: 3800, availability: 0.85, site: "Plant Feed", status: "active" },
  { id: "at13", unitNo: "AT-13", classId: "at-740", modelId: "cat-740gc", year: 2018, currentHours: 25000, annualHours: 3800, availability: 0.85, site: "Plant Feed", status: "active" },
  { id: "at14", unitNo: "AT-14", classId: "at-740", modelId: "cat-740gc", year: 2019, currentHours: 19000, annualHours: 3800, availability: 0.86, site: "Plant Feed", status: "active" },
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
