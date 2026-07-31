import type { Taxonomy } from "@/lib/types";

/** Default confidence threshold: rows scoring below this are candidates for the
 *  AI fallback. Editable at runtime. */
export const DEFAULT_THRESHOLD = 0.55;

/**
 * A curated, practical procurement taxonomy — Direct vs Indirect spend, each with
 * categories and subcategories, plus seed keywords the local rules engine matches
 * on. Fully editable at runtime on the Taxonomy page; this is only the starting
 * point.
 */
export const DEFAULT_TAXONOMY: Taxonomy = [
  // ---------------------------------------------------------------- INDIRECT
  {
    id: "it",
    name: "IT & Software",
    type: "indirect",
    subcategories: [
      { id: "it-saas", name: "SaaS & Subscriptions", keywords: ["saas", "subscription", "license", "seat", "slack", "zoom", "atlassian", "salesforce", "hubspot", "notion", "figma", "github", "gitlab"] },
      { id: "it-cloud", name: "Cloud & Hosting", keywords: ["aws", "amazon web services", "azure", "google cloud", "gcp", "cloud", "hosting", "server", "datacenter", "cloudflare", "digitalocean"] },
      { id: "it-hardware", name: "Hardware & Devices", keywords: ["laptop", "desktop", "monitor", "dell", "lenovo", "apple", "macbook", "keyboard", "hardware", "device", "printer"] },
      { id: "it-telecom", name: "Telecom & Connectivity", keywords: ["telecom", "internet", "broadband", "mobile", "cellular", "at&t", "verizon", "vodafone", "phone plan", "data plan"] },
    ],
  },
  {
    id: "prof-services",
    name: "Professional Services",
    type: "indirect",
    subcategories: [
      { id: "ps-consulting", name: "Consulting", keywords: ["consulting", "consultant", "advisory", "mckinsey", "deloitte", "accenture", "strategy"] },
      { id: "ps-legal", name: "Legal", keywords: ["legal", "law firm", "attorney", "litigation", "counsel", "notary"] },
      { id: "ps-audit", name: "Audit & Accounting", keywords: ["audit", "accounting", "bookkeeping", "tax prep", "kpmg", "ey", "pwc", "cpa"] },
      { id: "ps-staffing", name: "Contingent & Staffing", keywords: ["staffing", "recruiter", "recruiting", "temp agency", "contractor", "freelance", "upwork"] },
    ],
  },
  {
    id: "marketing",
    name: "Marketing & Advertising",
    type: "indirect",
    subcategories: [
      { id: "mkt-digital", name: "Digital Advertising", keywords: ["google ads", "adwords", "facebook ads", "meta ads", "linkedin ads", "ppc", "sem", "ad spend", "campaign"] },
      { id: "mkt-agency", name: "Creative & Agency", keywords: ["agency", "creative", "branding", "design studio", "copywriting", "content agency"] },
      { id: "mkt-events", name: "Events & Sponsorship", keywords: ["event", "conference", "sponsorship", "booth", "trade show", "expo", "webinar"] },
      { id: "mkt-print", name: "Print & Promo", keywords: ["print", "brochure", "flyer", "promotional", "swag", "merch", "signage"] },
    ],
  },
  {
    id: "facilities",
    name: "Facilities & MRO",
    type: "indirect",
    subcategories: [
      { id: "fac-rent", name: "Rent & Lease", keywords: ["rent", "lease", "office space", "coworking", "wework", "property"] },
      { id: "fac-utilities", name: "Utilities", keywords: ["electricity", "power", "gas", "water", "utility", "sewage", "energy bill"] },
      { id: "fac-maintenance", name: "Maintenance & Repairs", keywords: ["maintenance", "repair", "hvac", "plumbing", "electrician", "janitorial", "cleaning", "mro", "spare parts"] },
      { id: "fac-supplies", name: "Office Supplies", keywords: ["office supplies", "stationery", "staples", "paper", "toner", "pens", "amazon business"] },
    ],
  },
  {
    id: "travel",
    name: "Travel & Expense",
    type: "indirect",
    subcategories: [
      { id: "tr-air", name: "Airfare", keywords: ["airline", "airfare", "flight", "delta", "united", "lufthansa", "aeromexico", "boarding"] },
      { id: "tr-lodging", name: "Lodging", keywords: ["hotel", "lodging", "marriott", "hilton", "airbnb", "motel", "accommodation"] },
      { id: "tr-ground", name: "Ground Transport", keywords: ["uber", "lyft", "taxi", "car rental", "hertz", "avis", "rental car", "train", "rail"] },
      { id: "tr-meals", name: "Meals & Entertainment", keywords: ["restaurant", "meal", "catering", "dining", "coffee", "lunch", "dinner"] },
    ],
  },
  {
    id: "hr",
    name: "HR & Benefits",
    type: "indirect",
    subcategories: [
      { id: "hr-payroll", name: "Payroll Services", keywords: ["payroll", "adp", "gusto", "paychex", "workday"] },
      { id: "hr-benefits", name: "Benefits & Insurance", keywords: ["insurance", "health plan", "benefits", "401k", "pension", "dental", "vision plan"] },
      { id: "hr-training", name: "Training & Development", keywords: ["training", "course", "certification", "udemy", "coursera", "workshop", "learning"] },
    ],
  },
  {
    id: "logistics",
    name: "Logistics & Freight",
    type: "indirect",
    subcategories: [
      { id: "log-freight", name: "Freight & Shipping", keywords: ["freight", "shipping", "fedex", "ups", "dhl", "courier", "logistics", "cargo", "parcel"] },
      { id: "log-warehouse", name: "Warehousing", keywords: ["warehouse", "storage", "fulfillment", "3pl", "distribution center", "pallet"] },
      { id: "log-customs", name: "Customs & Duties", keywords: ["customs", "duty", "tariff", "import fee", "broker", "clearance"] },
    ],
  },
  {
    id: "finance",
    name: "Finance & Banking",
    type: "indirect",
    subcategories: [
      { id: "fin-bank", name: "Bank & Card Fees", keywords: ["bank fee", "wire fee", "transaction fee", "merchant fee", "stripe fee", "interest", "overdraft"] },
      { id: "fin-tax", name: "Taxes & Duties", keywords: ["tax", "vat", "sales tax", "withholding", "levy"] },
    ],
  },
  // ------------------------------------------------------------------ DIRECT
  {
    id: "raw-materials",
    name: "Raw Materials",
    type: "direct",
    subcategories: [
      { id: "rm-metals", name: "Metals", keywords: ["steel", "aluminum", "copper", "metal", "alloy", "iron", "sheet metal"] },
      { id: "rm-plastics", name: "Plastics & Polymers", keywords: ["plastic", "polymer", "resin", "pvc", "polyethylene", "injection"] },
      { id: "rm-chemicals", name: "Chemicals", keywords: ["chemical", "solvent", "adhesive", "coating", "reagent", "acid", "lubricant"] },
      { id: "rm-packaging", name: "Packaging", keywords: ["packaging", "carton", "corrugated", "box", "shrink wrap", "label stock", "bottle"] },
    ],
  },
  {
    id: "components",
    name: "Components & Parts",
    type: "direct",
    subcategories: [
      { id: "cp-electronic", name: "Electronic Components", keywords: ["semiconductor", "chip", "pcb", "capacitor", "resistor", "connector", "electronic component"] },
      { id: "cp-mechanical", name: "Mechanical Parts", keywords: ["bearing", "fastener", "gear", "valve", "casting", "machined part", "bolt", "screw"] },
    ],
  },
  {
    id: "contract-mfg",
    name: "Contract Manufacturing",
    type: "direct",
    subcategories: [
      { id: "cm-oem", name: "OEM / Subassembly", keywords: ["oem", "subassembly", "contract manufacturing", "toll processing", "outsourced production"] },
      { id: "cm-labor", name: "Direct Labor", keywords: ["assembly labor", "production labor", "line worker", "direct labor"] },
    ],
  },
];
