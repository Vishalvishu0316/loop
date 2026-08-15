"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { SectionCard } from "@/components/section-card";

type VolumePoint = { date: string; count: number };
type SentimentPoint = { sentiment: string; count: number };
type ThemePoint = { name: string; count: number; color: string };

export function DashboardClient({ workspaceId: _workspaceId }: { workspaceId: string }) {
  const [volume, setVolume] = useState<VolumePoint[]>([]);
  const [sentiment, setSentiment] = useState<SentimentPoint[]>([]);
  const [themes, setThemes] = useState<ThemePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then((data) => {
        setVolume(data.volumeOverTime ?? []);
        setSentiment((data.sentimentBreakdown ?? []).map((r: { sentiment: string | null; count: number }) => ({
          sentiment: r.sentiment ?? "NEU",
          count: r.count,
        })));
        setThemes(data.topThemes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const SENTIMENT_COLORS: Record<string, string> = {
    POS: "var(--secondary)",
    NEU: "var(--primary)",
    NEG: "var(--tertiary)",
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Feedback volume over time"
          description="Daily feedback count for the last 30 days."
        >
          {loading ? (
            <div className="h-72 flex items-center justify-center text-[var(--on-surface-variant)] text-body-sm">Loading chart…</div>
          ) : volume.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-[var(--on-surface-variant)] text-body-sm">No data yet — ingest some feedback to see trends.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volume} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--outline)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--on-surface-variant)"
                    fontSize={11}
                    tickFormatter={(v) => v.slice(5)}
                    tick={{ fill: "var(--on-surface-variant)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="var(--on-surface-variant)" fontSize={11} tick={{ fill: "var(--on-surface-variant)" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--outline)",
                      borderRadius: 12,
                      color: "var(--on-background)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--on-surface-variant)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Items"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "var(--primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Sentiment breakdown" description="Share of classified items by tone.">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-[var(--on-surface-variant)] text-body-sm">Loading…</div>
          ) : sentiment.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-[var(--on-surface-variant)] text-body-sm">No classified items yet.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentiment}
                    dataKey="count"
                    nameKey="sentiment"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    innerRadius={56}
                    paddingAngle={2}
                  >
                    {sentiment.map((entry) => (
                      <Cell key={entry.sentiment} fill={SENTIMENT_COLORS[entry.sentiment] ?? "var(--outline)"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--outline)",
                      borderRadius: 12,
                      color: "var(--on-background)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-body-sm text-[var(--on-surface-variant)]">
                        {value === "POS" ? "Positive" : value === "NEG" ? "Negative" : "Neutral"}
                      </span>
                    )}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Top themes by volume"
        description="Themes with the most feedback items. Click a theme in the inbox to drill into the underlying items."
      >
        {loading ? (
          <div className="h-64 flex items-center justify-center text-[var(--on-surface-variant)] text-body-sm">Loading…</div>
        ) : themes.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-[var(--on-surface-variant)] text-body-sm">No themes yet — run classification to generate.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={themes.slice(0, 10)}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline)" horizontal={false} />
                <XAxis type="number" stroke="var(--on-surface-variant)" fontSize={11} tick={{ fill: "var(--on-surface-variant)" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--on-surface-variant)"
                  fontSize={11}
                  tick={{ fill: "var(--on-background)" }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-high)",
                    border: "1px solid var(--outline)",
                    borderRadius: 12,
                    color: "var(--on-background)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="Items" radius={[0, 8, 8, 0]}>
                  {themes.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={entry.color || "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </>
  );
}
