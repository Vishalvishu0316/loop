"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNELS, type ChannelType } from "@/lib/types";
import { SingleFeedbackCreateSchema } from "@/lib/validation";
import { WarningCircle, SpinnerGap, CheckCircle } from "@phosphor-icons/react";

export function IngestionModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"single" | "csv" | "channel">("single");

  const [single, setSingle] = useState({ content: "", channel: CHANNELS[8], customerLabel: "", sourceRef: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<null | { imported: number; failed: number; failures: Array<{ row: number; error: string }> }>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [channelLoading, setChannelLoading] = useState<string | null>(null);
  const [channelResult, setChannelResult] = useState<string | null>(null);

  async function submitSingle(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSingleError(null);

    // Client-side Zod validation
    const validation = SingleFeedbackCreateSchema.safeParse(single);
    if (!validation.success) {
      const errs: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!errs[fieldName]) errs[fieldName] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setSingleLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save feedback");
      }
      setSingle({ content: "", channel: CHANNELS[8], customerLabel: "", sourceRef: "" });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setSingleError(e instanceof Error ? e.message : "Failed to save feedback");
    } finally {
      setSingleLoading(false);
    }
  }

  async function submitCsv(file: File) {
    setCsvLoading(true);
    setCsvError(null);
    setCsvResult(null);

    if (file.size > 10 * 1024 * 1024) {
      setCsvError("File size exceeds 10MB limit. Please upload a smaller CSV file.");
      setCsvLoading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/ingest/csv", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "CSV processing failed");
      setCsvResult({ imported: d.imported, failed: d.failed, failures: d.failures ?? [] });
      router.refresh();
    } catch (e) {
      setCsvError(e instanceof Error ? e.message : "CSV processing failed");
    } finally {
      setCsvLoading(false);
    }
  }

  async function submitChannel(channel: string, label: string) {
    setChannelLoading(channel);
    setChannelResult(null);
    try {
      const res = await fetch(`/api/ingest/channel?channel=${encodeURIComponent(channel)}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setChannelResult(`Pulled ${d.count} items from ${label}.`);
      router.refresh();
    } catch (e) {
      setChannelResult(e instanceof Error ? e.message : "Failed");
    } finally {
      setChannelLoading(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl btn-primary px-4 py-2 text-sm font-semibold text-[var(--on-background)] cursor-pointer"
      >
        + Add feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--background)]/70 p-4 backdrop-blur sm:items-center">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--outline)] bg-[var(--surface)] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[var(--outline)] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--on-background)]">Ingest feedback</h2>
                <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                  All new items are auto-classified with sentiment, themes, and a feature-area tag.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[var(--outline)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-background)]"
              >
                Close
              </button>
            </header>

            <div className="flex gap-1 border-b border-[var(--outline)] px-3 pt-3">
              {([
                ["single", "Single entry"],
                ["csv", "CSV bulk import"],
                ["channel", "Simulated channels"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-t-lg px-4 py-2 text-sm transition ${
                    tab === key
                      ? "bg-[var(--surface-high)] text-[var(--on-background)] ring-1 ring-[var(--primary)]/30 font-semibold"
                      : "text-[var(--on-surface-variant)] hover:text-[var(--on-background)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 max-h-[65vh] overflow-y-auto">
              {tab === "single" && (
                <form onSubmit={submitSingle} className="space-y-4" noValidate>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Channel *</label>
                    <select
                      required
                      value={single.channel}
                      onChange={(e) => {
                        setSingle((s) => ({ ...s, channel: e.target.value as ChannelType }));
                        if (fieldErrors.channel) setFieldErrors((prev) => ({ ...prev, channel: undefined }));
                      }}
                      className="w-full rounded-xl border border-[var(--outline)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    >
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {fieldErrors.channel && (
                      <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                        <WarningCircle size={13} weight="fill" /> {fieldErrors.channel}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Feedback content *</label>
                      <span className="text-[11px] font-mono text-[var(--on-surface-variant)]">{single.content.length}/10,000</span>
                    </div>
                    <textarea
                      required
                      rows={5}
                      value={single.content}
                      onChange={(e) => {
                        setSingle((s) => ({ ...s, content: e.target.value }));
                        if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: undefined }));
                      }}
                      placeholder="Paste verbatim customer feedback here (min. 3 characters)…"
                      className={`w-full rounded-xl border bg-[var(--background)] px-4 py-3 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:outline-none ${
                        fieldErrors.content
                          ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                          : "border-[var(--outline)] focus:ring-2 focus:ring-[var(--primary)]/30"
                      }`}
                    />
                    {fieldErrors.content && (
                      <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                        <WarningCircle size={13} weight="fill" /> {fieldErrors.content}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Customer (label / email)</label>
                      <input
                        value={single.customerLabel}
                        onChange={(e) => {
                          setSingle((s) => ({ ...s, customerLabel: e.target.value }));
                          if (fieldErrors.customerLabel) setFieldErrors((prev) => ({ ...prev, customerLabel: undefined }));
                        }}
                        placeholder="cs@customer.com"
                        className={`w-full rounded-xl border bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:outline-none ${
                          fieldErrors.customerLabel
                            ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                            : "border-[var(--outline)] focus:ring-2 focus:ring-[var(--primary)]/30"
                        }`}
                      />
                      {fieldErrors.customerLabel && (
                        <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                          <WarningCircle size={13} weight="fill" /> {fieldErrors.customerLabel}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Source ref (Ticket / URL)</label>
                      <input
                        value={single.sourceRef}
                        onChange={(e) => {
                          setSingle((s) => ({ ...s, sourceRef: e.target.value }));
                          if (fieldErrors.sourceRef) setFieldErrors((prev) => ({ ...prev, sourceRef: undefined }));
                        }}
                        placeholder="TKT-1234"
                        className={`w-full rounded-xl border bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:outline-none ${
                          fieldErrors.sourceRef
                            ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                            : "border-[var(--outline)] focus:ring-2 focus:ring-[var(--primary)]/30"
                        }`}
                      />
                      {fieldErrors.sourceRef && (
                        <p className="mt-1 text-xs text-[var(--error)] flex items-center gap-1">
                          <WarningCircle size={13} weight="fill" /> {fieldErrors.sourceRef}
                        </p>
                      )}
                    </div>
                  </div>

                  {singleError && (
                    <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)] flex items-center gap-2">
                      <WarningCircle size={16} weight="fill" className="shrink-0" />
                      <span>{singleError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={singleLoading}
                    className="w-full rounded-xl btn-primary px-4 py-3 text-sm font-semibold text-[var(--on-background)] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {singleLoading ? (
                      <>
                        <SpinnerGap size={18} className="animate-spin" />
                        <span>Classifying & saving…</span>
                      </>
                    ) : (
                      "Save & auto-classify"
                    )}
                  </button>
                </form>
              )}

              {tab === "csv" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">CSV file</label>
                    <div className="rounded-xl border border-dashed border-[var(--outline)] bg-[var(--surface-low)] p-6 text-center">
                      <input
                        ref={fileInput}
                        type="file"
                        accept=".csv,text/csv"
                        className="mx-auto block text-sm text-[var(--on-surface-variant)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary)]/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--primary)] hover:file:bg-[var(--primary)]/30"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) submitCsv(f);
                        }}
                      />
                      <p className="mt-3 text-xs text-[var(--on-surface-variant)]">
                        Required column: <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">content</code>.
                        Optional: <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">channel</code>,
                        <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">customer</code>,
                        <code className="rounded bg-[var(--surface-high)] px-1.5 py-0.5 text-[var(--on-background)]">ref</code>. Max file size: 10MB.
                      </p>
                    </div>
                  </div>
                  {csvLoading && (
                    <div className="rounded-xl bg-[var(--surface-high)] px-4 py-3 text-sm text-[var(--on-background)] flex items-center gap-2">
                      <SpinnerGap size={16} className="animate-spin text-[var(--primary)]" />
                      <span>Parsing & classifying CSV feedback…</span>
                    </div>
                  )}
                  {csvError && (
                    <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)] flex items-center gap-2">
                      <WarningCircle size={16} weight="fill" className="shrink-0" />
                      <span>{csvError}</span>
                    </div>
                  )}
                  {csvResult && (
                    <div className="rounded-xl border border-[var(--secondary)]/20 bg-[var(--secondary)]/10 p-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-3xl font-bold text-[var(--secondary)]">{csvResult.imported}</div>
                        <div className="text-[var(--on-background)]">
                          <div className="font-semibold">Rows imported successfully</div>
                          {csvResult.failed > 0 && (
                            <div className="mt-1 text-[var(--error)]">{csvResult.failed} failed.</div>
                          )}
                        </div>
                      </div>
                      {csvResult.failures.length > 0 && (
                        <details className="mt-3 text-xs text-[var(--on-surface-variant)]">
                          <summary className="cursor-pointer font-medium">Show {csvResult.failures.length} row errors</summary>
                          <ul className="mt-2 space-y-1 font-mono">
                            {csvResult.failures.slice(0, 10).map((f, i) => (
                              <li key={i}>Row {f.row}: {f.error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === "channel" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {([
                    ["support", "Pull recent support tickets", "🎫", "5 realistic tickets"],
                    ["reviews", "Pull App Store reviews", "⭐", "5 fresh reviews"],
                    ["nps", "Pull NPS survey responses", "📊", "5 survey responses"],
                    ["sales", "Pull sales call notes", "📞", "5 opportunity notes"],
                  ] as const).map(([key, label, icon, sub]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => submitChannel(key, label.split(" ", 3).slice(1).join(" "))}
                      disabled={channelLoading !== null}
                      className="flex items-start gap-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] p-4 text-left transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface-high)] disabled:opacity-60 cursor-pointer"
                    >
                      <div className="text-2xl">{icon}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--on-background)] flex items-center justify-between">
                          <span>{label}</span>
                          {channelLoading === key && <SpinnerGap size={14} className="animate-spin text-[var(--primary)]" />}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--on-surface-variant)]">{sub}</div>
                      </div>
                    </button>
                  ))}
                  {channelResult && (
                    <div className="sm:col-span-2 rounded-xl border border-[var(--secondary)]/20 bg-[var(--secondary)]/10 px-4 py-3 text-sm text-[var(--on-background)] flex items-center gap-2">
                      <CheckCircle size={16} weight="fill" className="text-[var(--secondary)] shrink-0" />
                      <span>{channelResult}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
