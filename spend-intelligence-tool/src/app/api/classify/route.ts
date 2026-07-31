import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AiClassifyRequestRow, AiClassifyResultRow } from "@/lib/types";

// The AI half of the hybrid classifier. Runs server-side so the API key never
// reaches the browser. Stateless — no expense data is persisted here.
export const runtime = "nodejs";

interface Body {
  rows: AiClassifyRequestRow[];
  // Compact taxonomy: only what the model needs to pick a valid label.
  taxonomy: {
    id: string;
    name: string;
    type: string;
    subcategories: { id: string; name: string }[];
  }[];
}

const MODEL = process.env.SPEND_CLASSIFIER_MODEL || "claude-opus-5";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful: the UI keeps rows as-is and shows a setup hint.
    return NextResponse.json(
      {
        results: [],
        error: "no_api_key",
        message:
          "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local to enable AI classification.",
      },
      { status: 200 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ results: [], error: "bad_request", message: "Invalid JSON body." }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
  const taxonomy = Array.isArray(body.taxonomy) ? body.taxonomy : [];
  if (rows.length === 0 || taxonomy.length === 0) {
    return NextResponse.json({ results: [], error: "empty", message: "No rows or taxonomy provided." }, { status: 200 });
  }

  const validPairs = buildValidPairs(taxonomy);
  const taxonomyText = taxonomy
    .map(
      (c) =>
        `- ${c.id} (${c.type}) "${c.name}"\n` +
        c.subcategories.map((s) => `    · ${s.id} "${s.name}"`).join("\n")
    )
    .join("\n");

  const rowsText = rows
    .map((r) => `${r.id} | vendor: ${r.vendor} | description: ${r.description} | amount: ${r.amount}`)
    .join("\n");

  const client = new Anthropic({ apiKey });

  const system =
    "You are a procurement spend classifier. Assign each expense line to exactly " +
    "one category and one of its subcategories from the provided taxonomy, using only " +
    "the exact ids given. If nothing fits, use null for categoryId and subcategoryId. " +
    "confidence is a number 0..1. Keep rationale to one short sentence.\n\n" +
    'Respond with ONLY a JSON object, no prose, no markdown fences, of the shape: ' +
    '{"results":[{"id":string,"categoryId":string|null,"subcategoryId":string|null,' +
    '"confidence":number,"rationale":string}]}. Return one entry per input id.';

  const userPrompt =
    `TAXONOMY (categoryId (type) "name" → subcategoryId "name"):\n${taxonomyText}\n\n` +
    `EXPENSE LINES (id | vendor | description | amount):\n${rowsText}\n\n` +
    `Return a result object for every id above.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { results: [], error: "refusal", message: "The model declined to classify this batch." },
        { status: 200 }
      );
    }

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const parsed = JSON.parse(extractJson(text)) as { results: AiClassifyResultRow[] };

    const results: AiClassifyResultRow[] = (parsed.results ?? []).map((r) => {
      const pairKey = `${r.categoryId}::${r.subcategoryId}`;
      const valid = r.categoryId && r.subcategoryId && validPairs.has(pairKey);
      return {
        id: r.id,
        categoryId: valid ? r.categoryId : null,
        subcategoryId: valid ? r.subcategoryId : null,
        confidence: valid ? clamp01(Number(r.confidence)) : 0,
        rationale: r.rationale,
      };
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ results: [], error: "rate_limit", message: "Rate limited — try again shortly." }, { status: 200 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ results: [], error: "auth", message: "Invalid ANTHROPIC_API_KEY." }, { status: 200 });
    }
    const message = err instanceof Anthropic.APIError ? `API error: ${err.message}` : "Unexpected error during AI classification.";
    return NextResponse.json({ results: [], error: "api_error", message }, { status: 200 });
  }
}

function buildValidPairs(taxonomy: Body["taxonomy"]): Set<string> {
  const set = new Set<string>();
  for (const c of taxonomy) {
    for (const s of c.subcategories) set.add(`${c.id}::${s.id}`);
  }
  return set;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Pull the JSON object out of the model's text, tolerating stray prose or fences. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}
