"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { useTaxonomy } from "@/lib/taxonomyStore";
import { useSpend } from "@/lib/spendStore";
import { csvToTransactions } from "@/lib/csv";
import { fileToCsv } from "@/lib/xlsx";
import { aiClassify } from "@/lib/aiClassify";
import { classify } from "@/lib/classifier";
import type { Transaction } from "@/lib/types";
import { ReviewTable } from "./ReviewTable";

const SAMPLE_CSV = `date,vendor,description,amount,costCenter
2026-01-04,Amazon Web Services,Monthly cloud hosting invoice,4210.55,Engineering
2026-01-06,Delta Air Lines,Flight NYC-SFO sales trip,612.30,Sales
2026-01-08,Acme Steel Co,Cold rolled steel coils PO-8841,18450.00,Production
2026-01-09,Staples,Office paper and toner cartridges,142.19,Admin
2026-01-11,McKinsey & Company,Strategy consulting retainer,25000.00,Executive
2026-01-12,FedEx,Freight shipment to distributor,988.40,Logistics
2026-01-14,Globex Holdings,Q1 services engagement,7300.00,Operations
2026-01-15,Marriott,Hotel stay client visit,431.80,Sales
2026-01-17,Google Ads,Search campaign January,3120.00,Marketing
2026-01-18,PolyResin Ltd,Injection molding resin pellets,9640.00,Production`;

export default function ImportPage() {
  const { taxonomy, threshold, autoAi, setAutoAi } = useTaxonomy();
  const { transactions, learned, setTransactions } = useSpend();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const stats = useMemo(() => {
    const total = transactions.length;
    const classified = transactions.filter((t) => t.classification.source !== "unclassified").length;
    const lowConf = transactions.filter((t) => isLowConfidence(t, threshold)).length;
    const spend = transactions.reduce((s, t) => s + t.amount, 0);
    return { total, classified, lowConf, spend };
  }, [transactions, threshold]);

  function runRules(txs: Transaction[]): Transaction[] {
    return txs.map((t) => ({ ...t, classification: classify(t, taxonomy, learned) }));
  }

  /** Escalate the low-confidence rows of `base` to the external AI and return the
   *  merged list. This is the hybrid fallback: rules first, AI only where the rule
   *  match wasn't accepted. */
  async function escalateToAi(base: Transaction[]): Promise<Transaction[]> {
    const lowConf = base.filter((t) => isLowConfidence(t, threshold));
    if (lowConf.length === 0) {
      setNotice("Every row met the confidence threshold from the rules engine — no AI needed.");
      return base;
    }
    setAiBusy(true);
    setNotice(`No confident rule match for ${lowConf.length} rows — sending them to the external AI…`);
    const { results, message } = await aiClassify(lowConf, taxonomy);
    if (message) setNotice(message);

    const byId = new Map(results.filter((r) => r.categoryId).map((r) => [r.id, r]));
    let applied = 0;
    const merged = base.map((t) => {
      const r = byId.get(t.id);
      if (!r || !r.categoryId) return t;
      applied += 1;
      return {
        ...t,
        classification: {
          categoryId: r.categoryId,
          subcategoryId: r.subcategoryId,
          confidence: r.confidence || 0.8,
          source: "ai" as const,
          rationale: r.rationale,
        },
      };
    });
    if (applied > 0) {
      setNotice(`External AI classified ${applied} of ${lowConf.length} low-confidence rows.`);
    }
    setAiBusy(false);
    return merged;
  }

  async function ingest(parsed: Transaction[], label: string) {
    const ruled = runRules(parsed);
    setTransactions(ruled);
    const lowConf = ruled.filter((t) => isLowConfidence(t, threshold)).length;
    setNotice(`${label}: ${ruled.length} rows classified by rules; ${lowConf} below the threshold.`);
    if (autoAi && lowConf > 0) {
      const merged = await escalateToAi(ruled);
      setTransactions(merged);
    }
  }

  async function handleFile(file: File) {
    setErrors([]);
    setNotice(null);
    try {
      const csv = await fileToCsv(file);
      const { transactions: parsed, errors: parseErrors } = csvToTransactions(csv);
      setErrors(parseErrors);
      if (parsed.length) await ingest(parsed, "Imported");
    } catch {
      setErrors(["Could not read the file. Use a .csv, .xlsx, or .xls export."]);
    }
  }

  async function loadSample() {
    setErrors([]);
    const { transactions: parsed } = csvToTransactions(SAMPLE_CSV);
    await ingest(parsed, "Loaded sample");
  }

  async function classifyWithAI() {
    const merged = await escalateToAi(transactions);
    setTransactions(merged);
  }

  return (
    <div>
      <PageHeader
        title="Import & Classify"
        subtitle="Rules classify first; rows without a confident match fall back to the external AI."
        actions={
          <>
            <Button variant="ghost" onClick={loadSample}>
              Load sample
            </Button>
            <Button onClick={() => fileRef.current?.click()}>Upload CSV / XLSX</Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Transactions" value={stats.total} />
        <StatCard label="Classified" value={stats.classified} tone="olive" />
        <StatCard label="Low confidence" value={stats.lowConf} tone="gold" sub={`< ${Math.round(threshold * 100)}% → AI`} />
        <StatCard label="Total spend" value={formatMoney(stats.spend)} tone="accent" />
      </div>

      {(errors.length > 0 || notice) && (
        <Card className="mb-5 p-4">
          {notice && <p className="text-sm text-inksoft">{notice}</p>}
          {errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-danger">
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {errors.length > 8 && <li>…and {errors.length - 8} more</li>}
            </ul>
          )}
        </Card>
      )}

      {transactions.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-2xl text-ink">No spend loaded yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-inksoft">
            Upload a CSV or Excel export of company expenses (columns:{" "}
            <span className="font-mono text-xs">vendor, amount</span> required;{" "}
            <span className="font-mono text-xs">date, description, glAccount, costCenter</span>{" "}
            optional), or load the sample to see it work.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="ghost" onClick={loadSample}>
              Load sample
            </Button>
            <Button onClick={() => fileRef.current?.click()}>Upload file</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-inksoft">
              Review predictions. Change any category to correct it — corrections are
              remembered per vendor for next time.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-inksoft">
                <input
                  type="checkbox"
                  checked={autoAi}
                  onChange={(e) => setAutoAi(e.target.checked)}
                  className="accent-[#b06a3c]"
                />
                Auto-escalate low confidence to AI
              </label>
              <Button onClick={classifyWithAI} className={aiBusy ? "opacity-60" : ""}>
                {aiBusy ? "Classifying…" : `Send ${stats.lowConf} to AI now`}
              </Button>
            </div>
          </div>
          <ReviewTable />
        </>
      )}
    </div>
  );
}

function isLowConfidence(t: Transaction, threshold: number): boolean {
  return t.classification.source === "unclassified" || t.classification.confidence < threshold;
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
