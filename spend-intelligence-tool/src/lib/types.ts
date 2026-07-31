// Domain model for the Spend Intelligence tool.

/** A curated procurement taxonomy: Direct vs Indirect → Category → Subcategory. */
export type SpendType = "direct" | "indirect";

export interface Subcategory {
  id: string;
  name: string;
  /** Keywords the local rules engine matches against vendor + description. */
  keywords: string[];
}

export interface Category {
  id: string;
  name: string;
  type: SpendType;
  subcategories: Subcategory[];
}

export type Taxonomy = Category[];

/** How a transaction ended up in its category. */
export type ClassificationSource = "rule" | "ai" | "manual" | "unclassified";

export interface Classification {
  categoryId: string | null;
  subcategoryId: string | null;
  /** 0..1 — engine confidence. Manual = 1. */
  confidence: number;
  source: ClassificationSource;
  /** Optional short rationale (mainly from the AI fallback). */
  rationale?: string;
}

export interface Transaction {
  id: string;
  date: string;
  vendor: string;
  description: string;
  amount: number;
  currency?: string;
  glAccount?: string;
  costCenter?: string;
  classification: Classification;
}

/** Learned vendor → category mapping, grown from the user's manual corrections. */
export type LearnedMap = Record<
  string,
  { categoryId: string; subcategoryId: string | null }
>;

/** One row the AI route is asked to classify. */
export interface AiClassifyRequestRow {
  id: string;
  vendor: string;
  description: string;
  amount: number;
}

/** One classified row returned by the AI route. */
export interface AiClassifyResultRow {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  confidence: number;
  rationale?: string;
}
