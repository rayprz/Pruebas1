import type {
  Classification,
  LearnedMap,
  Taxonomy,
  Transaction,
} from "./types";

/** Lowercase, strip punctuation, collapse whitespace — for keyword matching. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse a vendor name to a stable key for the learned-corrections map. */
export function vendorKey(vendor: string): string {
  return normalize(vendor);
}

interface ScoredCandidate {
  categoryId: string;
  subcategoryId: string;
  score: number;
}

/**
 * Score a transaction against every subcategory in the taxonomy and return the
 * best match with a 0..1 confidence.
 *
 * Priority:
 *   1. Learned vendor→category correction (exact vendor key) → confidence 0.98.
 *   2. Keyword hits across vendor + description. Confidence grows with the number
 *      and specificity of matched keywords, capped at 0.95.
 *   3. No hit → unclassified (confidence 0).
 */
export function classify(
  tx: Pick<Transaction, "vendor" | "description">,
  taxonomy: Taxonomy,
  learned: LearnedMap
): Classification {
  const key = vendorKey(tx.vendor);
  const learnedHit = learned[key];
  if (learnedHit && learnedHit.categoryId) {
    return {
      categoryId: learnedHit.categoryId,
      subcategoryId: learnedHit.subcategoryId,
      confidence: 0.98,
      source: "rule",
      rationale: "Learned from a previous manual correction for this vendor.",
    };
  }

  const haystack = `${normalize(tx.vendor)} ${normalize(tx.description)}`;
  let best: ScoredCandidate | null = null;

  for (const category of taxonomy) {
    for (const sub of category.subcategories) {
      let hits = 0;
      let specificity = 0;
      for (const kw of sub.keywords) {
        const nkw = normalize(kw);
        if (!nkw) continue;
        // Word-boundary-ish match so "gas" doesn't match "gasket".
        const re = new RegExp(`(?:^|\\s)${escapeRegExp(nkw)}(?:\\s|$)`);
        if (re.test(haystack)) {
          hits += 1;
          // Multi-word / longer keywords are more discriminating.
          specificity += Math.min(3, nkw.split(" ").length + Math.floor(nkw.length / 8));
        }
      }
      if (hits === 0) continue;
      const score = hits + specificity * 0.5;
      if (!best || score > best.score) {
        best = { categoryId: category.id, subcategoryId: sub.id, score };
      }
    }
  }

  if (!best) {
    return {
      categoryId: null,
      subcategoryId: null,
      confidence: 0,
      source: "unclassified",
    };
  }

  // Map raw score → confidence. A single generic keyword lands ~0.45; several
  // specific hits approach the 0.95 ceiling.
  const confidence = Math.min(0.95, 0.35 + best.score * 0.12);
  return {
    categoryId: best.categoryId,
    subcategoryId: best.subcategoryId,
    confidence: Number(confidence.toFixed(2)),
    source: "rule",
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convenience labels for lookups in the UI. */
export function categoryName(taxonomy: Taxonomy, categoryId: string | null): string {
  if (!categoryId) return "—";
  return taxonomy.find((c) => c.id === categoryId)?.name ?? categoryId;
}

export function subcategoryName(
  taxonomy: Taxonomy,
  categoryId: string | null,
  subcategoryId: string | null
): string {
  if (!categoryId || !subcategoryId) return "—";
  const cat = taxonomy.find((c) => c.id === categoryId);
  return cat?.subcategories.find((s) => s.id === subcategoryId)?.name ?? subcategoryId;
}

export function spendTypeOf(taxonomy: Taxonomy, categoryId: string | null): "direct" | "indirect" | null {
  if (!categoryId) return null;
  return taxonomy.find((c) => c.id === categoryId)?.type ?? null;
}
