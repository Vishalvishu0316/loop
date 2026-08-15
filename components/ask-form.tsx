"use client";

import { useState } from "react";

type InsightResponse = {
  answer?: string;
  sources?: string[];
  error?: string;
};

export function AskForm() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const payload = (await response.json()) as InsightResponse;
      setResult(payload);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What are customers struggling with this week?"
          className="min-h-32 w-full rounded-3xl border border-white/10 bg-[var(--background)] px-4 py-4 text-sm text-[var(--on-background)] outline-none transition focus:border-sky-400/40"
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="rounded-full bg-sky-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Thinking..." : "Ask LOOP"}
        </button>
      </form>

      {result ? (
        <div className="rounded-3xl border border-white/10 bg-[var(--background)] p-5">
          <p className="text-sm leading-6 text-[var(--on-background)]">
            {result.answer ?? result.error}
          </p>
          {result.sources?.length ? (
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--on-surface-variant)]">
              Sources: {result.sources.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
