"use client";

import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

/* ── Types ── */

interface ParsedRow {
  content: string;
  channel: string;
  customerLabel: string;
  sourceRef: string;
}

interface ColumnMapping {
  content: string;
  channel: string;
  customerLabel: string;
  sourceRef: string;
}

type Step = "upload" | "map" | "preview" | "importing" | "done";

interface ImportResult {
  imported: number;
  failed: number;
  failures: Array<{ row: number; error: string }>;
}

/* ── Constants ── */

const TEMPLATE_CSV = `content,channel,customer,ref
"The checkout flow is confusing on mobile",App Store Review,sarah@example.com,TKT-1001
"Love the new dashboard – much cleaner!",NPS Survey,mike.j@corp.com,NPS-4821
"Support took 3 days to respond",Support Ticket,alex@startup.io,TKT-1002
"Pricing page doesn't show annual discounts",Manual Entry,lisa@enterprise.co,
"Integration with Slack would be amazing",Feature Request,dev@techco.com,FR-303`;

const CONTENT_ALIASES = ["content", "body", "feedback", "text", "comment", "message", "review"];
const CHANNEL_ALIASES = ["channel", "source", "platform", "origin", "type"];
const CUSTOMER_ALIASES = ["customer", "customerlabel", "customer_label", "email", "author", "user", "name"];
const REF_ALIASES = ["ref", "sourceref", "source_ref", "ticket", "id", "reference", "ticket_id"];

function autoMap(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""));
  const find = (aliases: string[]) => {
    const idx = lower.findIndex((h) => aliases.includes(h));
    return idx >= 0 ? headers[idx] : "";
  };
  return {
    content: find(CONTENT_ALIASES),
    channel: find(CHANNEL_ALIASES),
    customerLabel: find(CUSTOMER_ALIASES),
    sourceRef: find(REF_ALIASES),
  };
}

/* ── Component ── */

export function CsvBulkImporter() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ content: "", channel: "", customerLabel: "", sourceRef: "" });
  const [mappedRows, setMappedRows] = useState<ParsedRow[]>([]);

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Helpers ── */

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRawRows([]);
    setMapping({ content: "", channel: "", customerLabel: "", sourceRef: "" });
    setMappedRows([]);
    setProgress(0);
    setResult(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loop_feedback_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Parse ── */

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please select a valid .csv file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please choose a smaller CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as Record<string, string>[];
        if (data.length === 0) {
          setError("The selected CSV file is empty.");
          return;
        }

        if (data.length > 5000) {
          setError("CSV contains more than 5,000 rows. Please upload in batches of 5,000 or fewer.");
          return;
        }

        const hdrs = results.meta.fields ?? Object.keys(data[0]);
        if (hdrs.length === 0) {
          setError("No columns found in CSV file header.");
          return;
        }

        setHeaders(hdrs);
        setRawRows(data);

        const auto = autoMap(hdrs);
        setMapping(auto);

        if (auto.content) {
          // Auto-mapped, skip mapping step
          applyMapping(data, auto);
          setStep("preview");
        } else {
          setStep("map");
        }
      },
      error(err) {
        setError(`CSV Parse error: ${err.message}`);
      },
    });
  }, []);

  function applyMapping(data: Record<string, string>[], map: ColumnMapping) {
    const rows: ParsedRow[] = data.map((row) => ({
      content: (map.content ? row[map.content] : "")?.trim() ?? "",
      channel: (map.channel ? row[map.channel] : "")?.trim() ?? "",
      customerLabel: (map.customerLabel ? row[map.customerLabel] : "")?.trim() ?? "",
      sourceRef: (map.sourceRef ? row[map.sourceRef] : "")?.trim() ?? "",
    }));
    setMappedRows(rows);
  }

  function confirmMapping() {
    if (!mapping.content) {
      setError("You must map a column to 'content'");
      return;
    }
    applyMapping(rawRows, mapping);
    setStep("preview");
  }

  /* ── Import ── */

  async function runImport() {
    setStep("importing");
    setProgress(0);
    setError(null);

    const validRows = mappedRows.filter((r) => r.content.length > 0);
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      batches.push(validRows.slice(i, i + BATCH_SIZE));
    }

    let totalImported = 0;
    let totalFailed = 0;
    const allFailures: Array<{ row: number; error: string }> = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      // Build CSV text for the batch
      const csvHeader = "content,channel,customer,ref";
      const csvBody = batch
        .map(
          (r) =>
            `"${r.content.replace(/"/g, '""')}","${r.channel}","${r.customerLabel}","${r.sourceRef}"`
        )
        .join("\n");
      const csvText = `${csvHeader}\n${csvBody}`;

      try {
        const fd = new FormData();
        fd.set("file", new Blob([csvText], { type: "text/csv" }), "batch.csv");
        const res = await fetch("/api/ingest/csv", { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? "Batch failed");
        totalImported += d.imported ?? 0;
        totalFailed += d.failed ?? 0;
        if (d.failures) allFailures.push(...d.failures);
      } catch (e) {
        totalFailed += batch.length;
        allFailures.push({
          row: batchIdx * BATCH_SIZE + 1,
          error: e instanceof Error ? e.message : "Batch failed",
        });
      }
      setProgress(Math.round(((batchIdx + 1) / batches.length) * 100));
    }

    setResult({ imported: totalImported, failed: totalFailed, failures: allFailures });
    setStep("done");
    router.refresh();
  }

  /* ── Drop handlers ── */

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  /* ── Derived ── */

  const validCount = mappedRows.filter((r) => r.content.length > 0).length;
  const invalidCount = mappedRows.length - validCount;

  /* ── Render ── */

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--on-background)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
      >
        📄 Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--background)]/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--outline)] bg-[var(--surface)] shadow-2xl"
            style={{ animation: "fade-in-up 0.25s ease-out" }}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-[var(--outline)] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--on-background)]">
                  CSV Bulk Import
                </h2>
                <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                  {step === "upload" && "Upload a CSV file to import feedback in bulk."}
                  {step === "map" && "Map your CSV columns to LOOP's fields."}
                  {step === "preview" && `${validCount} valid rows ready to import.`}
                  {step === "importing" && `Importing… ${progress}%`}
                  {step === "done" && "Import complete."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {step === "upload" && (
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-lg border border-[var(--outline)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-background)] transition"
                  >
                    ⬇ Template
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-[var(--outline)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-background)] transition"
                >
                  Close
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="p-5 max-h-[65vh] overflow-y-auto">
              {/* Error banner */}
              {error && (
                <div className="mb-4 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
                  {error}
                </div>
              )}

              {/* ── STEP: Upload ── */}
              {step === "upload" && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    dragOver
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--outline)] bg-[var(--surface-low)]"
                  }`}
                >
                  <div className="text-4xl mb-3">📂</div>
                  <p className="text-sm text-[var(--on-background)] font-medium mb-2">
                    Drag & drop your CSV here
                  </p>
                  <p className="text-xs text-[var(--on-surface-variant)] mb-4">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary text-sm px-5 py-2 rounded-lg"
                  >
                    Choose file
                  </button>
                  <div className="mt-5 text-xs text-[var(--on-surface-variant)]">
                    Required column: <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">content</code>.
                    Optional: <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">channel</code>,{" "}
                    <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">customer</code>,{" "}
                    <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">ref</code>
                  </div>
                </div>
              )}

              {/* ── STEP: Map Columns ── */}
              {step === "map" && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--on-surface-variant)]">
                    We couldn&apos;t auto-detect the <strong>content</strong> column. Please map your columns below.
                  </p>
                  {(["content", "channel", "customerLabel", "sourceRef"] as const).map((field) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">
                        {field === "customerLabel" ? "Customer" : field === "sourceRef" ? "Reference" : field}
                        {field === "content" && " *"}
                      </label>
                      <select
                        value={mapping[field]}
                        onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--outline)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                      >
                        <option value="">— Skip —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={confirmMapping}
                    className="w-full rounded-xl btn-primary px-4 py-3 text-sm font-semibold"
                  >
                    Continue to preview
                  </button>
                </div>
              )}

              {/* ── STEP: Preview ── */}
              {step === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-[var(--secondary)]/15 text-[var(--secondary)] px-3 py-1 font-semibold text-xs">
                      {validCount} valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="rounded-full bg-[var(--error)]/15 text-[var(--error)] px-3 py-1 font-semibold text-xs">
                        {invalidCount} missing content
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[var(--outline)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--surface-high)] text-[var(--on-surface-variant)] text-xs uppercase tracking-wider">
                          <th className="px-3 py-2 text-left w-8">#</th>
                          <th className="px-3 py-2 text-left">Content</th>
                          <th className="px-3 py-2 text-left">Channel</th>
                          <th className="px-3 py-2 text-left">Customer</th>
                          <th className="px-3 py-2 text-left">Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappedRows.slice(0, 20).map((row, i) => (
                          <tr
                            key={i}
                            className={`border-t border-[var(--outline-variant)] ${
                              !row.content ? "bg-[var(--error)]/5" : ""
                            }`}
                          >
                            <td className="px-3 py-2 font-mono text-xs text-[var(--on-surface-variant)]">{i + 1}</td>
                            <td className="px-3 py-2 max-w-[300px] truncate">{row.content || "—"}</td>
                            <td className="px-3 py-2 text-[var(--on-surface-variant)]">{row.channel || "—"}</td>
                            <td className="px-3 py-2 text-[var(--on-surface-variant)]">{row.customerLabel || "—"}</td>
                            <td className="px-3 py-2 text-[var(--on-surface-variant)]">{row.sourceRef || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {mappedRows.length > 20 && (
                      <div className="px-3 py-2 text-xs text-[var(--on-surface-variant)] text-center bg-[var(--surface-low)]">
                        …and {mappedRows.length - 20} more rows
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("map")}
                      className="flex-1 rounded-xl border border-[var(--outline)] px-4 py-3 text-sm font-semibold text-[var(--on-surface-variant)] hover:text-[var(--on-background)] transition"
                    >
                      ← Re-map columns
                    </button>
                    <button
                      type="button"
                      onClick={runImport}
                      disabled={validCount === 0}
                      className="flex-1 rounded-xl btn-primary px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    >
                      Import {validCount} rows
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP: Importing ── */}
              {step === "importing" && (
                <div className="py-8 text-center space-y-5">
                  <div className="text-3xl" style={{ animation: "signal-pulse 1.2s ease-in-out infinite" }}>⚡</div>
                  <p className="text-sm text-[var(--on-background)] font-medium">
                    Classifying & importing feedback…
                  </p>
                  <div className="w-full h-2 rounded-full bg-[var(--surface-high)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--on-surface-variant)] font-mono">{progress}%</p>
                </div>
              )}

              {/* ── STEP: Done ── */}
              {step === "done" && result && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--secondary)]/20 bg-[var(--secondary)]/10 p-5">
                    <div className="flex items-center gap-5">
                      <div className="text-4xl font-bold text-[var(--secondary)]">{result.imported}</div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--on-background)]">
                          Rows imported & classified
                        </div>
                        <div className="text-xs text-[var(--on-surface-variant)] mt-0.5">
                          Sentiment, themes, and feature areas assigned automatically.
                        </div>
                      </div>
                    </div>
                    {result.failed > 0 && (
                      <div className="mt-3 text-sm text-[var(--error)]">
                        {result.failed} row{result.failed !== 1 ? "s" : ""} failed.
                      </div>
                    )}
                  </div>

                  {result.failures.length > 0 && (
                    <details className="text-xs text-[var(--on-surface-variant)]">
                      <summary className="cursor-pointer font-medium">
                        Show {result.failures.length} error{result.failures.length !== 1 ? "s" : ""}
                      </summary>
                      <ul className="mt-2 space-y-1 font-mono">
                        {result.failures.slice(0, 15).map((f, i) => (
                          <li key={i}>Row {f.row}: {f.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <button
                    type="button"
                    onClick={close}
                    className="w-full rounded-xl btn-primary px-4 py-3 text-sm font-semibold"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
