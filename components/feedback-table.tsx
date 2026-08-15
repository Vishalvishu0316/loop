"use client";

import { useState, useEffect } from "react";
import type { FeedbackStatus, Sentiment } from "@/lib/types";
import { CHANNELS } from "@/lib/types";

type ThemeTag = { id: string; name: string; color: string };

export type FeedbackRow = {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: Sentiment | null;
  sentimentScore: number | null;
  status: FeedbackStatus;
  featureArea: string | null;
  createdAt: string;
  themeLinks: Array<{ confidence: number; theme: ThemeTag }>;
};

type Props = {
  initialItems: FeedbackRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  canModify: boolean;
  canClassify: boolean;
  channels: string[];
  themes: Array<{ id: string; name: string; slug: string; color: string }>;
  baseFilters?: Record<string, string | undefined>;
};

const STATUS_OPTIONS: FeedbackStatus[] = ["NEW", "REVIEWED", "ACTIONED"];

const SENTIMENT_STYLES: Record<Sentiment, { chip: string; dot: string; label: string }> = {
  POS: { chip: "bg-[var(--secondary)]/10 text-[var(--secondary)] ring-1 ring-[var(--secondary)]/20", dot: "bg-[var(--secondary)]", label: "Positive" },
  NEU: { chip: "bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/20", dot: "bg-[var(--primary)]", label: "Neutral" },
  NEG: { chip: "bg-[var(--tertiary)]/10 text-[var(--tertiary)] ring-1 ring-[var(--tertiary)]/20", dot: "bg-[var(--tertiary)]", label: "Negative" },
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  NEW: "bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/20",
  REVIEWED: "bg-[var(--secondary)]/10 text-[var(--secondary)] ring-1 ring-[var(--secondary)]/20",
  ACTIONED: "bg-[var(--secondary)]/20 text-[var(--secondary)] ring-1 ring-[var(--secondary)]/40",
};

type Filters = {
  q: string;
  channel: string;
  sentiment: Sentiment | "ALL";
  status: FeedbackStatus | "ALL";
  themeId: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  channel: "ALL",
  sentiment: "ALL",
  status: "ALL",
  themeId: "ALL",
  dateFrom: "",
  dateTo: "",
};

export function FeedbackTable({
  initialItems,
  initialTotal,
  initialPage,
  initialPageSize,
  canModify,
  canClassify,
  channels,
  themes,
  baseFilters,
}: Props) {
  const [items, setItems] = useState<FeedbackRow[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, ...(baseFilters as Filters) });
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.channel !== "ALL") params.set("channel", filters.channel);
    if (filters.sentiment !== "ALL") params.set("sentiment", filters.sentiment);
    if (filters.status !== "ALL") params.set("status", filters.status);
    if (filters.themeId !== "ALL") params.set("themeId", filters.themeId);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/feedback?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setError(null);
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [filters, page, pageSize]);

  async function updateStatus(id: string, status: FeedbackStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      setError("Status update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  async function reclassify(id: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}?action=reclassify`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems((cur) => cur.map((r) => (r.id === id ? data : r)));
    } catch {
      setError("Re-classify failed");
    } finally {
      setUpdatingId(null);
    }
  }

  const allChannels = Array.from(new Set([...CHANNELS, ...channels]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface)] p-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="text-label-md text-[var(--on-surface-variant)]">Search</label>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => {
              setFilters((f) => ({ ...f, q: e.target.value }));
              setPage(1);
            }}
            placeholder="Search feedback content…"
            className="mt-1 w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:border-[var(--primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
          />
        </div>
        <div>
          <label className="text-label-md text-[var(--on-surface-variant)]">Channel</label>
          <select
            value={filters.channel}
            onChange={(e) => {
              setFilters((f) => ({ ...f, channel: e.target.value }));
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--on-background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
          >
            <option value="ALL">All channels</option>
            {allChannels.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-label-md text-[var(--on-surface-variant)]">Sentiment</label>
          <select
            value={filters.sentiment}
            onChange={(e) => {
              setFilters((f) => ({ ...f, sentiment: e.target.value as Sentiment | "ALL" }));
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--on-background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
          >
            <option value="ALL">All sentiments</option>
            {(["POS", "NEU", "NEG"] as Sentiment[]).map((s) => (
              <option key={s} value={s}>{SENTIMENT_STYLES[s].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-label-md text-[var(--on-surface-variant)]">Status</label>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value as FeedbackStatus | "ALL" }));
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--on-background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-label-md text-[var(--on-surface-variant)]">Theme</label>
          <select
            value={filters.themeId}
            onChange={(e) => {
              setFilters((f) => ({ ...f, themeId: e.target.value }));
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--on-background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
          >
            <option value="ALL">All themes</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-[var(--on-surface-variant)]">
        <span suppressHydrationWarning>{loading ? "Loading…" : `${total.toLocaleString()} items · Page ${page} of ${totalPages}`}</span>
        {error && <span className="text-[var(--error)]">{error}</span>}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <label className="text-[var(--on-surface-variant)]">From:</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => {
              setFilters((f) => ({ ...f, dateFrom: e.target.value }));
              setPage(1);
            }}
            className="rounded-md border border-[var(--outline-variant)] bg-[var(--background)] px-2 py-1 text-[var(--on-background)]"
          />
          <label className="text-[var(--on-surface-variant)]">To:</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => {
              setFilters((f) => ({ ...f, dateTo: e.target.value }));
              setPage(1);
            }}
            className="rounded-md border border-[var(--outline-variant)] bg-[var(--background)] px-2 py-1 text-[var(--on-background)]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[var(--outline-variant)] bg-[var(--surface-high)] text-left text-label-md text-[var(--on-surface-variant)]">
                <th className="px-5 py-3">Feedback</th>
                <th className="px-3 py-3">Channel</th>
                <th className="px-3 py-3">Themes</th>
                <th className="px-3 py-3">Sentiment</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                {(canModify || canClassify) && <th className="px-3 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={canModify || canClassify ? 7 : 6} className="px-5 py-16 text-center text-[var(--on-surface-variant)]">
                    Loading feedback…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={canModify || canClassify ? 7 : 6} className="px-5 py-16 text-center">
                    <div className="text-lg font-medium text-[var(--on-background)]">No feedback matches your filters</div>
                    <div className="mt-1 text-sm text-[var(--on-surface-variant)]">Try widening filters or ingesting new feedback.</div>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const busy = updatingId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-[var(--outline-variant)] last:border-b-0 hover:bg-[var(--surface-high)]">
                      <td className="px-5 py-4 align-top">
                        <div className="max-w-2xl">
                          <div className="line-clamp-2 text-[var(--on-background)]">{row.content}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                            {row.sourceRef && <span className="rounded bg-[var(--surface-high)] px-1.5 py-0.5">Ref: {row.sourceRef}</span>}
                            {row.customerLabel && <span>👤 {row.customerLabel}</span>}
                            {row.featureArea && <span className="rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-[var(--primary)] ring-1 ring-1 ring-[var(--primary)]/20">{row.featureArea}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <span className="inline-block rounded-md bg-[var(--surface-high)] px-2 py-0.5 text-xs text-[var(--on-background)] ring-1 ring-[var(--outline)]">
                          {row.channel}
                        </span>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {row.themeLinks.length === 0 ? (
                            <span className="text-xs text-[var(--on-surface-variant)]">—</span>
                          ) : (
                            row.themeLinks.slice(0, 2).map((tl, i) => (
                              <span
                                key={tl.theme.id + i}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1"
                                style={{ backgroundColor: tl.theme.color + "15", color: tl.theme.color, boxShadow: `inset 0 0 0 1px ${tl.theme.color}33` }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tl.theme.color }} />
                                {tl.theme.name}
                              </span>
                            ))
                          )}
                          {row.themeLinks.length > 2 && (
                            <span className="text-xs text-[var(--on-surface-variant)]">+{row.themeLinks.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        {row.sentiment ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ring-1 ${SENTIMENT_STYLES[row.sentiment].chip}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${SENTIMENT_STYLES[row.sentiment].dot}`} />
                            {SENTIMENT_STYLES[row.sentiment].label}
                            {row.sentimentScore != null && (
                              <span className="text-[var(--on-surface-variant)]">{row.sentimentScore.toFixed(2)}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--on-surface-variant)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top">
                        {canModify ? (
                          <select
                            value={row.status}
                            onChange={(e) => updateStatus(row.id, e.target.value as FeedbackStatus)}
                            disabled={busy}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 disabled:opacity-60 ${STATUS_STYLES[row.status]}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="bg-[var(--surface)]">
                                {s[0] + s.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${STATUS_STYLES[row.status]}`}>
                            {row.status[0] + row.status.slice(1).toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top text-xs text-[var(--on-surface-variant)]" suppressHydrationWarning>
                        {new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      {(canModify || canClassify) && (
                        <td className="px-3 py-4 align-top">
                          <div className="flex gap-1.5">
                            {canClassify && (
                              <button
                                type="button"
                                onClick={() => reclassify(row.id)}
                                disabled={busy}
                                className="rounded-md border border-[var(--outline)] bg-[var(--surface-high)] px-2 py-1 text-[11px] text-[var(--on-background)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] disabled:opacity-50"
                                title="Re-run AI classification"
                              >
                                {busy ? "…" : "Re-classify"}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--outline-variant)] px-4 py-3 text-sm">
            <div className="text-xs text-[var(--on-surface-variant)]">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-high)] px-3 py-1 text-xs text-[var(--on-background)] hover:border-[var(--outline)] disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-3 text-xs text-[var(--on-surface-variant)]">Page {page} / {totalPages}</span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-high)] px-3 py-1 text-xs text-[var(--on-background)] hover:border-[var(--outline)] disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
