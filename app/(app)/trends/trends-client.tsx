"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { SectionCard } from "@/components/section-card";
import { TrendUp, TrendDown, ArrowRight, SpinnerGap } from "@phosphor-icons/react";

type ThemeWithTrend = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  trendScore: number;
  currentCount?: number;
  prevCount?: number;
  trendDelta?: number;
  spiking?: boolean;
  declining?: boolean;
  perDay?: Array<{ date: string; count: number }>;
  _count: { feedbackLinks: number };
};

export function TrendsClient({
  workspaceId: _wid,
  initialThemes,
}: {
  workspaceId: string;
  initialThemes: ThemeWithTrend[];
}) {
  const [themes, setThemes] = useState<ThemeWithTrend[]>(initialThemes);
  const [selectedId, setSelectedId] = useState<string | null>(initialThemes[0]?.id ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/themes?trends=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setThemes(data);
          if (!selectedId && data[0]?.id) setSelectedId(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => {
    return themes.find((t) => t.id === selectedId) ?? themes[0] ?? null;
  }, [themes, selectedId]);

  const palette = [
    "#6366f1", "#8b5cf6", "#0ea5e9", "#10b981",
    "#f59e0b", "#ef4444", "#14b8a6", "#f97316",
  ];

  // Memoize multi-chart data so rendering is instant and avoids recalculating every render
  const multiChartData = useMemo(() => {
    if (!themes[0]?.perDay?.length) return [];
    return themes[0].perDay.map((_, dayIdx) => {
      const row: Record<string, string | number> = {
        date: themes[0].perDay![dayIdx].date.slice(5),
      };
      themes.slice(0, 5).forEach((t) => {
        row[t.name] = t.perDay?.[dayIdx]?.count ?? 0;
      });
      return row;
    });
  }, [themes]);

  const topThemes = useMemo(() => themes.slice(0, 5), [themes]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* ── Main Top 5 Themes Trends Chart ── */}
      <SectionCard
        className="xl:col-span-2"
        title="Top theme trends — 14 days"
        description="Daily feedback volume for the top 5 themes. Spikes indicate emerging friction or surging feature requests."
      >
        {loading && multiChartData.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-[var(--on-surface-variant)] text-xs gap-2">
            <SpinnerGap size={24} className="animate-spin text-[var(--primary)]" />
            <span>Calculating theme trajectories…</span>
          </div>
        ) : multiChartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-[var(--on-surface-variant)] text-sm">
            No trend data recorded yet — ingest feedback to visualize 14-day velocity.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <AreaChart data={multiChartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  {topThemes.map((t, i) => (
                    <linearGradient key={t.id} id={`grad-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.color || palette[i]} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={t.color || palette[i]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--on-surface-variant)"
                  fontSize={11}
                  tick={{ fill: "var(--on-surface-variant)" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--on-surface-variant)"
                  fontSize={11}
                  tick={{ fill: "var(--on-surface-variant)" }}
                  allowDecimals={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-high)",
                    border: "1px solid var(--outline)",
                    borderRadius: 12,
                    color: "var(--on-background)",
                    fontSize: 12,
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                  }}
                  labelStyle={{ color: "var(--on-surface-variant)", fontWeight: 600, marginBottom: 4 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => <span className="text-xs text-[var(--on-background)] font-medium">{value}</span>}
                />
                {topThemes.map((t, i) => (
                  <Area
                    key={t.id}
                    type="monotone"
                    dataKey={t.name}
                    stroke={t.color || palette[i]}
                    strokeWidth={2.2}
                    fill={`url(#grad-${t.id})`}
                    isAnimationActive={true}
                    animationDuration={400}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* ── All Ranked Themes List ── */}
      <SectionCard
        title="Ranked Themes"
        description="Click a theme to drill down into its individual trajectory and filter inbox items."
      >
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {themes.length === 0 && (
            <div className="py-16 text-center text-sm text-[var(--on-surface-variant)]">No themes recorded yet.</div>
          )}
          {themes.map((t) => {
            const active = t.id === selected?.id;
            const count = t.currentCount ?? t._count.feedbackLinks;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/30"
                    : "border-[var(--outline-variant)] bg-[var(--surface)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-high)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: t.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-xs text-[var(--on-background)] truncate">{t.name}</div>
                        {t.spiking && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--tertiary)]/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--tertiary)]">
                            <TrendUp size={11} weight="bold" /> Spike
                          </span>
                        )}
                        {t.declining && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--secondary)]/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[var(--secondary)]">
                            <TrendDown size={11} weight="bold" /> Down
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--on-surface-variant)] line-clamp-1">
                        {t.description || `${count} feedback items`}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold font-mono text-[var(--on-background)]">{count}</div>
                    {typeof t.trendDelta === "number" && (
                      <div
                        className={`text-[10.5px] font-mono font-medium ${
                          t.trendDelta > 0 ? "text-[var(--tertiary)]" : t.trendDelta < 0 ? "text-[var(--secondary)]" : "text-[var(--on-surface-variant)]"
                        }`}
                      >
                        {t.trendDelta >= 0 ? "▲" : "▼"} {Math.abs(t.trendDelta)}%
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Single Theme Drill Down ── */}
      {selected && (
        <SectionCard
          className="xl:col-span-3"
          title={`Drill Down: ${selected.name}`}
          description={selected.description || "14-day trajectory curve and shortcut to matching customer inbox items."}
          action={
            <Link
              href={`/inbox?themeId=${encodeURIComponent(selected.id)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-high)] px-4 py-2 text-xs font-semibold text-[var(--on-background)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition shadow-sm"
            >
              <span>View in Feedback Inbox</span>
              <ArrowRight size={14} />
            </Link>
          }
        >
          {selected.perDay && selected.perDay.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <AreaChart data={selected.perDay} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sel-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selected.color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={selected.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--outline)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--on-surface-variant)"
                    fontSize={11}
                    tick={{ fill: "var(--on-surface-variant)" }}
                    tickFormatter={(v) => v.slice(5)}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--on-surface-variant)"
                    fontSize={11}
                    tick={{ fill: "var(--on-surface-variant)" }}
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--outline)",
                      borderRadius: 12,
                      color: "var(--on-background)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--on-surface-variant)", fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Daily Volume"
                    stroke={selected.color}
                    strokeWidth={2.5}
                    fill="url(#sel-grad)"
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-[var(--on-surface-variant)]">
              No per-day data recorded for this theme yet.
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
