import type {
  AiClassifyResultRow,
  Taxonomy,
  Transaction,
} from "./types";

export interface AiClassifyResponse {
  results: AiClassifyResultRow[];
  error?: string;
  message?: string;
}

/**
 * Send low-confidence rows to the server route for AI classification.
 * Returns the raw results plus any server-side notice (missing key, rate limit,
 * etc.) so the UI can surface it without crashing.
 */
export async function aiClassify(
  rows: Transaction[],
  taxonomy: Taxonomy
): Promise<AiClassifyResponse> {
  const compactTaxonomy = taxonomy.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));

  const payloadRows = rows.map((t) => ({
    id: t.id,
    vendor: t.vendor,
    description: t.description,
    amount: t.amount,
  }));

  try {
    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: payloadRows, taxonomy: compactTaxonomy }),
    });
    const data = (await res.json()) as AiClassifyResponse;
    return data;
  } catch {
    return {
      results: [],
      error: "network",
      message: "Could not reach the classification service.",
    };
  }
}
