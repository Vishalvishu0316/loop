"use client";

import { useRef, useState, useEffect } from "react";
import { ChatTeardropText, MagnifyingGlass, PaperPlaneRight, Sparkle, ArrowClockwise } from "@phosphor-icons/react";

type CitedFeedback = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  createdAt: string;
  themeLinks: Array<{ theme: { name: string; color: string } }>;
};

type Insight = {
  id: string;
  question: string;
  answer: string;
  citedFeedback?: CitedFeedback[];
  citedIds: string[];
  createdAt: string;
  theme: { name: string; color: string } | null;
};

type ThemeSnippet = { id: string; name: string; color: string };

const PRESET_QUESTIONS = [
  "What are users saying about onboarding?",
  "What is the biggest complaint about search?",
  "Summarize positive feedback about reporting",
  "What pricing-related requests are users asking for?",
  "What mobile issues are people reporting?",
  "What's the most common integration request?",
];

const SENTIMENT_BADGE: Record<string, { label: string; cls: string }> = {
  POS: { label: "Positive", cls: "bg-[var(--secondary)]/15 text-[var(--secondary)]" },
  NEU: { label: "Neutral", cls: "bg-[var(--surface-high)] text-[var(--on-surface-variant)]" },
  NEG: { label: "Negative", cls: "bg-[var(--tertiary)]/15 text-[var(--tertiary)]" },
};

export function AskClient({
  initialInsights,
  themes,
}: {
  initialInsights: Insight[];
  themes: ThemeSnippet[];
}) {
  const [question, setQuestion] = useState("");
  const [themeId, setThemeId] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Insight[]>(initialInsights);
  const [active, setActive] = useState<Insight | null>(initialInsights[0] ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, loading]);

  async function ask(q?: string) {
    const rawQ = (q ?? question).trim();
    if (!rawQ) {
      setError("Please enter a question to ask LOOP.");
      return;
    }

    if (rawQ.length < 3) {
      setError("Question must be at least 3 characters long.");
      return;
    }

    if (rawQ.length > 500) {
      setError("Question cannot exceed 500 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setQuestion(rawQ);
    try {
      const body: Record<string, string> = { question: rawQ };
      if (themeId !== "ALL") body.themeId = themeId;
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Ask LOOP failed");
      }
      const data = await res.json();
      const insight: Insight = {
        id: data.id,
        question: data.question,
        answer: data.answer,
        citedIds: data.citedIds ?? [],
        createdAt: new Date().toISOString(),
        theme: data.theme ?? null,
        citedFeedback: data.citedFeedback ?? [],
      };
      setActive(insight);
      setHistory((cur) => [insight, ...cur.filter((i) => i.id !== insight.id)].slice(0, 20));
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── Main Column ── */}
      <div className="space-y-6">
        {/* Input Area */}
        <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-5">
          <form
            onSubmit={(e) => { e.preventDefault(); ask(); }}
            className="space-y-4"
          >
            {/* Search bar */}
            <div className="relative">
              <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='Ask anything about your feedback…'
                className="w-full rounded-xl border border-[var(--outline)] bg-[var(--background)] pl-11 pr-14 py-3.5 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)] focus:border-[var(--primary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)] disabled:opacity-40 hover:opacity-90 transition"
              >
                <PaperPlaneRight size={16} weight="fill" />
              </button>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--on-surface-variant)] font-medium">Scope:</span>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="rounded-lg border border-[var(--outline)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--on-background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
              >
                <option value="ALL">All themes</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Quick starters */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUESTIONS.map((pq) => (
                <button
                  key={pq}
                  type="button"
                  onClick={() => { setQuestion(pq); inputRef.current?.focus(); }}
                  className="rounded-full border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 py-1.5 text-[11.5px] text-[var(--on-surface-variant)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary-container)]/20 transition-colors"
                >
                  {pq}
                </button>
              ))}
            </div>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
              {error}
            </div>
          )}
        </div>

        {/* Answer Area */}
        <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center gap-2 border-b border-[var(--outline-variant)] px-5 py-3">
            <Sparkle size={16} weight="fill" className="text-[var(--primary)]" />
            <span className="text-sm font-semibold text-[var(--on-background)]">
              {loading ? "Analyzing feedback…" : active ? "Answer" : "Waiting for a question"}
            </span>
            {active && !loading && (
              <span className="ml-auto text-[11px] text-[var(--on-surface-variant)] font-mono">
                {active.citedFeedback?.length ?? 0} cited
              </span>
            )}
          </div>

          <div className="p-5 min-h-[300px]">
            {/* Loading */}
            {loading && (
              <div className="space-y-4 py-6">
                <div className="flex items-center gap-3 text-sm text-[var(--on-surface-variant)]">
                  <ArrowClockwise size={16} className="animate-spin text-[var(--primary)]" />
                  Searching your feedback and assembling an answer…
                </div>
                <div className="space-y-2.5 animate-pulse">
                  <div className="h-3 w-4/5 bg-[var(--surface-high)] rounded" />
                  <div className="h-3 w-3/5 bg-[var(--surface-high)] rounded" />
                  <div className="h-3 w-2/3 bg-[var(--surface-high)] rounded" />
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !active && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ChatTeardropText size={48} weight="duotone" className="text-[var(--outline)] mb-4" />
                <p className="text-sm text-[var(--on-surface-variant)] max-w-[340px]">
                  Ask a question in plain English. LOOP retrieves the most relevant feedback first, then answers only from what customers actually said.
                </p>
              </div>
            )}

            {/* Active answer */}
            {!loading && active && (
              <div className="space-y-5" style={{ animation: "fade-in-up 0.3s ease-out" }}>
                {/* Question bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[var(--primary)] px-4 py-2.5 text-sm text-[var(--on-primary)]">
                    {active.question}
                  </div>
                </div>

                {/* Answer bubble */}
                <div className="flex justify-start">
                  <div className="max-w-[92%] space-y-3">
                    <div className="rounded-2xl rounded-tl-md border border-[var(--outline-variant)] bg-[var(--surface-low)] px-5 py-4">
                      <div className="whitespace-pre-wrap text-[14.5px] leading-[1.7] text-[var(--on-background)]">
                        {active.answer}
                      </div>
                    </div>

                    {/* Theme tag */}
                    {active.theme && (
                      <div className="flex items-center gap-1.5 pl-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: active.theme.color }}
                        />
                        <span className="text-[11px] text-[var(--on-surface-variant)]">
                          Theme: {active.theme.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence section */}
                {active.citedFeedback && active.citedFeedback.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--outline-variant)]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">
                        Evidence
                      </span>
                      <span className="text-[11px] text-[var(--on-surface-variant)]">
                        — {active.citedFeedback.length} cited item{active.citedFeedback.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {active.citedFeedback.map((fb, idx) => {
                        const sent = fb.sentiment ?? "NEU";
                        const badge = SENTIMENT_BADGE[sent] ?? SENTIMENT_BADGE.NEU;
                        return (
                          <div
                            key={fb.id}
                            className="rounded-xl border border-[var(--outline-variant)] bg-[var(--background)] p-3.5 hover:border-[var(--primary)]/30 transition-colors"
                          >
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="text-[10.5px] font-semibold text-[var(--primary)] font-mono">
                                #{idx + 1}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                              <span className="rounded-md bg-[var(--surface-high)] px-2 py-0.5 text-[10.5px] text-[var(--on-surface-variant)]">
                                {fb.channel}
                              </span>
                              {fb.themeLinks?.[0]?.theme && (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10.5px]"
                                  style={{
                                    background: fb.themeLinks[0].theme.color + "18",
                                    color: fb.themeLinks[0].theme.color,
                                  }}
                                >
                                  {fb.themeLinks[0].theme.name}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] leading-[1.6] text-[var(--on-background)]">
                              {fb.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* ── Sidebar: Recent Questions ── */}
      <div className="rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4 h-fit lg:sticky lg:top-[80px]">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--on-background)]">Recent questions</h3>
          <p className="text-[11px] text-[var(--on-surface-variant)] mt-0.5">Click to reload answer + citations.</p>
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-xs text-[var(--on-surface-variant)]">
            No history yet.
          </div>
        ) : (
          <ul className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">
            {history.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`w-full rounded-xl p-3 text-left transition group ${
                    active?.id === i.id
                      ? "bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/25"
                      : "hover:bg-[var(--surface-low)]"
                  }`}
                >
                  <div className="line-clamp-2 text-[13px] font-medium text-[var(--on-background)] group-hover:text-[var(--primary)] transition-colors">
                    {i.question}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[var(--on-surface-variant)]" suppressHydrationWarning>
                    <span>{i.citedIds?.length ?? 0} cited</span>
                    <span>·</span>
                    <span>{new Date(i.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
