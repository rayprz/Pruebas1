# Spend Intelligence Tool

A procurement **spend intelligence** app: upload company expense data, predict the
**spend category / subcategory** for each line, and segment total spend to build a
procurement strategy (category management, sourcing waves, savings targets).

Sibling app to `fleet-decision-tool` — same Next.js / React / Tailwind / recharts
stack and design system — but adds a small server route for the AI classifier.

## Hybrid classifier

1. **Local rules engine** (`src/lib/classifier.ts`) scores each transaction against
   the taxonomy's keywords + learned vendor mappings → category/subcategory +
   confidence. Free and instant.
2. **High confidence** rows auto-classify.
3. **Low confidence** rows (below the editable threshold) are sent, batched, to the
   **`/api/classify`** server route, which asks Claude to pick from the *same*
   taxonomy and returns category/subcategory + confidence + rationale.
4. **Manual corrections** are remembered per vendor and improve future imports.

## Pages

- **Import & Classify** — upload CSV/XLSX, review predictions, correct inline, and
  run the AI on low-confidence rows.
- **Spend Dashboard** — spend segmented by category & subcategory, Direct vs
  Indirect split, % auto-classified, XLSX export.
- **Taxonomy & Rules** — edit categories, subcategories, keywords, and the
  confidence threshold; download an import template.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY for the AI step
npm run dev
```

The rules engine and dashboard work with **no** key. The "Classify with AI" button
needs `ANTHROPIC_API_KEY` set server-side; without it the app degrades gracefully
with a hint. Optionally set `SPEND_CLASSIFIER_MODEL` (defaults to `claude-opus-5`).

## Notes

- Client-first: expense data lives in `localStorage`; the only server surface is the
  stateless `/api/classify` route. The API key never reaches the browser.
- Unlike the static `fleet-decision-tool`, this app has a server route, so it is not
  a static export — run it on a Node host (`next start`) or a platform like Vercel.

## Expected import columns

`vendor` and `amount` are required; `date`, `description`, `currency`, `glAccount`,
and `costCenter` are optional (common header aliases like `supplier`, `memo`,
`total`, `department` are accepted). `description` most improves classification.
