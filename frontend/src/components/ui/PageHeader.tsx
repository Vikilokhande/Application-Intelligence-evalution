// src/components/ui/PageHeader.tsx
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        {breadcrumb && (
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{breadcrumb}</p>
        )}
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
