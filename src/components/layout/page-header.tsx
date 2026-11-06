import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-h1-sm md:text-h1">{title}</h1>
        {description && <p className="mt-1 text-body-sm text-fg-muted">{description}</p>}
      </div>
      {actions && (
        <div className="-ml-2 flex max-w-full flex-wrap gap-1 sm:ml-0 sm:gap-2">{actions}</div>
      )}
    </div>
  );
}
