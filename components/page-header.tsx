import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, breadcrumb, actions }: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {breadcrumb && (
          <div className="mb-2 text-label-md text-[var(--on-surface-variant)]">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-headline-lg text-[var(--on-background)]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-body-md text-[var(--on-surface-variant)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
