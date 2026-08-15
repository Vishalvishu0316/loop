import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  padding?: string;
};

export function SectionCard({
  title,
  description,
  children,
  action,
  className = "",
  padding = "p-5",
}: Props) {
  return (
    <section
      className={`rounded-xl border border-[var(--outline-variant)] bg-[var(--surface)] shadow-sm ${padding} ${className}`}
    >
      <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-headline-md text-[var(--on-background)] text-lg">{title}</h2>
          {description && <p className="mt-1 text-body-sm text-[var(--on-surface-variant)]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}
