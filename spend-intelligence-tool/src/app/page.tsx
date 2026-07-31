"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { useTaxonomy } from "@/lib/taxonomyStore";
import { useSpend } from "@/lib/spendStore";
import { csvToTransactions } from "@/lib/csv";
import { fileToCsv } from "@/lib/xlsx";
import { aiClassify } from "@/lib/aiClassify";
import { classify } from "@/lib/classifier";
import type { Classification, Transaction } from "@/lib/types";
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
  const { taxonomy, threshold } = useTaxonomy();
  const { transactions, learned, setTransactions, applyClassifications } = useSpend();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const stats = useMemo(() => {
    const total = transactions.length;
    const classified = transactions.filter((t) => t.classification.source !== "unclassified").length;
    const lowConf = transactions.filter(
      (t) => t.classification.source === "unclassified" || t.classification.confidence < threshold
    ).length;
    const spend = transactions.reduce((s, t) => s + t.amount, 0);
    return { total, classified, lowConf, spend };
  }, [transactions, threshold]);

  function runRules(txs: Transaction[]): Transaction[] {
    return txs.map((t) => ({
      ...t,
      classification: classify(t, taxonomy, learned),
    }));
  }

  async function handleFile(file: File) {
    setErrors([]);
    setNotice(null);
    try {
      const csv = await fileToCsv(file);
      const { transactions: parsed, errors: parseErrors } = csvToTransactions(csv);
      setErrors(parseErrors);
      if (parsed.length) {
        setTransactions(runRules(parsed));
        setNotice(`Imported ${parsed.length} rows and ran the local rules engine.`);
      }
    } catch {
      setErrors(["Could not read the file. Use a .csv, .xlsx, or .xls export."]);
    }
  }

  function loadSample() {
    setErrors([]);
    const { transactions: parsed } = csvToTransactions(SAMPLE_CSV);
    setTransactions(runRules(parsed));
    setNotice("Loaded 10 sample expenses.");
  }

  async function classifyWithAI() {
    const lowConf = transactions.filter(
      (t) => t.classification.source === "unclassified" || t.classification.confidence < threshold
    );
    if (lowConf.length === 0) {
      setNotice("No low-confidence rows to send to the AI.");
      return;
    }
    setAiBusy(true);
    setNotice(`Sending ${lowConf.length} low-confidence rows to the AI…`);
    const { results, message } = await aiClassify(lowConf, taxonomy);
    if (message) setNotice(message);
    const updates: Record<string, Classification> = {};
    for (const r of results) {
      if (r.categoryId) {
        updates[r.id] = {
          categoryId: r.categoryId,
          subcategoryId: r.subcategoryId,
          confidence: r.confidence || 0.8,
          source: "ai",
          rationale: r.rationale,
        };
      }
    }
    if (Object.keys(updates).length) {
      applyClassifications(updates);
      setNotice(`AI classified ${Object.keys(updates).length} of ${lowConf.length} low-confidence rows.`);
    }
    setAiBusy(false);
  }

  return (
    <div>
      <PageHeader
        title="Import & Classify"
        subtitle="Upload expenses, let the local rules engine predict categories, then send low-confidence rows to the AI."
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
        <StatCard label="Low confidence" value={stats.lowConf} tone="gold" sub={`< ${Math.round(threshold * 100)}% confidence`} />
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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-inksoft">
              Review predictions. Change any category to correct it — corrections are
              remembered per vendor for next time.
            </p>
            <Button onClick={classifyWithAI} className={aiBusy ? "opacity-60" : ""}>
              {aiBusy ? "Classifying…" : `Classify ${stats.lowConf} low-confidence with AI`}
            </Button>
          </div>
          <ReviewTable />
        </>
      )}
    </div>
  );
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
