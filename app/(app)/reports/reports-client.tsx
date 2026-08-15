"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import {
  FileText,
  FileCsv,
  FilePdf,
  DownloadSimple,
  ChartBar,
  TrendUp,
  Sparkle,
} from "@phosphor-icons/react";

type Report = {
  id: string;
  title: string;
  summary: string | null;
  markdown: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentJson: any;
  periodLabel: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  generatedBy: { name: string; email: string };
};

type ThemeLite = { id: string; name: string; color: string };

const PRESETS: Array<{ key: string; label: string; days: number; periodLabel: (d: Date) => string }> = [
  {
    key: "7d",
    label: "Last 7 days",
    days: 7,
    periodLabel: () => `Week of ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
  },
  {
    key: "14d",
    label: "Last 14 days",
    days: 14,
    periodLabel: () => `Fortnight ending ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
  },
  {
    key: "30d",
    label: "Last 30 days",
    days: 30,
    periodLabel: () => `30 days ending ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
  },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(md: string): string {
  // First escape raw HTML to prevent XSS injection
  let html = escapeHtml(md);

  // Table support
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split("|").filter((c) => c.trim().length > 0);
    if (cells.some((c) => c.includes("---"))) return ""; // separator
    return `<div class="grid grid-cols-${Math.min(cells.length, 4)} gap-2 py-2 border-b border-[var(--outline-variant)] text-xs">${cells.map((c) => `<span class="text-[var(--on-background)]">${c.trim()}</span>`).join("")}</div>`;
  });
  html = html.replace(/^### (.*$)/gim, '<h3 class="mt-6 mb-2.5 text-base font-semibold text-[var(--on-background)] flex items-center gap-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="mt-7 mb-3 text-lg font-bold text-[var(--on-background)] border-b border-[var(--outline-variant)] pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="mb-4 text-2xl font-bold text-[var(--on-background)] tracking-tight">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[var(--on-background)]">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-[var(--on-surface-variant)]">$1</em>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-sm text-[var(--on-surface-variant)] leading-relaxed">$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-sm text-[var(--on-surface-variant)] leading-relaxed">$1</li>');
  html = html.replace(/(<\/li>\s*<li)/g, "</li><li");
  html = html.replace(/(?:<li.*?<\/li>\s*)+/g, (match) => `<ul class="my-2 space-y-1.5">${match}</ul>`);
  html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="my-3 rounded-r-xl border-l-4 border-[var(--primary)] bg-[var(--primary-container)]/20 py-2.5 pl-4 pr-3 text-xs italic text-[var(--on-background)]">$1</blockquote>');
  html = html.replace(/\n\n/g, '</p><p class="my-3 text-sm text-[var(--on-surface-variant)] leading-relaxed">');
  html = html.replace(/\n/g, "<br/>");
  return `<div class="prose-report text-sm text-[var(--on-surface-variant)]">${html}</div>`;
}

/* ── Export Helpers ── */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMarkdown(report: Report) {
  const md = [
    `# ${report.title}`,
    `**Period**: ${report.periodLabel ?? new Date(report.periodStart).toLocaleDateString()} → ${new Date(report.periodEnd).toLocaleDateString()}`,
    `**Generated**: ${new Date(report.createdAt).toLocaleString()}`,
    "",
    report.markdown ?? "",
  ].join("\n");
  downloadBlob(new Blob([md], { type: "text/markdown" }), `loop-report-${report.id}.md`);
}

function exportCsv(report: Report) {
  const lines: string[] = ["REPORT OVERVIEW,"];
  lines.push(`Title,"${report.title.replace(/"/g, '""')}"`);
  lines.push(`Period,"${report.periodLabel ?? ""}"`);
  lines.push(`Generated,"${new Date(report.createdAt).toLocaleString()}"`);
  if (report.summary) {
    lines.push(`Executive Summary,"${report.summary.replace(/"/g, '""')}"`);
  }
  lines.push("");

  if (report.contentJson) {
    const cj = report.contentJson;
    if (cj.sentiment) {
      lines.push("SENTIMENT METRICS,COUNT,PERCENTAGE");
      lines.push(`Positive,${cj.sentiment.pos},${cj.sentiment.total > 0 ? Math.round((cj.sentiment.pos / cj.sentiment.total) * 100) : 0}%`);
      lines.push(`Neutral,${cj.sentiment.neu},${cj.sentiment.total > 0 ? Math.round((cj.sentiment.neu / cj.sentiment.total) * 100) : 0}%`);
      lines.push(`Negative,${cj.sentiment.neg},${cj.sentiment.total > 0 ? Math.round((cj.sentiment.neg / cj.sentiment.total) * 100) : 0}%`);
      lines.push(`Total Volume,${cj.sentiment.total},100%`);
      lines.push("");
    }
    if (cj.topThemes && Array.isArray(cj.topThemes)) {
      lines.push("TOP THEMES,VOLUME,TREND VELOCITY");
      for (const t of cj.topThemes) {
        const delta = Number(t.trendDelta ?? 0);
        const count = t.count ?? t.score ?? 0;
        lines.push(`"${(t.name ?? "").replace(/"/g, '""')}",${count},${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`);
      }
      lines.push("");
    }
  }

  if (report.markdown) {
    lines.push("FULL REPORT TEXT");
    lines.push(`"${report.markdown.replace(/"/g, '""')}"`);
  }

  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), `loop-report-${report.id}.csv`);
}

function exportPdf(report: Report) {
  const content = report.contentJson || {};
  const sentiment = content.sentiment || { total: 0, pos: 0, neu: 0, neg: 0 };
  const posPct = sentiment.total > 0 ? Math.round((sentiment.pos / sentiment.total) * 100) : 0;
  const negPct = sentiment.total > 0 ? Math.round((sentiment.neg / sentiment.total) * 100) : 0;
  const netScore = posPct - negPct;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${report.title} — Executive VOC Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'IBM Plex Sans', sans-serif; color: #14181F; padding: 40px; max-width: 860px; margin: 0 auto; line-height: 1.6; background: #FFFFFF; }
    .header { border-bottom: 2px solid #14181F; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #14181F; }
    .brand-sub { font-size: 11px; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; color: #B9740A; letter-spacing: 1px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .meta { font-size: 12px; color: #565F5C; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .kpi-card { border: 1px solid #D7DBD8; border-radius: 8px; padding: 12px 14px; background: #F7F8F7; }
    .kpi-label { font-size: 10.5px; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; color: #565F5C; letter-spacing: 0.5px; }
    .kpi-val { font-size: 20px; font-weight: 700; margin-top: 4px; font-family: 'IBM Plex Mono', monospace; }
    .summary-box { background: #FFF9F0; border-left: 4px solid #B9740A; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0; font-size: 14.5px; line-height: 1.65; }
    h2 { font-size: 16px; font-weight: 700; margin: 28px 0 10px; border-bottom: 1px solid #ECEEEC; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
    p { margin: 8px 0; font-size: 13.5px; color: #2A3038; }
    ul, ol { margin: 8px 0 16px 20px; font-size: 13.5px; color: #2A3038; }
    li { margin-bottom: 4px; }
    blockquote { border-left: 3px solid #B9740A; padding: 8px 12px; margin: 12px 0; font-style: italic; background: #F7F8F7; border-radius: 0 6px 6px 0; font-size: 12.5px; }
    .footer { margin-top: 40px; pt: 16px; border-top: 1px solid #D7DBD8; font-size: 11px; color: #565F5C; display: flex; justify-content: space-between; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">LOOP</div>
      <div class="brand-sub">Feedback Intelligence Platform</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; font-weight: 600;">Executive VOC Digest</div>
      <div class="meta">${report.periodLabel ?? ""}</div>
    </div>
  </div>

  <h1>${report.title}</h1>
  <div class="meta">Generated ${new Date(report.createdAt).toLocaleString()} · Author: ${report.generatedBy?.name || "LOOP AI"}</div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Volume</div>
      <div class="kpi-val">${sentiment.total.toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Sentiment</div>
      <div class="kpi-val" style="color: ${netScore >= 0 ? '#0F6B5C' : '#A63F30'}">${netScore >= 0 ? '+' : ''}${netScore}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Positive Share</div>
      <div class="kpi-val" style="color: #0F6B5C">${posPct}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Negative Share</div>
      <div class="kpi-val" style="color: #A63F30">${negPct}%</div>
    </div>
  </div>

  ${report.summary ? `<div class="summary-box"><strong>Executive Summary:</strong> ${report.summary}</div>` : ""}

  <div>
    ${renderMarkdown(report.markdown || report.summary || "")}
  </div>

  <div class="footer">
    <span>LOOP Voice-of-Customer Confidential Report</span>
    <span>Generated with Grounded AI Synthesis</span>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

export function ReportsClient({
  canGenerate,
  initialReports,
  themes,
}: {
  canGenerate: boolean;
  initialReports: Report[];
  themes: ThemeLite[];
}) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [activeId, setActiveId] = useState<string | null>(reports[0]?.id ?? null);
  const [preset, setPreset] = useState<string>("7d");
  const [themeId, setThemeId] = useState<string>("ALL");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const active = useMemo(
    () => reports.find((r) => r.id === activeId) ?? null,
    [reports, activeId],
  );

  // Derive structured data if contentJson is present
  const content = active?.contentJson || {};
  const sentiment = content.sentiment || { total: 0, pos: 0, neu: 0, neg: 0 };
  const posPct = sentiment.total > 0 ? Math.round((sentiment.pos / sentiment.total) * 100) : 0;
  const neuPct = sentiment.total > 0 ? Math.round((sentiment.neu / sentiment.total) * 100) : 0;
  const negPct = sentiment.total > 0 ? Math.round((sentiment.neg / sentiment.total) * 100) : 0;
  const netScore = posPct - negPct;
  const topThemes: Array<{ name: string; count?: number; score?: number; trendDelta?: number; color?: string }> = content.topThemes || [];

  async function onGenerate() {
    const cfg = PRESETS.find((p) => p.key === preset) ?? PRESETS[0];
    const now = new Date();
    const start = new Date(now.getTime() - cfg.days * 24 * 60 * 60 * 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      periodLabel: cfg.periodLabel(now),
      periodStart: start.toISOString(),
      periodEnd: now.toISOString(),
    };
    if (themeId !== "ALL") payload.themeId = themeId;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to generate report");
      }
      const data = await res.json();
      const saved: Report = {
        id: data.id,
        title: data.title,
        summary: data.summary,
        markdown: data.markdown,
        contentJson: data.contentJson,
        periodLabel: data.periodLabel,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        createdAt: new Date().toISOString(),
        generatedBy: data.generatedBy ?? { name: "You", email: "" },
      };
      setReports((cur) => [saved, ...cur]);
      setActiveId(saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── Left Sidebar ── */}
      <div className="space-y-6">
        {canGenerate && (
          <SectionCard
            title="Generate a new report"
            description="Produce a leadership-ready digest grounded in real feedback metrics and grounded synthesis."
          >
            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">
                  Period Range
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPreset(p.key)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                        preset === p.key
                          ? "bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/30 font-semibold"
                          : "bg-[var(--surface-high)] text-[var(--on-surface-variant)] hover:text-[var(--on-background)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">
                  Focus Theme (Optional)
                </label>
                <select
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--outline)] bg-[var(--background)] px-4 py-2.5 text-xs text-[var(--on-background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                >
                  <option value="ALL">All themes (Workspace-wide)</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="w-full rounded-xl btn-primary px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 cursor-pointer"
              >
                <Sparkle size={16} weight="fill" />
                {generating ? "Synthesizing VOC report…" : "Generate Executive VOC Report"}
              </button>
              {error && (
                <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-xs text-[var(--error)]">
                  {error}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Saved Reports"
          description="Click a report to review or export as PDF, CSV, or Markdown."
        >
          {reports.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--on-surface-variant)]">No reports generated yet.</div>
          ) : (
            <ul className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={`w-full rounded-xl p-3 text-left transition group ${
                      activeId === r.id
                        ? "bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/25"
                        : "hover:bg-[var(--surface-low)]"
                    }`}
                  >
                    <div className="font-medium text-xs text-[var(--on-background)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                      {r.title}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--on-surface-variant)] line-clamp-1" suppressHydrationWarning>
                      {r.periodLabel || `${new Date(r.periodStart).toLocaleDateString()} — ${new Date(r.periodEnd).toLocaleDateString()}`}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--on-surface-variant)] font-mono" suppressHydrationWarning>
                      {new Date(r.createdAt).toLocaleDateString()} · {r.generatedBy?.name || "LOOP"}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ── Main Report Content ── */}
      <SectionCard
        title={active?.title ?? "Select or generate a report"}
        description={
          active ? (
            <span className="text-xs text-[var(--on-surface-variant)] font-mono" suppressHydrationWarning>
              {active.periodLabel ?? ""} · Synthesized {new Date(active.createdAt).toLocaleDateString()}
            </span>
          ) : (
            "Leadership digests summarize volume shifts, Net Sentiment Score, driver clusters, and strategic action plans."
          )
        }
        action={
          active ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-[var(--outline)] bg-[var(--surface-high)] px-3.5 py-1.5 text-xs font-semibold text-[var(--on-background)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition shadow-sm"
              >
                <DownloadSimple size={15} />
                Export Report
              </button>

              {/* Export dropdown */}
              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-1.5 z-30 w-56 rounded-2xl border border-[var(--outline)] bg-[var(--surface)] shadow-2xl overflow-hidden"
                    style={{ animation: "fade-in-up 0.15s ease-out" }}
                  >
                    <button
                      type="button"
                      onClick={() => { exportPdf(active); setExportMenuOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-xs text-[var(--on-background)] hover:bg-[var(--surface-low)] transition-colors text-left"
                    >
                      <FilePdf size={20} className="text-[var(--tertiary)] shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">Export as PDF / Print</div>
                        <div className="text-[10px] text-[var(--on-surface-variant)]">Print-ready executive format</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { exportCsv(active); setExportMenuOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-xs text-[var(--on-background)] hover:bg-[var(--surface-low)] transition-colors border-t border-[var(--outline-variant)] text-left"
                    >
                      <FileCsv size={20} className="text-[var(--secondary)] shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">Export as CSV</div>
                        <div className="text-[10px] text-[var(--on-surface-variant)]">Structured metrics & themes</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { exportMarkdown(active); setExportMenuOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-xs text-[var(--on-background)] hover:bg-[var(--surface-low)] transition-colors border-t border-[var(--outline-variant)] text-left"
                    >
                      <FileText size={20} className="text-[var(--primary)] shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">Export as Markdown</div>
                        <div className="text-[10px] text-[var(--on-surface-variant)]">Shareable in docs & wikis</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {!active ? (
          <div className="flex h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--outline)] text-xs text-[var(--on-surface-variant)] text-center p-6">
            <ChartBar size={40} weight="duotone" className="text-[var(--outline)] mb-3" />
            <p className="max-w-[320px]">No report selected. Generate a fresh report from the left panel or pick an existing saved report to read.</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Executive KPI Metric Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-3.5">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--on-surface-variant)]">
                  Total Volume
                </div>
                <div className="mt-1 text-xl font-bold font-mono text-[var(--on-background)]">
                  {sentiment.total > 0 ? sentiment.total.toLocaleString() : "—"}
                </div>
                <div className="text-[10.5px] text-[var(--on-surface-variant)] mt-0.5">Ingested touchpoints</div>
              </div>

              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-3.5">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--on-surface-variant)]">
                  Net Sentiment
                </div>
                <div className={`mt-1 text-xl font-bold font-mono ${netScore >= 0 ? "text-[var(--secondary)]" : "text-[var(--tertiary)]"}`}>
                  {sentiment.total > 0 ? `${netScore >= 0 ? "+" : ""}${netScore}%` : "—"}
                </div>
                <div className="text-[10.5px] text-[var(--on-surface-variant)] mt-0.5">
                  {netScore > 30 ? "Strong health" : netScore >= 0 ? "Balanced" : "Action required"}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-3.5">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--secondary)]">
                  Positive Share
                </div>
                <div className="mt-1 text-xl font-bold font-mono text-[var(--secondary)]">
                  {sentiment.total > 0 ? `${posPct}%` : "—"}
                </div>
                <div className="text-[10.5px] text-[var(--on-surface-variant)] mt-0.5">{sentiment.pos} positive items</div>
              </div>

              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-3.5">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--tertiary)]">
                  Negative Share
                </div>
                <div className="mt-1 text-xl font-bold font-mono text-[var(--tertiary)]">
                  {sentiment.total > 0 ? `${negPct}%` : "—"}
                </div>
                <div className="text-[10.5px] text-[var(--on-surface-variant)] mt-0.5">{sentiment.neg} friction items</div>
              </div>
            </div>

            {/* Sentiment Spectrum Visualizer */}
            {sentiment.total > 0 && (
              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-[var(--on-background)]">Sentiment Spectrum</span>
                  <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">
                    {posPct}% Pos · {neuPct}% Neu · {negPct}% Neg
                  </span>
                </div>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-[var(--surface-high)]">
                  <div className="bg-[var(--secondary)] transition-all" style={{ width: `${posPct}%` }} title={`Positive: ${posPct}%`} />
                  <div className="bg-[var(--primary)]/60 transition-all" style={{ width: `${neuPct}%` }} title={`Neutral: ${neuPct}%`} />
                  <div className="bg-[var(--tertiary)] transition-all" style={{ width: `${negPct}%` }} title={`Negative: ${negPct}%`} />
                </div>
              </div>
            )}

            {/* Top Themes Quick Snapshot */}
            {topThemes.length > 0 && (
              <div className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--on-background)] mb-3">
                  <span className="flex items-center gap-1.5">
                    <TrendUp size={15} className="text-[var(--primary)]" />
                    Key Feedback Drivers
                  </span>
                  <span className="text-[11px] font-mono text-[var(--on-surface-variant)]">Ranked by volume</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topThemes.slice(0, 4).map((t, i) => {
                    const delta = Number(t.trendDelta ?? 0);
                    const count = t.count ?? t.score ?? 0;
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--outline-variant)] bg-[var(--surface)] p-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-[var(--on-background)]">{t.name}</div>
                          <div className="text-[10px] text-[var(--on-surface-variant)] font-mono mt-0.5">{count} mentions</div>
                        </div>
                        <span className={`text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                          delta > 0 ? "bg-[var(--primary-container)] text-[var(--primary)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"
                        }`}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full Report Content */}
            <div className="rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface)] p-6 shadow-sm">
              <div
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(active.markdown || active.summary || "No content generated."),
                }}
              />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
