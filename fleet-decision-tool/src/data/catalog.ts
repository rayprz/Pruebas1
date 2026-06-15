import type {
  Brand,
  Category,
  EquipmentModel,
  EquivalenceClass,
  GlobalParams,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Seed data extracted from "Mobile_Equipment_OO_Costs_2022_Base_Year.xlsx"
// (OEM/dealer data, 2022 base year, USD, 500-hr and 250-hr service intervals).
// Cross-brand equivalences seeded from the workbook's "Product Match" sheet,
// updated to current series names where the sheet listed retired models.
// Maintenance values rounded to cents.
// ---------------------------------------------------------------------------

export const BRANDS: Brand[] = [
  "Caterpillar",
  "Komatsu",
  "John Deere",
  "Volvo",
  "Hitachi",
  "Terex",
  "Case",
  "Kawasaki",
];

export const CATEGORY_LABELS: Record<string, string> = {
  "wheel-loader": "Wheel Loaders",
  "pit-loader": "Pit Loaders",
  excavator: "Excavators",
  "rigid-truck": "Rigid Haul Trucks",
  "articulated-truck": "Articulated Trucks",
  dozer: "Dozers",
  "motor-grader": "Motor Graders",
  misc: "Support Equipment",
};

export const EQUIVALENCE_CLASSES: EquivalenceClass[] = [
  // --- Wheel loaders -------------------------------------------------------
  {
    id: "wl-950",
    name: "Wheel Loader – 950 class",
    category: "wheel-loader",
    maint500: { moderate: 18.31, average: 20.6, severe: 22.89 },
    maint250: { moderate: 24, average: 31, severe: 41 },
    fuelGalPerHr: { moderate: 2.35, average: 3.25, severe: 4.15 },
  },
  {
    id: "wl-962",
    name: "Wheel Loader – 962 class",
    category: "wheel-loader",
    maint500: { moderate: 18.88, average: 20.89, severe: 22.89 },
    maint250: { moderate: 25, average: 32, severe: 44 },
    fuelGalPerHr: { moderate: 2.6, average: 3.35, severe: 4.3 },
  },
  {
    id: "wl-966",
    name: "Wheel Loader – 966 class",
    category: "wheel-loader",
    maint500: { moderate: 21.17, average: 23.75, severe: 26.32 },
    maint250: { moderate: 31, average: 41, severe: 62 },
    fuelGalPerHr: { moderate: 2.75, average: 3.7, severe: 4.7 },
  },
  {
    id: "wl-972",
    name: "Wheel Loader – 972 class",
    category: "wheel-loader",
    maint500: { moderate: 21.17, average: 23.46, severe: 25.75 },
    maint250: { moderate: 32, average: 44, severe: 66 },
    fuelGalPerHr: { moderate: 3.6, average: 4.7, severe: 5.75 },
  },
  {
    id: "wl-980",
    name: "Wheel Loader – 980 class",
    category: "wheel-loader",
    maint500: { moderate: 22.32, average: 24.89, severe: 27.47 },
    maint250: { moderate: 38, average: 54, severe: 75 },
    fuelGalPerHr: { moderate: 4.5, average: 5.9, severe: 7.4 },
  },
  // --- Pit loaders ---------------------------------------------------------
  {
    id: "pl-988",
    name: "Pit Loader – 988 class",
    category: "pit-loader",
    payloadTons: 12.5,
    maint500: { moderate: 27.47, average: 30.61, severe: 33.76 },
    maint250: { moderate: 60, average: 81, severe: 109 },
    fuelGalPerHr: { moderate: 9, average: 11.75, severe: 15.55 },
  },
  {
    id: "pl-990",
    name: "Pit Loader – 990 class",
    category: "pit-loader",
    payloadTons: 16.5,
    maint500: { moderate: 29.18, average: 32.33, severe: 35.48 },
    maint250: { moderate: 75, average: 100, severe: 140 },
    fuelGalPerHr: { moderate: 13.25, average: 17.8, severe: 22 },
  },
  {
    id: "pl-992",
    name: "Pit Loader – 992 class",
    category: "pit-loader",
    payloadTons: 21,
    maint500: { moderate: 64.09, average: 71.24, severe: 78.39 },
    maint250: { moderate: 105, average: 125, severe: 171 },
    fuelGalPerHr: { moderate: 18, average: 23, severe: 29 },
  },
  {
    id: "pl-993",
    name: "Pit Loader – 993 class",
    category: "pit-loader",
    payloadTons: 25,
    maint500: { moderate: 80.11, average: 89.26, severe: 98.42 },
    fuelGalPerHr: { moderate: 19.7, average: 26.6, severe: 33.5 },
  },
  // --- Excavators ----------------------------------------------------------
  {
    id: "ex-320",
    name: "Excavator – 320 class (20 t)",
    category: "excavator",
    maint500: { moderate: 13.73, average: 15.16, severe: 16.59 },
    maint250: { moderate: 19, average: 22, severe: 34 },
    // Source sheet listed 1.9 / 4.0 / 2.55; middle/severe order normalized.
    fuelGalPerHr: { moderate: 1.9, average: 2.55, severe: 4.0 },
  },
  {
    id: "ex-330",
    name: "Excavator – 330 class (30 t)",
    category: "excavator",
    maint500: { moderate: 16.02, average: 18.02, severe: 20.03 },
    maint250: { moderate: 27, average: 32, severe: 51 },
    fuelGalPerHr: { moderate: 5.95, average: 9.75, severe: 12.45 },
  },
  {
    id: "ex-349",
    name: "Excavator – 349 class (50 t)",
    category: "excavator",
    maint500: { moderate: 22.89, average: 25.46, severe: 28.04 },
    maint250: { moderate: 37, average: 49, severe: 72 },
    fuelGalPerHr: { moderate: 6.05, average: 10.05, severe: 14 },
  },
  {
    id: "ex-374",
    name: "Excavator – 374 class (75 t)",
    category: "excavator",
    maint500: { moderate: 28.61, average: 32.04, severe: 35.48 },
    maint250: { moderate: 62, average: 80, severe: 124 },
    fuelGalPerHr: { moderate: 7.45, average: 12.9, severe: 17.4 },
  },
  {
    id: "ex-390",
    name: "Excavator – 390 class (90 t)",
    category: "excavator",
    maint500: { moderate: 30.33, average: 33.76, severe: 37.19 },
    maint250: { moderate: 68, average: 85, severe: 131 },
    fuelGalPerHr: { moderate: 8.2, average: 13.7, severe: 19.1 },
  },
  // --- Rigid haul trucks ---------------------------------------------------
  {
    id: "ht-770",
    name: "Rigid Truck – 770 class (40 T)",
    category: "rigid-truck",
    payloadTons: 40,
    maint500: { moderate: 18.31, average: 20.31, severe: 22.32 },
    maint250: { moderate: 36, average: 45, severe: 58 },
    fuelGalPerHr: { moderate: 6.75, average: 9.45, severe: 12.15 },
  },
  {
    id: "ht-773",
    name: "Rigid Truck – 773 class (60 T)",
    category: "rigid-truck",
    payloadTons: 60,
    maint500: { moderate: 18.88, average: 21.17, severe: 23.46 },
    maint250: { moderate: 48, average: 61, severe: 80 },
    fuelGalPerHr: { moderate: 9.6, average: 13.4, severe: 17.25 },
  },
  {
    id: "ht-775",
    name: "Rigid Truck – 775 class (70 T)",
    category: "rigid-truck",
    payloadTons: 70,
    maint500: { moderate: 26.32, average: 29.18, severe: 32.04 },
    maint250: { moderate: 50, average: 63, severe: 82 },
    fuelGalPerHr: { moderate: 10.25, average: 14.35, severe: 18.4 },
  },
  {
    id: "ht-777",
    name: "Rigid Truck – 777 class (100 T)",
    category: "rigid-truck",
    payloadTons: 100,
    maint500: { moderate: 48.06, average: 53.79, severe: 59.51 },
    maint250: { moderate: 58, average: 80, severe: 109 },
    fuelGalPerHr: { moderate: 12.3, average: 17.3, severe: 22.3 },
  },
  {
    id: "ht-785",
    name: "Rigid Truck – 785 class (150 T)",
    category: "rigid-truck",
    payloadTons: 150,
    maint500: { moderate: 58.94, average: 65.8, severe: 72.67 },
    maint250: { moderate: 76, average: 102, severe: 138 },
    fuelGalPerHr: { moderate: 17.9, average: 25.1, severe: 32.25 },
  },
  // --- Articulated trucks --------------------------------------------------
  {
    id: "at-740",
    name: "Articulated Truck – 740 class (40 T)",
    category: "articulated-truck",
    payloadTons: 40,
    maint500: { moderate: 19.45, average: 21.74, severe: 24.03 },
    fuelGalPerHr: { moderate: 4.9, average: 7.9, severe: 10.9 },
  },
  // --- Dozers --------------------------------------------------------------
  {
    id: "dz-d5",
    name: "Dozer – D5 class",
    category: "dozer",
    maint500: { moderate: 9.73, average: 10.87, severe: 12.02 },
    maint250: { moderate: 20, average: 25, severe: 30 },
    fuelGalPerHr: { moderate: 2.1, average: 2.5, severe: 2.8 },
  },
  {
    id: "dz-d6",
    name: "Dozer – D6 class",
    category: "dozer",
    maint500: { moderate: 18.31, average: 20.6, severe: 22.89 },
    maint250: { moderate: 23, average: 30, severe: 50 },
    fuelGalPerHr: { moderate: 4.6, average: 5.5, severe: 7.5 },
  },
  {
    id: "dz-d7",
    name: "Dozer – D7 class",
    category: "dozer",
    maint500: { moderate: 19.45, average: 21.46, severe: 23.46 },
    maint250: { moderate: 36, average: 46, severe: 56 },
    fuelGalPerHr: { moderate: 4.7, average: 6.35, severe: 8.15 },
  },
  {
    id: "dz-d8",
    name: "Dozer – D8 class",
    category: "dozer",
    maint500: { moderate: 24.03, average: 26.89, severe: 29.75 },
    maint250: { moderate: 46, average: 61, severe: 73 },
    fuelGalPerHr: { moderate: 7.7, average: 10.4, severe: 13.1 },
  },
  {
    id: "dz-d9",
    name: "Dozer – D9 class",
    category: "dozer",
    maint500: { moderate: 24.6, average: 27.47, severe: 30.33 },
    maint250: { moderate: 69, average: 86, severe: 107 },
    fuelGalPerHr: { moderate: 9.7, average: 13.15, severe: 16.6 },
  },
  {
    id: "dz-d10",
    name: "Dozer – D10 class",
    category: "dozer",
    maint500: { moderate: 49.78, average: 55.5, severe: 61.23 },
    maint250: { moderate: 86, average: 104, severe: 165 },
    fuelGalPerHr: { moderate: 13.7, average: 18.55, severe: 23.4 },
  },
  {
    id: "dz-d11",
    name: "Dozer – D11 class",
    category: "dozer",
    maint500: { moderate: 65.23, average: 67.52, severe: 69.81 },
    fuelGalPerHr: { moderate: 19.8, average: 26.5, severe: 33.5 },
  },
  // --- Motor graders -------------------------------------------------------
  {
    id: "mg-12",
    name: "Motor Grader – 12 class",
    category: "motor-grader",
    maint500: { moderate: 22.32, average: 24.6, severe: 26.89 },
    maint250: { moderate: 21, average: 25, severe: 31 },
    fuelGalPerHr: { moderate: 2.3, average: 3.3, severe: 5.2 },
  },
  {
    id: "mg-140",
    name: "Motor Grader – 140 class",
    category: "motor-grader",
    maint500: { moderate: 22.89, average: 25.18, severe: 27.47 },
    maint250: { moderate: 22, average: 26, severe: 33 },
    fuelGalPerHr: { moderate: 2.75, average: 4.3, severe: 6.4 },
  },
  {
    id: "mg-160",
    name: "Motor Grader – 160 class",
    category: "motor-grader",
    maint500: { moderate: 22.89, average: 25.46, severe: 28.04 },
    maint250: { moderate: 23, average: 29, severe: 37 },
    fuelGalPerHr: { moderate: 2.75, average: 4.3, severe: 6.5 },
  },
  {
    id: "mg-14",
    name: "Motor Grader – 14 class",
    category: "motor-grader",
    maint500: { moderate: 25.18, average: 28.04, severe: 30.9 },
    maint250: { moderate: 27, average: 35, severe: 46 },
    fuelGalPerHr: { moderate: 3.2, average: 4.9, severe: 8.25 },
  },
  {
    id: "mg-16",
    name: "Motor Grader – 16 class",
    category: "motor-grader",
    maint500: { moderate: 25.18, average: 28.04, severe: 30.9 },
    maint250: { moderate: 37, average: 48, severe: 64 },
    fuelGalPerHr: { moderate: 3.85, average: 6.6, severe: 9.85 },
  },
  // --- Support equipment ---------------------------------------------------
  {
    id: "ms-skid-s",
    name: "Skid Steer – Small",
    category: "misc",
    maint500: { moderate: 9.73, average: 11.16, severe: 12.59 },
    fuelGalPerHr: { moderate: 1.9, average: 2.5, severe: 3.4 },
  },
  {
    id: "ms-skid-l",
    name: "Skid Steer – Large",
    category: "misc",
    maint500: { moderate: 10.3, average: 11.73, severe: 13.16 },
    fuelGalPerHr: { moderate: 2.2, average: 3.0, severe: 3.5 },
  },
  {
    id: "ms-tele",
    name: "Telehandler",
    category: "misc",
    maint500: { moderate: 8.01, average: 9.16, severe: 10.3 },
    fuelGalPerHr: { moderate: 1.5, average: 3.4, severe: 3.9 },
  },
];

const m = (
  id: string,
  brand: Brand,
  model: string,
  classId: string,
  source: "oem" | "equivalence" = "equivalence"
): EquipmentModel => ({ id, brand, model, classId, source });

export const MODELS: EquipmentModel[] = [
  // Wheel loaders
  m("cat-950gc", "Caterpillar", "950 GC", "wl-950", "oem"),
  m("jd-644", "John Deere", "644", "wl-950"),
  m("km-wa380", "Komatsu", "WA380", "wl-950"),
  m("vo-l110", "Volvo", "L110", "wl-950"),
  m("kw-80zv", "Kawasaki", "80ZV", "wl-950"),
  m("cs-821", "Case", "821", "wl-950"),
  m("cat-962m", "Caterpillar", "962M", "wl-962", "oem"),
  m("jd-724", "John Deere", "724", "wl-962"),
  m("km-wa400", "Komatsu", "WA400", "wl-962"),
  m("vo-l120", "Volvo", "L120", "wl-962"),
  m("kw-85zv", "Kawasaki", "85ZV", "wl-962"),
  m("cat-966m", "Caterpillar", "966M", "wl-966", "oem"),
  m("jd-744", "John Deere", "744", "wl-966"),
  m("km-wa450", "Komatsu", "WA450", "wl-966"),
  m("vo-l150", "Volvo", "L150", "wl-966"),
  m("cs-921", "Case", "921", "wl-966"),
  m("cat-972m", "Caterpillar", "972M", "wl-972", "oem"),
  m("jd-824", "John Deere", "824", "wl-972"),
  m("km-wa480", "Komatsu", "WA480", "wl-972"),
  m("vo-l180", "Volvo", "L180", "wl-972"),
  m("kw-90zv", "Kawasaki", "90ZV", "wl-972"),
  m("cat-980m", "Caterpillar", "980M", "wl-980", "oem"),
  m("jd-844", "John Deere", "844", "wl-980"),
  m("km-wa500", "Komatsu", "WA500", "wl-980"),
  m("vo-l220", "Volvo", "L220", "wl-980"),
  m("kw-95zv", "Kawasaki", "95ZV", "wl-980"),
  m("cs-1221", "Case", "1221", "wl-980"),
  // Pit loaders
  m("cat-988k", "Caterpillar", "988K", "pl-988", "oem"),
  m("km-wa600", "Komatsu", "WA600", "pl-988"),
  m("vo-l350", "Volvo", "L350", "pl-988"),
  m("kw-115zv", "Kawasaki", "L115ZV", "pl-988"),
  m("cat-990k", "Caterpillar", "990K", "pl-990", "oem"),
  m("km-wa700", "Komatsu", "WA700", "pl-990"),
  m("kw-135zv", "Kawasaki", "L135ZV", "pl-990"),
  m("cat-992k", "Caterpillar", "992K", "pl-992", "oem"),
  m("km-wa800", "Komatsu", "WA800", "pl-992"),
  m("cat-993k", "Caterpillar", "993K", "pl-993", "oem"),
  m("km-wa900", "Komatsu", "WA900", "pl-993"),
  // Excavators
  m("cat-320", "Caterpillar", "320", "ex-320", "oem"),
  m("km-pc210", "Komatsu", "PC210", "ex-320"),
  m("jd-210g", "John Deere", "210G", "ex-320"),
  m("vo-ec220", "Volvo", "EC220", "ex-320"),
  m("cat-330", "Caterpillar", "330", "ex-330", "oem"),
  m("km-pc300", "Komatsu", "PC300", "ex-330"),
  m("jd-300g", "John Deere", "300G", "ex-330"),
  m("vo-ec300", "Volvo", "EC300", "ex-330"),
  m("cat-349", "Caterpillar", "349", "ex-349", "oem"),
  m("km-pc490", "Komatsu", "PC490", "ex-349"),
  m("jd-470g", "John Deere", "470G", "ex-349"),
  m("vo-ec480", "Volvo", "EC480", "ex-349"),
  m("cat-374", "Caterpillar", "374", "ex-374", "oem"),
  m("km-pc700", "Komatsu", "PC700", "ex-374"),
  m("vo-ec750", "Volvo", "EC750", "ex-374"),
  m("hi-zx690", "Hitachi", "ZX690", "ex-374"),
  m("cat-390", "Caterpillar", "390", "ex-390", "oem"),
  m("km-pc800", "Komatsu", "PC800", "ex-390"),
  m("vo-ec950", "Volvo", "EC950", "ex-390"),
  m("hi-zx890", "Hitachi", "ZX890", "ex-390"),
  // Rigid trucks
  m("cat-770", "Caterpillar", "770", "ht-770", "oem"),
  m("km-hd325", "Komatsu", "HD325", "ht-770"),
  m("hi-eh700", "Hitachi", "EH700", "ht-770"),
  m("tx-tr35", "Terex", "TR35", "ht-770"),
  m("cat-773g", "Caterpillar", "773G", "ht-773", "oem"),
  m("km-hd465", "Komatsu", "HD465", "ht-773"),
  m("tx-tr60", "Terex", "TR60", "ht-773"),
  m("cat-775g", "Caterpillar", "775G", "ht-775", "oem"),
  m("km-hd605", "Komatsu", "HD605", "ht-775"),
  m("hi-eh1100", "Hitachi", "EH1100", "ht-775"),
  m("tx-tr70", "Terex", "TR70", "ht-775"),
  m("cat-777g", "Caterpillar", "777G", "ht-777", "oem"),
  m("km-hd785", "Komatsu", "HD785", "ht-777"),
  m("hi-eh1600", "Hitachi", "EH1600", "ht-777"),
  m("tx-tr100", "Terex", "TR100", "ht-777"),
  m("cat-785g", "Caterpillar", "785G", "ht-785", "oem"),
  m("km-hd1500", "Komatsu", "HD1500", "ht-785"),
  // Articulated trucks
  m("cat-740gc", "Caterpillar", "740 GC", "at-740", "oem"),
  m("km-hm400", "Komatsu", "HM400", "at-740"),
  m("jd-410e", "John Deere", "410E", "at-740"),
  m("vo-a40", "Volvo", "A40", "at-740"),
  m("tx-ta40", "Terex", "TA40", "at-740"),
  // Dozers
  m("cat-d5", "Caterpillar", "D5", "dz-d5", "oem"),
  m("km-d61", "Komatsu", "D61", "dz-d5"),
  m("jd-750", "John Deere", "750", "dz-d5"),
  m("cat-d6", "Caterpillar", "D6", "dz-d6", "oem"),
  m("km-d65", "Komatsu", "D65", "dz-d6"),
  m("jd-850", "John Deere", "850", "dz-d6"),
  m("cat-d7e", "Caterpillar", "D7E", "dz-d7", "oem"),
  m("km-d85", "Komatsu", "D85", "dz-d7"),
  m("jd-950", "John Deere", "950", "dz-d7"),
  m("cat-d8t", "Caterpillar", "D8T", "dz-d8", "oem"),
  m("km-d155", "Komatsu", "D155", "dz-d8"),
  m("jd-1050", "John Deere", "1050", "dz-d8"),
  m("cat-d9t", "Caterpillar", "D9T", "dz-d9", "oem"),
  m("km-d275", "Komatsu", "D275", "dz-d9"),
  m("cat-d10t", "Caterpillar", "D10T", "dz-d10", "oem"),
  m("km-d375", "Komatsu", "D375", "dz-d10"),
  m("cat-d11", "Caterpillar", "D11", "dz-d11", "oem"),
  m("km-d475", "Komatsu", "D475", "dz-d11"),
  // Motor graders
  m("cat-12", "Caterpillar", "12", "mg-12", "oem"),
  m("km-gd555", "Komatsu", "GD555", "mg-12"),
  m("jd-670g", "John Deere", "670G", "mg-12"),
  m("cat-140", "Caterpillar", "140", "mg-140", "oem"),
  m("km-gd655", "Komatsu", "GD655", "mg-140"),
  m("jd-772g", "John Deere", "772G", "mg-140"),
  m("cat-160", "Caterpillar", "160", "mg-160", "oem"),
  m("km-gd675", "Komatsu", "GD675", "mg-160"),
  m("jd-872g", "John Deere", "872G", "mg-160"),
  m("cat-14", "Caterpillar", "14", "mg-14", "oem"),
  m("km-gd825", "Komatsu", "GD825", "mg-14"),
  m("cat-16", "Caterpillar", "16", "mg-16", "oem"),
  m("km-gd955", "Komatsu", "GD955", "mg-16"),
  // Support equipment
  m("cat-226d", "Caterpillar", "226D", "ms-skid-s", "oem"),
  m("jd-318g", "John Deere", "318G", "ms-skid-s"),
  m("cs-sr210", "Case", "SR210", "ms-skid-s"),
  m("cat-272d", "Caterpillar", "272D", "ms-skid-l", "oem"),
  m("jd-332g", "John Deere", "332G", "ms-skid-l"),
  m("cs-sv340", "Case", "SV340", "ms-skid-l"),
  m("cat-th350b", "Caterpillar", "TH350B", "ms-tele", "oem"),
];

// ---------------------------------------------------------------------------
// Loader/excavator ↔ truck pass match ("Cat Pass Match" sheet).
// Values are passes required to fill the truck.
// ---------------------------------------------------------------------------

export interface PassMatchTable {
  title: string;
  note?: string;
  loaders: string[];
  rows: { truck: string; passes: (string | null)[] }[];
}

export const PASS_MATCH: PassMatchTable[] = [
  {
    title: "Rigid trucks × pit loaders",
    note: "Loaders ≈ 30–40 s cycle, truck exchange ≈ 40 s",
    loaders: ["988 (12.5 T)", "990 (16.5 T)", "992 (21 T)", "993 (25 T)", "994 (35 T)"],
    rows: [
      { truck: "770 (40 T)", passes: ["3-4", null, null, null, null] },
      { truck: "772 (50 T)", passes: ["3-4", "2-3", null, null, null] },
      { truck: "773 (60 T)", passes: ["4-5", "3-4", "2-3", null, null] },
      { truck: "775 (70 T)", passes: ["5-6", "3-4", "2-3", null, null] },
      { truck: "777 (100 T)", passes: [null, "4-5", "4-5", "4", null] },
      { truck: "785 (150 T)", passes: [null, null, null, "6", "4"] },
      { truck: "789 (195 T)", passes: [null, null, null, null, "5-6"] },
      { truck: "793 (240 T)", passes: [null, null, null, null, "7"] },
    ],
  },
  {
    title: "Articulated/rigid trucks × wheel loaders",
    loaders: ["950", "962", "966", "972", "980", "988"],
    rows: [
      { truck: "725 (26 T)", passes: ["4-5", "4", "3-4", null, null, null] },
      { truck: "730 (31 T)", passes: ["5-6", "5", "4-5", "4", "3", null] },
      { truck: "735 (36 T)", passes: ["6", "6", "5", "4-5", "3-4", "3"] },
      { truck: "740 (42 T)", passes: [null, null, "5-6", "5", "4", "3-4"] },
    ],
  },
  {
    title: "Trucks × excavators",
    note: "Hydraulic excavators ≈ 18–24 s cycle",
    loaders: ["325", "330", "345", "365", "385"],
    rows: [
      { truck: "725 (26 T)", passes: ["5-6", "4-5", null, null, null] },
      { truck: "730 (31 T)", passes: ["6", "5-6", "4-5", null, null] },
      { truck: "735 (36 T)", passes: [null, null, "5", "4", null] },
      { truck: "740 (42 T)", passes: [null, null, "6", "4-5", "3"] },
      { truck: "770 (40 T)", passes: [null, null, null, null, "3-4"] },
      { truck: "772 (50 T)", passes: [null, null, null, null, "4-5"] },
      { truck: "773 (60 T)", passes: [null, null, null, null, "5-6"] },
      { truck: "775 (70 T)", passes: [null, null, null, null, "6"] },
    ],
  },
];

export const DEFAULT_PARAMS: GlobalParams = {
  fuelPriceUsdGal: 3.85,
  laborRateUsdHr: 21,
  overtimeRateUsdHr: 31.5,
  benefitRate: 0.35,
  serviceInterval: 500,
  hoursPerWeek: { low: 40, medium: 50, high: 60 },
  maintenanceEscalation: 1.15,
  interestRate: 0.08,
  insuranceRate: 0.02,
  useActualMaint: false,
  useActualAvailability: false,
  brandFactors: {
    Caterpillar: 1,
    Komatsu: 1,
    "John Deere": 1,
    Volvo: 1,
    Hitachi: 1,
    Terex: 1,
    Case: 1,
    Kawasaki: 1,
  },
};

// ---------------------------------------------------------------------------
// Ownership economics (ESTIMATES, editable). The 2022 O&O workbook covers fuel
// and maintenance per hour but not capital cost, so new-machine prices below
// are rough current USD list prices (some informed by the CEMEX Tepeaca quote)
// and life/overhaul figures are category defaults. Treat as starting
// assumptions, not quotes.
// ---------------------------------------------------------------------------

const ACQUISITION_USD: Record<string, number> = {
  "wl-950": 350000, "wl-962": 420000, "wl-966": 480000, "wl-972": 560000, "wl-980": 720000,
  "pl-988": 1400000, "pl-990": 1750000, "pl-992": 2600000, "pl-993": 3600000,
  "ex-320": 260000, "ex-330": 400000, "ex-349": 750000, "ex-374": 1100000, "ex-390": 1400000,
  "ht-770": 900000, "ht-773": 1300000, "ht-775": 1600000, "ht-777": 2100000, "ht-785": 4000000,
  "at-740": 700000,
  "dz-d5": 400000, "dz-d6": 600000, "dz-d7": 750000, "dz-d8": 1100000, "dz-d9": 1600000,
  "dz-d10": 2600000, "dz-d11": 3800000,
  "mg-12": 380000, "mg-140": 450000, "mg-160": 520000, "mg-14": 620000, "mg-16": 780000,
  "ms-skid-s": 55000, "ms-skid-l": 75000, "ms-tele": 130000,
};

const LIFE_HOURS: Record<Category, number> = {
  "wheel-loader": 25000,
  "pit-loader": 50000,
  excavator: 25000,
  "rigid-truck": 60000,
  "articulated-truck": 20000,
  dozer: 30000,
  "motor-grader": 25000,
  misc: 12000,
};

const OVERHAUL_HOURS: Record<Category, number> = {
  "wheel-loader": 12000,
  "pit-loader": 18000,
  excavator: 12000,
  "rigid-truck": 18000,
  "articulated-truck": 10000,
  dozer: 12000,
  "motor-grader": 12000,
  misc: 6000,
};

for (const cls of EQUIVALENCE_CLASSES) {
  cls.acquisitionUsd ??= ACQUISITION_USD[cls.id] ?? 500000;
  cls.lifeHours ??= LIFE_HOURS[cls.category];
  cls.overhaulHours ??= OVERHAUL_HOURS[cls.category];
  cls.salvagePct ??= 0.2;
  cls.overhaulCostPct ??= 0.18;
}
