import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warning";
  icon?: ReactNode;
};

const TONE_STYLES: Record<NonNullable<Props["tone"]>, { delta: string; ring: string }> = {
  default: { delta: "text-[var(--on-surface-variant)]", ring: "ring-[var(--outline)]" },
  good: { delta: "text-[var(--secondary)]", ring: "ring-[var(--secondary)]" },
  bad: { delta: "text-[var(--tertiary)]", ring: "ring-[var(--tertiary)]" },
  warning: { delta: "text-[var(--primary)]", ring: "ring-[var(--primary)]" },
};

export function StatCard({ label, value, delta, hint, tone = "default", icon }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <div className={`rounded-xl border border-[var(--outline-variant)] bg-[var(--surface)] p-5 ring-1 ${s.ring} shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-label-md text-[var(--on-surface-variant)]">{label}</div>
          <div className="mt-2 text-data text-[var(--on-background)] text-headline-lg">{value}</div>
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-high)] text-[var(--on-surface-variant)] text-lg">
            {icon}
          </div>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-4 flex items-center justify-between gap-2 text-body-sm">
          {delta ? <span className={`font-medium ${s.delta}`}>{delta}</span> : <span />}
          {hint && <span className="text-[var(--on-surface-variant)]">{hint}</span>}
        </div>
      )}
    </div>
  );
}
