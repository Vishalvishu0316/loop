"use client";

import { useState } from "react";

type ReportResponse = {
  title?: string;
  summary?: string;
  error?: string;
};

export function ReportForm() {
  const [title, setTitle] = useState("Weekly VOC Brief");
  const [periodLabel, setPeriodLabel] = useState("Last 7 days");
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, periodLabel }),
      });

      const payload = (await response.json()) as ReportResponse;
      setResult(payload);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-full border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-[var(--on-background)] outline-none transition focus:border-sky-400/40"
        />
        <input
          value={periodLabel}
          onChange={(event) => setPeriodLabel(event.target.value)}
          className="rounded-full border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-[var(--on-background)] outline-none transition focus:border-sky-400/40"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-sky-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </form>

      {result ? (
        <div className="rounded-3xl border border-white/10 bg-[var(--background)] p-5">
          <h4 className="text-base font-semibold text-[var(--on-background)]">{result.title}</h4>
          <p className="mt-3 text-sm leading-6 text-[var(--on-background)]">
            {result.summary ?? result.error}
          </p>
        </div>
      ) : null}
    </div>
  );
}
